import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_CHAPTER_RETRIES = 2; // 1 original + 2 retries = 3 total attempts

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sfRunId: string; chapterNum: string }> }
) {
  const { sfRunId, chapterNum } = await params;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, note: "invalid json" });
  }

  // Look up sf_run — chapters column NOT fetched here; the atomic RPC owns all writes to it
  const { data: sfRun, error: sfRunError } = await admin
    .from("sf_runs")
    .select("id, tool_run_id, user_id, status, chapter_count, charachter_bible, visual_bible, chapter_outline, story, book_title, input_payload, cast_registry")
    .eq("id", sfRunId)
    .single();

  if (sfRunError || !sfRun) {
    console.error(`[storyforge/chapter/${chapterNum}] sf_run not found:`, sfRunId);
    return NextResponse.json({ ok: false, note: "sf_run not found" });
  }

  if (sfRun.status === "done" || sfRun.status === "failed") {
    console.log(`[storyforge/chapter/${chapterNum}] sf_run already finalized, skipping`);
    return NextResponse.json({ ok: true, note: "already finalized" });
  }

  // Peek at just this chapter's current entry to check idempotency / retry count
  // (narrow select — not the full chapters map)
  const { data: chapterCheck } = await admin
    .from("sf_runs")
    .select(`chapters->>${chapterNum}`)
    .eq("id", sfRunId)
    .single() as { data: Record<string, string> | null };

  const existingRaw = chapterCheck?.[chapterNum] ?? chapterCheck?.["chapters->" + chapterNum] ?? null;
  let existingEntry: ChapterEntry | undefined;
  try {
    existingEntry = existingRaw ? JSON.parse(existingRaw) : undefined;
  } catch {
    existingEntry = undefined;
  }

  // Block duplicate successful callbacks
  if (existingEntry && existingEntry.text_1 && !existingEntry.failed && !existingEntry.retrying) {
    console.log(`[storyforge/chapter/${chapterNum}] already stored successfully, skipping`);
    return NextResponse.json({ ok: true, note: "already stored" });
  }

  const result = (body.result ?? {}) as Record<string, unknown>;

  // ── Failure paths ─────────────────────────────────────────────────────────────
  if (body.success === false) {
    console.warn(`[storyforge/chapter/${chapterNum}] MindStudio success:false`);
    return handleChapterFailure(admin, sfRun, sfRunId, chapterNum, existingEntry, "mindstudio_failure");
  }

  const title     = String(result["ch_title"]   ?? "").trim();
  const summary   = String(result["ch_summary"] ?? "").trim();
  const text_1    = String(result["ch_text_1"]  ?? "").trim();
  const text_2    = String(result["ch_text_2"]  ?? "").trim();
  const text_1_wc = parseInt(String(result["ch_text_1_word_count"] ?? "0"), 10) || 0;
  const text_2_wc = parseInt(String(result["ch_text_2_word_count"] ?? "0"), 10) || 0;
  const image_1   = String(result["Image 1 "] ?? result["Image 1"] ?? "").trim();
  const image_2   = String(result["Image 2 "] ?? result["Image 2"] ?? "").trim();

  if (!text_1 && !text_2) {
    console.warn(`[storyforge/chapter/${chapterNum}] empty text — likely safety rejection`);
    return handleChapterFailure(admin, sfRun, sfRunId, chapterNum, existingEntry, "empty_text");
  }

  // ── Success — atomic merge via Postgres RPC ───────────────────────────────────
  await mergeAndCheckCompletion(admin, sfRun, chapterNum, {
    title, summary, text_1, text_2,
    text_1_word_count: text_1_wc,
    text_2_word_count: text_2_wc,
    total_word_count:  text_1_wc + text_2_wc,
    image_1, image_2,
    failed: false, retrying: false,
    retry_count: existingEntry?.retry_count ?? 0,
  });

  return NextResponse.json({ ok: true });
}

// ─── Failure handler: retry or permanently fail ──────────────────────────────

async function handleChapterFailure(
  admin: ReturnType<typeof createAdminClient>,
  sfRun: SfRun,
  sfRunId: string,
  chapterNum: string,
  existingEntry: ChapterEntry | undefined,
  reason: string,
): Promise<NextResponse> {
  const retryCount = existingEntry?.retry_count ?? 0;

  if (retryCount < MAX_CHAPTER_RETRIES) {
    const nextRetry = retryCount + 1;
    console.log(`[storyforge/chapter/${chapterNum}] ${reason} — retry ${nextRetry}/${MAX_CHAPTER_RETRIES}`);

    // Atomic merge of retrying marker
    await atomicMergeChapter(admin, sfRunId, chapterNum, {
      retrying: true, failed: false, retry_count: nextRetry,
    } as ChapterEntry);

    await redispatchChapter(sfRun, sfRunId, chapterNum);
    return NextResponse.json({ ok: true, note: `chapter ${chapterNum} retry ${nextRetry}` });
  }

  console.error(`[storyforge/chapter/${chapterNum}] ${reason} — retries exhausted, marking permanently failed`);
  await mergeAndCheckCompletion(admin, sfRun, chapterNum, {
    title: "", summary: "", text_1: "", text_2: "",
    text_1_word_count: 0, text_2_word_count: 0, total_word_count: 0,
    image_1: "", image_2: "",
    failed: true, retrying: false, retry_count: retryCount,
  });
  return NextResponse.json({ ok: false, note: `chapter ${chapterNum} permanently failed` });
}

// ─── Atomic JSONB merge via Postgres RPC ─────────────────────────────────────
// Replaces the old read-modify-write pattern that caused race conditions when
// 10 chapter callbacks arrived simultaneously and overwrote each other's writes.

async function atomicMergeChapter(
  admin: ReturnType<typeof createAdminClient>,
  sfRunId: string,
  chapterNum: string,
  chapterData: ChapterEntry,
): Promise<{ settled_count: number; chapter_count: number; chapters: Record<string, ChapterEntry> } | null> {
  const { data, error } = await admin.rpc("merge_storyforge_chapter", {
    p_sf_run_id:    sfRunId,
    p_chapter_num:  chapterNum,
    p_chapter_data: chapterData,
  });
  if (error) {
    console.error(`[storyforge/chapter/${chapterNum}] atomicMerge RPC error:`, error.message);
    return null;
  }
  return data as { settled_count: number; chapter_count: number; chapters: Record<string, ChapterEntry> };
}

async function mergeAndCheckCompletion(
  admin: ReturnType<typeof createAdminClient>,
  sfRun: SfRun,
  chapterNum: string,
  chapterData: ChapterEntry,
) {
  const result = await atomicMergeChapter(admin, sfRun.id, chapterNum, chapterData);
  if (!result) return;

  const { settled_count, chapter_count, chapters } = result;
  const allSettled = settled_count >= chapter_count;

  console.log(`[storyforge/chapter/${chapterNum}] settled=${settled_count}/${chapter_count}, allSettled=${allSettled}`);

  if (!allSettled) return;

  // ── All settled — check for permanent failures ────────────────────────────────
  const failedChapters = Object.entries(chapters)
    .filter(([, ch]) => ch.failed)
    .map(([k]) => k)
    .sort();

  if (failedChapters.length > 0) {
    console.error(`[storyforge] chapters permanently failed: ${failedChapters.join(",")} — aborting`);
    await admin.from("sf_runs").update({
      status:          "failed",
      packaging_error: `chapters_failed:${failedChapters.join(",")}`,
    }).eq("id", sfRun.id);
    await admin.from("tool_runs").update({
      status:        "failed",
      error_message: `Chapter generation failed after retries: ${failedChapters.join(", ")}`,
      completed_at:  new Date().toISOString(),
    }).eq("id", sfRun.tool_run_id);
    await refundCredits(admin, sfRun.tool_run_id, sfRun.user_id);
    return;
  }

  // ── All succeeded — advance to matter ────────────────────────────────────────
  await admin.from("sf_runs").update({
    status: "matter_pending",
  }).eq("id", sfRun.id);

  console.log(`[storyforge] all chapters done — dispatching matter agent for sfRunId: ${sfRun.id}`);

  const appUrl = process.env.APP_URL || "https://pagecub.com";
  const ip     = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr  = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");

  try {
    const matterRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MINDSTUDIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        appId:       process.env.STORYFORGE_MATTER_AGENT_ID,
        workflow:    "Main",
        callbackUrl: `${appUrl}/api/pagecub/callback/matter/${sfRun.id}`,
        variables: {
          story_clean:            sfRun.story            ?? "",
          chapter_outline_clean:  sfRun.chapter_outline  ?? "",
          visual_bible_clean:     sfRun.visual_bible     ?? "",
          charachter_bible_clean: sfRun.charachter_bible ?? "",
          book_title:             sfRun.book_title       ?? "",
          charachter_name:        String(ip.charachter_name ?? ""),
          age:                    String(ip.age             ?? ""),
          moral:                  String(ip.moral           ?? ""),
          world_theme:            toStr(ip.world_theme),
          dedication:             ip.dedication   ? String(ip.dedication)   : "",
          opening_note:           ip.opening_note ? String(ip.opening_note) : "",
          colophon:               ip.colophon     ? String(ip.colophon)     : "",
        },
      }),
    });
    if (!matterRes.ok) {
      const detail = await matterRes.text().catch(() => "(unreadable)");
      console.error(`[storyforge] matter dispatch failed: ${matterRes.status} — ${detail.slice(0, 200)}`);
    } else {
      const matterData = await matterRes.json().catch(() => ({}));
      console.log(`[storyforge] matter agent dispatched — callbackInProgress: ${matterData.callbackInProgress}`);
    }
  } catch (err) {
    console.error("[storyforge] matter agent dispatch error:", err);
  }
}

// ─── Re-dispatch a single chapter agent ──────────────────────────────────────

async function redispatchChapter(sfRun: SfRun, sfRunId: string, chapterNum: string) {
  const appUrl = process.env.APP_URL || "https://pagecub.com";
  const ip     = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr  = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");

  try {
    const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MINDSTUDIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        appId:       process.env.STORYFORGE_CHAPTER_AGENT_ID,
        workflow:    "Main",
        callbackUrl: `${appUrl}/api/pagecub/callback/chapter/${sfRunId}/${chapterNum}`,
        variables: {
          chapter_num:            chapterNum,
          charachter_bible_clean: sfRun.charachter_bible ?? "",
          visual_bible_clean:     sfRun.visual_bible     ?? "",
          story_clean:            sfRun.story            ?? "",
          chapter_outline_clean:  sfRun.chapter_outline  ?? "",
          cast_registry_clean:    sfRun.cast_registry    ?? "",
          charachter_name:        String(ip.charachter_name        ?? ""),
          gender:                 String(ip.gender                 ?? ""),
          age:                    String(ip.age                    ?? ""),
          charachter_bio:         String(ip.charachter_bio         ?? ""),
          charachter_desc:        String(ip.charachter_desc        ?? ""),
          supporting_charachters: String(ip.supporting_charachters ?? ""),
          world_setting:          String(ip.world_setting          ?? ""),
          world_theme:            toStr(ip.world_theme),
          artistic_style:         String(ip.artistic_style         ?? ""),
          time_era:               String(ip.time_era               ?? ""),
          structure:              String(ip.structure              ?? "Linear 3-act plot"),
          problem:                String(ip.problem                ?? ""),
          moral:                  String(ip.moral                  ?? ""),
          relevant_struggles:     toStr(ip.relevant_struggles),
        },
      }),
    });
    if (!msRes.ok) {
      const detail = await msRes.text().catch(() => "(unreadable)");
      console.error(`[storyforge/chapter/${chapterNum}] redispatch failed: ${msRes.status} — ${detail.slice(0, 100)}`);
    } else {
      const msData = await msRes.json().catch(() => ({}));
      console.log(`[storyforge/chapter/${chapterNum}] redispatched — callbackInProgress: ${msData.callbackInProgress}`);
    }
  } catch (err) {
    console.error(`[storyforge/chapter/${chapterNum}] redispatch error:`, err);
  }
}

// ─── Credit refund ────────────────────────────────────────────────────────────

async function refundCredits(
  admin: ReturnType<typeof createAdminClient>,
  toolRunId: string,
  userId: string,
) {
  try {
    const { data: toolRun } = await admin
      .from("tool_runs").select("credits_charged").eq("id", toolRunId).single();
    if (!toolRun?.credits_charged) return;
    const { data: billing } = await admin
      .from("billing_customers").select("credit_balance").eq("user_id", userId).single();
    if (billing) {
      await admin.from("billing_customers")
        .update({ credit_balance: billing.credit_balance + toolRun.credits_charged })
        .eq("user_id", userId);
      console.log(`[storyforge] refunded ${toolRun.credits_charged} credits to user ${userId}`);
    }
  } catch (err) {
    console.error("[storyforge] refund error:", err);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ChapterEntry = {
  title?: string; summary?: string; text_1?: string; text_2?: string;
  text_1_word_count?: number; text_2_word_count?: number; total_word_count?: number;
  image_1?: string; image_2?: string;
  failed: boolean; retrying: boolean; retry_count?: number;
};

type SfRun = {
  id: string; tool_run_id: string; user_id: string;
  chapter_count: number;
  charachter_bible: string; visual_bible: string;
  chapter_outline: string; story: string; book_title: string;
  input_payload: Record<string, unknown>;
  cast_registry: string;
};
