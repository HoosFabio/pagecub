import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
import { NextRequest, NextResponse } from "next/server";

const MINDSTUDIO_API_KEY       = process.env.MINDSTUDIO_API_KEY!;
const STORYFORGE_CHAPTER_AGENT_ID = process.env.STORYFORGE_CHAPTER_AGENT_ID!;
const APP_URL = process.env.APP_URL || "https://pagecub.com";

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
    console.error("[storyforge/foundation] sf_run not found:", sfRunId);
    return NextResponse.json({ ok: false, note: "sf_run not found" });
  }

  // Idempotency guard
  if (sfRun.status !== "foundation_pending") {
    console.log("[storyforge/foundation] already processed:", sfRunId);
    return NextResponse.json({ ok: true, note: "already processed" });
  }

  // MindStudio explicit failure
  if (body.success === false) {
    console.error("[storyforge/foundation] MindStudio success:false for sfRun:", sfRunId);
    await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRunId);
    await admin.from("tool_runs").update({
      status: "failed",
      error_message: "Foundation stage failed",
      completed_at: new Date().toISOString(),
    }).eq("id", sfRun.tool_run_id);
    // Refund credits
    await refundCredits(admin, sfRun.tool_run_id, sfRun.user_id);
    return NextResponse.json({ ok: false, note: "foundation failed" });
  }

  const result = (body.result ?? {}) as Record<string, unknown>;

  // Parse foundation outputs — MindStudio sends output display labels as keys.
  // Values may be nested objects — JSON.stringify to ensure useful string representation.
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
  // book_title is optional — Foundation Agent may not output it directly
  const book_title       = parseField(result["book_title"]) || parseField(result["Book title"]) || parseField(result["Book Title"]) || null;
  // Chapter count is always 10 — fixed by design
  const chapter_count = 10;

  if (!charachter_bible || !visual_bible || !chapter_outline || !story) {
    console.error("[storyforge/foundation] missing required foundation fields. Keys received:", Object.keys(result));
    await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRunId);
    await admin.from("tool_runs").update({
      status: "failed",
      error_message: "Foundation stage returned incomplete data (missing: " + [!charachter_bible&&"character_bible",!visual_bible&&"visual_bible",!chapter_outline&&"chapter_outline",!story&&"story"].filter(Boolean).join(",") + ")",
      completed_at: new Date().toISOString(),
    }).eq("id", sfRun.tool_run_id);
    await refundCredits(admin, sfRun.tool_run_id, sfRun.user_id);
    return NextResponse.json({ ok: false, note: "incomplete foundation" });
  }

  // Store foundation data and update status
  await admin.from("sf_runs").update({
    status:           "chapters_processing",
    book_title,
    charachter_bible,
    visual_bible,
    chapter_outline,
    story,
    cast_registry,
    chapter_count,
    chapters_done:    0,
    chapters:         {},
  }).eq("id", sfRunId);

  console.log(`[storyforge/foundation] foundation stored for sfRun ${sfRunId} — dispatching ${chapter_count} chapter agents`);

  // Original form inputs — passed through so chapter agent has full context
  const ip = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");

  // Dispatch all chapter writers with callbackUrl — MindStudio returns immediately
  // and POSTs results to the callback endpoint when each chapter agent finishes.
  const chapterDispatch = Array.from({ length: chapter_count }, (_, i) => i + 1).map(async (chapterNum) => {
    // Small stagger: 300ms between each dispatch
    await new Promise(resolve => setTimeout(resolve, (chapterNum - 1) * 300));
    try {
      const callbackUrl = `${APP_URL}/api/pagecub/callback/chapter/${sfRunId}/${chapterNum}`;
      const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MINDSTUDIO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId:       STORYFORGE_CHAPTER_AGENT_ID,
          workflow:    "Main",
          callbackUrl,
          variables: {
            // Dynamic chapter selector
            chapter_num:            String(chapterNum),
            // Foundation outputs — sent with _clean suffix matching chapter agent input names
            charachter_bible_clean: charachter_bible,
            visual_bible_clean:     visual_bible,
            story_clean:            story,
            chapter_outline_clean:  chapter_outline,
            cast_registry_clean:    cast_registry,
            // Original form inputs
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

  // All dispatches return immediately (async with callbackUrl) — this should be fast
  await Promise.all(chapterDispatch);

  // Trigger watchdog — wakes after 12 min, auto-retries any missing chapter callbacks
  fetch(`${APP_URL}/.netlify/functions/storyforge-chapter-watchdog-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sfRunId }),
  }).catch(err => console.error("[storyforge/foundation] watchdog trigger failed:", err));

  return NextResponse.json({ ok: true });
}

async function refundCredits(
  admin: any,
  toolRunId: string,
  userId: string
) {
  try {
    const { data: toolRun } = await admin
      .from("tool_runs")
      .select("credits_charged")
      .eq("id", toolRunId)
      .single();

    if (!toolRun?.credits_charged) return;

    const { data: billing } = await admin
      .from("billing_customers")
      .select("credit_balance")
      .eq("user_id", userId)
      .single();

    if (billing) {
      await admin
        .from("billing_customers")
        .update({ credit_balance: billing.credit_balance + toolRun.credits_charged })
        .eq("user_id", userId);
      console.log(`[storyforge/foundation] refunded ${toolRun.credits_charged} credits to user ${userId}`);
    }
  } catch (err) {
    console.error("[storyforge/foundation] refund error:", err);
  }
}
