/**
 * StoryForge Image Optimizer — Netlify Background Function
 *
 * Triggered from the matter callback INSTEAD of directly dispatching Agent 3B.
 * Pipeline:
 *   matter callback → this function → Agent 3B dispatch
 *
 * What it does:
 *   1. Reads sf_run.chapters (image_1 / image_2 URLs from MindStudio CDN)
 *   2. Downloads each of the 20 images
 *   3. Resizes to max 2560×2560, re-encodes as JPEG q85, sRGB, strips metadata
 *   4. Uploads to Supabase Storage: pagecub/{sfRunId}/images/ch{n}-{1|2}.jpg
 *   5. Updates sf_run.chapters with optimized_image_1 / optimized_image_2 URLs
 *   6. Dispatches Agent 3B (HTML writer) using optimized URLs
 *
 * Expected PDF size after: ~25–40MB (down from 335MB)
 *
 * Body: { sfRunId, bookPayload }
 * bookPayload: the JSON object assembled by matter callback (chapters array uses original URLs)
 *
 * Background function — up to 15 min, no timeout concern for 20 images.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY        = process.env.SUPABASE_SERVICE_KEY!;
const MINDSTUDIO_API_KEY  = process.env.MINDSTUDIO_API_KEY!;
const PDF_AGENT_ID        = process.env.STORYFORGE_PDF_AGENT_ID!;
const APP_URL             = process.env.APP_URL || "https://pagecub.com";
const BUCKET              = "pdfs";
const MAX_DIM             = 2560;
const JPEG_QUALITY        = 85;

// Netlify background function — no Response return; -background filename suffix triggers 202 + async execution
export default async (req: Request) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.error("[img-opt] invalid JSON body");
    return;
  }

  const { sfRunId, bookPayload } = body as {
    sfRunId: string;
    bookPayload: Record<string, unknown>;
  };

  if (!sfRunId || !bookPayload) {
    console.error("[img-opt] missing sfRunId or bookPayload");
    return;
  }

  try {
    await optimize(sfRunId, bookPayload);
  } catch (err) {
    console.error("[img-opt] unhandled error:", err);
  }


};

export const config = { path: "/.netlify/functions/storyforge-image-optimizer-background" };

// ─── Core ─────────────────────────────────────────────────────────────────────

type ChapterPayload = {
  chapter_number: number;
  chapter_title: string;
  chapter_summary: string;
  text_page_1: string;
  text_page_2: string;
  text_page_1_word_count: number;
  text_page_2_word_count: number;
  image_1_url: string;
  image_2_url: string;
};

async function optimize(sfRunId: string, bookPayload: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = createClient(SUPABASE_URL, SUPABASE_KEY);
  const chapters = (bookPayload.chapters ?? []) as ChapterPayload[];

  console.log(`[img-opt] starting — sfRunId: ${sfRunId}, chapters: ${chapters.length}`);

  // ── Optimize all images (sequential to be kind to upstream CDN) ────────
  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;

  for (const ch of chapters) {
    const n = ch.chapter_number;

    // image_1
    const [opt1, orig1, opt1bytes] = await optimizeOne(admin, sfRunId, n, 1, ch.image_1_url);
    ch.image_1_url = opt1;
    totalOriginalBytes  += orig1;
    totalOptimizedBytes += opt1bytes;

    // image_2
    const [opt2, orig2, opt2bytes] = await optimizeOne(admin, sfRunId, n, 2, ch.image_2_url);
    ch.image_2_url = opt2;
    totalOriginalBytes  += orig2;
    totalOptimizedBytes += opt2bytes;
  }

  const savedMB = ((totalOriginalBytes - totalOptimizedBytes) / 1_048_576).toFixed(1);
  const totalMB = (totalOptimizedBytes / 1_048_576).toFixed(1);
  console.log(`[img-opt] done — original: ${(totalOriginalBytes/1_048_576).toFixed(1)}MB, optimized: ${totalMB}MB, saved: ${savedMB}MB`);

  // ── Store optimized image URLs back into sf_runs.chapters JSONB ────────
  const { data: sfRun } = await admin
    .from("sf_runs")
    .select("chapters")
    .eq("id", sfRunId)
    .single();

  if (sfRun?.chapters) {
    const chaptersMap = sfRun.chapters as Record<string, Record<string, unknown>>;
    for (const ch of chapters) {
      const key = String(ch.chapter_number);
      if (chaptersMap[key]) {
        chaptersMap[key].image_1_optimized = ch.image_1_url;
        chaptersMap[key].image_2_optimized = ch.image_2_url;
      }
    }
    await admin.from("sf_runs").update({ chapters: chaptersMap }).eq("id", sfRunId);
  }

  // ── Dispatch Agent 3B with optimized URLs ──────────────────────────────
  const pdfCallbackUrl = `${APP_URL}/api/pagecub/callback/pdf/${sfRunId}`;

  const dispatch = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MINDSTUDIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appId:       PDF_AGENT_ID,
      workflow:    "Main",
      callbackUrl: pdfCallbackUrl,
      variables: {
        payload: JSON.stringify(bookPayload),
      },
    }),
  }).catch(err => { console.error("[img-opt] Agent 3B dispatch failed:", err); return null; });

  if (!dispatch?.ok) {
    const errText = dispatch ? await dispatch.text().catch(() => "") : "fetch error";
    console.error("[img-opt] Agent 3B dispatch HTTP error:", dispatch?.status, errText.slice(0, 200));

    // Fallback: update sf_runs to failed so the run doesn't silently hang
    await admin.from("sf_runs").update({
      status:          "done",
      packaging_error: "agent_3b_dispatch_failed_from_optimizer",
      completed_at:    new Date().toISOString(),
    }).eq("id", sfRunId);
    return;
  }

  const dispatchBody = await dispatch.json().catch(() => ({})) as Record<string, unknown>;
  console.log(`[img-opt] Agent 3B dispatched — threadId: ${dispatchBody.threadId}`);
}

// ─── Single image optimizer ───────────────────────────────────────────────────

/** Returns [optimizedUrl, originalBytes, optimizedBytes] */
async function optimizeOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  sfRunId: string,
  chapterNum: number,
  slot: 1 | 2,
  imageUrl: string,
): Promise<[string, number, number]> {
  if (!imageUrl || !imageUrl.startsWith("http")) {
    console.warn(`[img-opt] ch${chapterNum}-${slot}: no URL, skipping`);
    return [imageUrl, 0, 0];
  }

  // Skip if already an optimized Supabase URL for this run
  if (imageUrl.includes(`pagecub/${sfRunId}/images/`)) {
    console.log(`[img-opt] ch${chapterNum}-${slot}: already optimized, skipping`);
    return [imageUrl, 0, 0];
  }

  try {
    // Download
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn(`[img-opt] ch${chapterNum}-${slot}: download failed ${res.status}`);
      return [imageUrl, 0, 0];
    }
    const originalBuffer = Buffer.from(await res.arrayBuffer());
    const originalBytes = originalBuffer.length;

    // Optimize with Sharp
    const optimizedBuffer = await sharp(originalBuffer, { limitInputPixels: false })
      .rotate()                          // auto-orient from EXIF
      .resize({
        width:              MAX_DIM,
        height:             MAX_DIM,
        fit:                "cover",
        position:           "center",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" }) // remove alpha, flatten onto white
      .jpeg({
        quality:     JPEG_QUALITY,
        mozjpeg:     true,
        progressive: false,
        chromaSubsampling: "4:4:4",
      })
      .toColorspace("srgb")
      .toBuffer();

    const optimizedBytes = optimizedBuffer.length;

    // Upload to Supabase Storage
    const storagePath = `pagecub/${sfRunId}/images/ch${chapterNum}-${slot}.jpg`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, optimizedBuffer, {
        contentType: "image/jpeg",
        upsert:      true,
      });

    if (uploadError) {
      console.warn(`[img-opt] ch${chapterNum}-${slot}: upload failed:`, uploadError.message);
      return [imageUrl, originalBytes, originalBytes]; // fall back to original URL
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const optimizedUrl = publicUrlData?.publicUrl ?? imageUrl;

    console.log(
      `[img-opt] ch${chapterNum}-${slot}: ${(originalBytes/1024).toFixed(0)}KB → ${(optimizedBytes/1024).toFixed(0)}KB (${optimizedUrl.slice(-40)})`
    );

    return [optimizedUrl, originalBytes, optimizedBytes];
  } catch (err) {
    console.warn(`[img-opt] ch${chapterNum}-${slot}: error:`, err);
    return [imageUrl, 0, 0];
  }
}
