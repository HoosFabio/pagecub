/**
 * storyforge-chapter-watchdog-background
 *
 * Triggered by the foundation callback after dispatching all chapter agents.
 * Sleeps 12 minutes, then checks which chapters are still missing and retries them.
 * Runs up to MAX_WATCHDOG_PASSES times with RETRY_INTERVAL_MS between each pass.
 *
 * This is RECOVERY ONLY — it does not do initial dispatch. Chapters are dispatched
 * inline in the Foundation callback (same as inksynth). The watchdog only fires
 * for chapters that genuinely failed to call back after 12+ minutes.
 *
 * POST body: { sfRunId: string }
 */

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const APP_URL              = process.env.APP_URL || "https://pagecub.com";
const RETRY_SECRET         = process.env.STORYFORGE_RETRY_SECRET || "storyforge-retry-2026";

const SLEEP_BEFORE_FIRST_CHECK_MS = 12 * 60 * 1000; // 12 min — chapters take 3-7 min; well clear by then
const RETRY_INTERVAL_MS           =  3 * 60 * 1000; // 3 min between retry passes
const MAX_WATCHDOG_PASSES         = 3;               // 12 + 3 + 3 = 18 min total window

export default async (req: Request) => {
  let sfRunId: string;
  try {
    const body = await req.json();
    sfRunId = body.sfRunId;
  } catch {
    console.error("[watchdog] invalid json body");
    return new Response("bad request", { status: 400 });
  }

  if (!sfRunId) {
    console.error("[watchdog] missing sfRunId");
    return new Response("missing sfRunId", { status: 400 });
  }

  console.log(`[watchdog] started for sfRunId: ${sfRunId}`);

  // Sleep first — chapters are dispatched inline by Foundation callback and
  // take 3-7 min to complete. 12 min gives them ample time before we intervene.
  await sleep(SLEEP_BEFORE_FIRST_CHECK_MS);

  for (let pass = 1; pass <= MAX_WATCHDOG_PASSES; pass++) {
    console.log(`[watchdog] pass ${pass}/${MAX_WATCHDOG_PASSES} — checking sfRunId: ${sfRunId}`);

    const sfRun = await getSfRun(sfRunId);
    if (!sfRun) {
      console.error(`[watchdog] sf_run not found: ${sfRunId}`);
      return new Response("ok");
    }

    // Run already moved past chapter stage — nothing to do
    if (sfRun.status !== "chapters_processing") {
      console.log(`[watchdog] sfRun status=${sfRun.status} — no action needed`);
      return new Response("ok");
    }

    const chapters    = (sfRun.chapters ?? {}) as Record<string, ChapterEntry>;
    const chapterCount = sfRun.chapter_count ?? 10;

    // Only retry chapters that are completely missing or stuck in retrying state.
    // Do NOT retry chapters with no text_1 yet — they may still be in flight.
    const missing = Array.from({ length: chapterCount }, (_, i) => String(i + 1))
      .filter(n => {
        const ch = chapters[n];
        if (!ch) return true;         // completely absent
        if (ch.retrying) return true; // stuck in retry marker
        return false;
      });

    if (missing.length === 0) {
      console.log(`[watchdog] all chapters present — pass ${pass} done`);
      return new Response("ok");
    }

    console.log(`[watchdog] pass ${pass}: missing/stuck chapters: ${missing.join(", ")} — retrying`);

    for (const chapterNum of missing) {
      try {
        const res = await fetch(
          `${APP_URL}/api/pagecub/retry/${sfRunId}/${chapterNum}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: RETRY_SECRET }),
          }
        );
        const data = await res.json().catch(() => ({}));
        console.log(`[watchdog] retried chapter ${chapterNum}: ${JSON.stringify(data)}`);
      } catch (err) {
        console.error(`[watchdog] error retrying chapter ${chapterNum}:`, err);
      }
    }

    if (pass < MAX_WATCHDOG_PASSES) {
      await sleep(RETRY_INTERVAL_MS);
    }
  }

  console.log(`[watchdog] all passes complete for sfRunId: ${sfRunId}`);
  return new Response("ok");
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSfRun(sfRunId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sf_runs?id=eq.${sfRunId}&select=id,status,chapter_count,chapters`,
    {
      headers: {
        apikey:        SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await res.json().catch(() => []);
  return data[0] ?? null;
}

type ChapterEntry = {
  title?: string; text_1?: string; failed?: boolean; retrying?: boolean; retry_count?: number;
};

export const config = { path: "/.netlify/functions/storyforge-chapter-watchdog-background" };
