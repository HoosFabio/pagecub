import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.APP_URL || "https://pagecub.com";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sfRunId: string }> }
) {
  const { sfRunId } = await params;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, note: "invalid json" });
  }

  // Look up sf_run
  const { data: sfRun, error: sfRunError } = await admin
    .from("sf_runs")
    .select("id, tool_run_id, user_id, status, chapters, book_title, story, chapter_outline, visual_bible, charachter_bible, input_payload")
    .eq("id", sfRunId)
    .single();

  if (sfRunError || !sfRun) {
    console.error("[storyforge/matter] sf_run not found:", sfRunId);
    return NextResponse.json({ ok: false, note: "sf_run not found" });
  }

  // Idempotency guard
  if (sfRun.status === "done" || sfRun.status === "failed") {
    console.log("[storyforge/matter] already finalized:", sfRunId);
    return NextResponse.json({ ok: true, note: "already finalized" });
  }

  // MindStudio explicit failure
  if (body.success === false) {
    console.error("[storyforge/matter] MindStudio success:false for sfRun:", sfRunId);
    // Don't fail the whole run — finalize without matter
    console.warn("[storyforge/matter] finalizing without matter data");
  }

  const result = (body.result ?? {}) as Record<string, unknown>;

  // Parse matter — MindStudio sends the display label "matter" as key
  // Value may be a JSON string or already an object
  let matter: Record<string, unknown> | null = null;
  const matterRaw = result["matter"];
  if (matterRaw) {
    try {
      matter = typeof matterRaw === "string" ? JSON.parse(matterRaw) : matterRaw as Record<string, unknown>;
    } catch {
      console.error("[storyforge/matter] failed to parse matter JSON:", String(matterRaw).slice(0, 200));
    }
  }

  // Store matter + set status=pdf_pending
  await admin.from("sf_runs").update({
    status: "pdf_pending",
    matter: matter ?? {},
  }).eq("id", sfRunId);

  // ── Assemble canonical payload for PDF Agent (3B) ──────────────────────────
  const chaptersRaw = (sfRun.chapters ?? {}) as Record<string, ChapterEntry>;
  const ip = (sfRun.input_payload ?? {}) as Record<string, unknown>;

  const chaptersArray = Object.entries(chaptersRaw)
    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
    .map(([num, ch]) => ({
      chapter_number:         parseInt(num, 10),
      chapter_title:          ch.title   ?? "",
      chapter_summary:        ch.summary ?? "",
      text_page_1:            ch.text_1  ?? "",
      text_page_2:            ch.text_2  ?? "",
      text_page_1_word_count: ch.text_1_word_count ?? 0,
      text_page_2_word_count: ch.text_2_word_count ?? 0,
      image_1_url:            ch.image_1 ?? "",
      image_2_url:            ch.image_2 ?? "",
    }));

  const matterObj = (matter ?? {}) as Record<string, unknown>;

  const bookPayload = {
    run_id:                 sfRunId,
    book_title:             (matterObj.book_title as string) || (sfRun.book_title ?? ""),
    child_name:             String(ip.charachter_name ?? ""),
    age:                    String(ip.age ?? ""),
    story_clean:            sfRun.story           ?? "",
    chapter_outline_clean:  sfRun.chapter_outline ?? "",
    visual_bible_clean:     sfRun.visual_bible    ?? "",
    charachter_bible_clean: sfRun.charachter_bible ?? "",
    dedication:             (matterObj.dedication as string) || String(ip.dedication ?? ""),
    matter:                 matterObj,
    chapters:               chaptersArray,
  };

  // Trigger image optimizer background function (which then dispatches Agent 3B)
  // This reduces PDF from ~335MB to ~25-40MB by pre-compressing all 20 images
  await triggerImageOptimizer(sfRunId, bookPayload);

  console.log(`[storyforge/matter] image optimizer triggered — sfRunId: ${sfRunId}`);
  return NextResponse.json({ ok: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ChapterEntry = {
  title: string; summary: string; text_1: string; text_2: string;
  text_1_word_count: number; text_2_word_count: number;
  total_word_count: number; image_1: string; image_2: string;
};

function buildFlatOutputPayload(chapters: Record<string, ChapterEntry>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [num, ch] of Object.entries(chapters)) {
    out[`chap${num}_title`]     = ch.title   ?? "";
    out[`chap${num}_summary`]   = ch.summary ?? "";
    out[`chap${num}_text_1`]    = ch.text_1  ?? "";
    out[`chap${num}_text_2`]    = ch.text_2  ?? "";
    out[`chap${num}_text_1_wc`] = ch.text_1_word_count ?? 0;
    out[`chap${num}_text_2_wc`] = ch.text_2_word_count ?? 0;
    out[`chap${num}_total_wc`]  = ch.total_word_count  ?? 0;
    out[`chap${num}_image_1`]   = ch.image_1 ?? "";
    out[`chap${num}_image_2`]   = ch.image_2 ?? "";
  }
  return out;
}

// MUST be awaited — fire-and-forget fetch dies when Lambda freezes on response return
async function triggerImageOptimizer(sfRunId: string, bookPayload: Record<string, unknown>) {
  await fetch(`${APP_URL}/.netlify/functions/storyforge-image-optimizer-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sfRunId, bookPayload }),
  }).catch(err => console.warn("[storyforge/matter] image optimizer trigger failed:", err));
}

function triggerArchiver(toolRunId: string) {
  fetch(`${APP_URL}/.netlify/functions/storyforge-archive-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolRunId }),
  }).catch(err => console.warn("[storyforge] archive trigger failed:", err));
}
