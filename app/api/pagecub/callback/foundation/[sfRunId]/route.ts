import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 26;

const SUPABASE_URL             = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY             = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MINDSTUDIO_API_KEY       = process.env.MINDSTUDIO_API_KEY!;
const STORYFORGE_CHAPTER_AGENT_ID = process.env.STORYFORGE_CHAPTER_AGENT_ID!;
const APP_URL                  = process.env.APP_URL || "https://pagecub.com";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sfRunId: string }> }
) {
  const { sfRunId } = await params;
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, note: "invalid json" });
  }

  // Look up sf_run
  const { data: sfRun, error: sfRunError } = await admin
    .from("sf_runs")
    .select("id, tool_run_id, status, input_payload, user_id")
    .eq("id", sfRunId)
    .single();

  if (sfRunError || !sfRun) {
    console.error("[storyforge/foundation] sf_run not found:", sfRunId, sfRunError?.message);
    return NextResponse.json({ ok: false, note: "sf_run not found" });
  }

  // Idempotency guard
  if (sfRun.status !== "foundation_pending") {
    console.log("[storyforge/foundation] already processed:", sfRunId, "status:", sfRun.status);
    return NextResponse.json({ ok: true, note: "already processed" });
  }

  // MindStudio explicit failure
  if (body.success === false) {
    console.error("[storyforge/foundation] MindStudio success:false for sfRun:", sfRunId);
    await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRunId);
    return NextResponse.json({ ok: false, note: "foundation failed" });
  }

  const result = (body.result ?? {}) as Record<string, unknown>;

  function parseField(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    return JSON.stringify(val);
  }

  const charachter_bible = parseField(result["Character bible"]);
  const visual_bible     = parseField(result["Visual bible"]);
  const chapter_outline  = parseField(result["Chapter outline"]);
  const story            = parseField(result["Story "] ?? result["Story"]);
  const cast_registry    = parseField(result["Cast registry"]);
  const book_title       =
    parseField(result["book_title"]) ||
    parseField(result["Book title"]) ||
    parseField(result["Book Title"]) ||
    null;

  const chapter_count = 10;

  if (!charachter_bible || !visual_bible || !chapter_outline || !story) {
    console.error("[storyforge/foundation] missing required fields. Keys received:", Object.keys(result));
    await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRunId);
    return NextResponse.json({ ok: false, note: "incomplete foundation" });
  }

  // ── Atomic idempotency: conditional UPDATE prevents double-dispatch on MindStudio retry ──
  // If MindStudio retries this callback before the first request updates the DB,
  // both would pass the status check above. The .eq("status","foundation_pending")
  // on the UPDATE makes it atomic — only one concurrent request wins the DB lock.
  // The loser gets claimed=[] and returns without dispatching any chapter agents.
  const { data: claimed, error: updateError } = await admin
    .from("sf_runs")
    .update({
      status:          "chapters_processing",
      book_title,
      charachter_bible,
      visual_bible,
      chapter_outline,
      story,
      cast_registry,
      chapter_count,
      chapters_done:   0,
      chapters:        {},
    })
    .eq("id", sfRunId)
    .eq("status", "foundation_pending")
    .select("id");

  if (updateError) {
    console.error("[storyforge/foundation] sf_run update failed:", updateError.message);
    return NextResponse.json({ ok: false, note: "db update failed" });
  }

  if (!claimed || claimed.length === 0) {
    console.log("[storyforge/foundation] lost atomic race — another request already claimed:", sfRunId);
    return NextResponse.json({ ok: true, note: "already claimed by concurrent request" });
  }

  console.log(`[storyforge/foundation] stored — sfRunId: ${sfRunId}, dispatching ${chapter_count} chapters inline`);

  // ── Dispatch all chapter agents inline (same as inksynth) ────────────────────
  // MindStudio /apps/run returns immediately; chapters POST results to their
  // callback URLs when done. This is fast (just 10 HTTP calls with 300ms stagger).
  const ip    = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");

  const chapterDispatch = Array.from({ length: chapter_count }, (_, i) => i + 1).map(async (chapterNum) => {
    await new Promise(resolve => setTimeout(resolve, (chapterNum - 1) * 300));
    try {
      const callbackUrl = `${APP_URL}/api/pagecub/callback/chapter/${sfRunId}/${chapterNum}`;
      const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
        method:  "POST",
        headers: { Authorization: `Bearer ${MINDSTUDIO_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          appId:    STORYFORGE_CHAPTER_AGENT_ID,
          workflow: "Main",
          callbackUrl,
          variables: {
            chapter_num:            String(chapterNum),
            charachter_bible_clean: charachter_bible,
            visual_bible_clean:     visual_bible,
            story_clean:            story,
            chapter_outline_clean:  chapter_outline,
            cast_registry_clean:    cast_registry,
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
        console.error(`[storyforge/foundation] chapter ${chapterNum} dispatch failed: ${msRes.status} — ${detail.slice(0, 100)}`);
      } else {
        const msData = await msRes.json().catch(() => ({}));
        console.log(`[storyforge/foundation] chapter ${chapterNum} dispatched — callbackInProgress: ${msData.callbackInProgress}`);
      }
    } catch (err) {
      console.error(`[storyforge/foundation] chapter ${chapterNum} dispatch error:`, err);
    }
  });

  await Promise.all(chapterDispatch);

  // Trigger watchdog — sleeps 12 min, then retries any truly missing chapters
  fetch(`${APP_URL}/.netlify/functions/storyforge-chapter-watchdog-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sfRunId }),
  }).catch(err => console.error("[storyforge/foundation] watchdog trigger failed:", err));

  return NextResponse.json({ ok: true });
}
