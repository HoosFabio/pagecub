import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 26;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL      = process.env.APP_URL || "https://pagecub.com";

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

  // Already advanced past foundation stage (MindStudio retry arrived late)
  if (sfRun.status !== "foundation_pending") {
    console.log("[storyforge/foundation] already processed:", sfRunId, "status:", sfRun.status);
    return NextResponse.json({ ok: true, note: "already processed" });
  }

  // MindStudio explicit failure
  if (body.success === false) {
    console.error("[storyforge/foundation] MindStudio success:false:", sfRunId);
    await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRunId);
    await refundCredits(admin, sfRun.tool_run_id, sfRun.user_id);
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
    await refundCredits(admin, sfRun.tool_run_id, sfRun.user_id);
    return NextResponse.json({ ok: false, note: "incomplete foundation" });
  }

  // ── ATOMIC idempotency: conditional UPDATE is the real lock ──────────────────
  // MindStudio retries callbacks if our response is slow. Two concurrent requests
  // can both pass the status check above before either updates the DB.
  // Adding .eq("status","foundation_pending") to the UPDATE makes it atomic at
  // the PostgreSQL level — only ONE concurrent UPDATE wins that WHERE clause.
  // The loser gets 0 rows in `claimed` and returns early, never triggering the watchdog.
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
    .eq("status", "foundation_pending") // ← the atomic lock
    .select("id");

  if (updateError) {
    console.error("[storyforge/foundation] sf_run update failed:", updateError.message);
    return NextResponse.json({ ok: false, note: "db update failed" });
  }

  if (!claimed || claimed.length === 0) {
    // Another concurrent callback already won — bail out without triggering watchdog
    console.log("[storyforge/foundation] lost atomic race — another callback already claimed sfRunId:", sfRunId);
    return NextResponse.json({ ok: true, note: "already claimed by concurrent request" });
  }

  console.log(`[storyforge/foundation] claimed — sfRunId: ${sfRunId}, triggering chapter dispatch`);

  // Fire-and-forget: watchdog handles chapter dispatch (has 15-min timeout, no inline race)
  fetch(`${APP_URL}/.netlify/functions/storyforge-chapter-watchdog-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sfRunId, immediate: true }),
  }).catch(err =>
    console.error("[storyforge/foundation] watchdog trigger failed:", err)
  );

  return NextResponse.json({ ok: true });
}

async function refundCredits(admin: ReturnType<typeof createClient<any>>, toolRunId: string, userId: string) {
  if (!toolRunId || !userId) return;
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
    }
  } catch (err) {
    console.error("[storyforge/foundation] refund error:", err);
  }
}
