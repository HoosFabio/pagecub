/**
 * storyforge-chapter-watchdog-background
 *
 * Two modes:
 *   immediate: true  — Triggered by the foundation callback immediately after storing data.
 *                      Dispatches ALL 10 chapter agents right away, then monitors for stragglers.
 *   immediate: false — Legacy: sleeps 12 min then checks for missing chapters.
 *
 * Runs as a Netlify background function (up to 15 min).
 */

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const MINDSTUDIO_API_KEY   = process.env.MINDSTUDIO_API_KEY!;
const CHAPTER_AGENT_ID     = process.env.STORYFORGE_CHAPTER_AGENT_ID!;
const APP_URL              = process.env.APP_URL || "https://pagecub.com";
const RETRY_SECRET         = process.env.STORYFORGE_RETRY_SECRET || "storyforge-retry-2026";

const SLEEP_BEFORE_FIRST_CHECK_MS = 12 * 60 * 1000; // 12 min (legacy mode)
const RETRY_INTERVAL_MS           =  3 * 60 * 1000; // 3 min between recovery passes
const MAX_WATCHDOG_PASSES         = 3;

export default async (req: Request) => {
  let sfRunId: string;
  let immediate = false;
  try {
    const body = await req.json();
    sfRunId   = body.sfRunId;
    immediate = !!body.immediate;
  } catch {
    console.error("[watchdog] invalid json body");
    return new Response("bad request", { status: 400 });
  }

  if (!sfRunId) {
    console.error("[watchdog] missing sfRunId");
    return new Response("missing sfRunId", { status: 400 });
  }

  console.log(`[watchdog] started for sfRunId: ${sfRunId} immediate=${immediate}`);

  // ── Immediate mode: dispatch all chapters now ────────────────────────────────
  if (immediate) {
    const sfRun = await getSfRun(sfRunId);
    if (!sfRun) {
      console.error(`[watchdog] sf_run not found for immediate dispatch: ${sfRunId}`);
      return new Response("ok");
    }
    if (sfRun.status !== "chapters_processing") {
      console.log(`[watchdog] immediate dispatch skipped — status: ${sfRun.status}`);
      return new Response("ok");
    }

    const chapterCount = sfRun.chapter_count ?? 10;
    const existing = (sfRun.chapters ?? {}) as Record<string, ChapterEntry>;

    console.log(`[watchdog] immediate dispatch: ${chapterCount} chapters for sfRunId: ${sfRunId}`);

    for (let ch = 1; ch <= chapterCount; ch++) {
      const entry = existing[String(ch)];
      if (entry?.text_1 && !entry?.failed) {
        console.log(`[watchdog] ch${ch}: already done, skipping`);
        continue;
      }

      await sleep(ch > 1 ? 350 : 0); // 350ms stagger between dispatches

      try {
        const res = await fetch(
          `${APP_URL}/api/pagecub/retry/${sfRunId}/${ch}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: RETRY_SECRET }),
          }
        );
        const data = await res.json().catch(() => ({}));
        console.log(`[watchdog] immediate ch${ch}: ${JSON.stringify(data)}`);
      } catch (err) {
        console.error(`[watchdog] immediate ch${ch} dispatch error:`, err);
      }
    }

    console.log(`[watchdog] immediate dispatch complete — now entering monitoring loop`);
    // Fall through to monitoring loop below (no initial sleep since we just dispatched)
    await sleep(RETRY_INTERVAL_MS); // wait 3 min, then check for stragglers
  } else {
    // Legacy mode: sleep before first check
    await sleep(SLEEP_BEFORE_FIRST_CHECK_MS);
  }

  // ── Monitoring loop: check for missing/stuck chapters ───────────────────────
  for (let pass = 1; pass <= MAX_WATCHDOG_PASSES; pass++) {
    console.log(`[watchdog] monitoring pass ${pass}/${MAX_WATCHDOG_PASSES} — sfRunId: ${sfRunId}`);

    const sfRun = await getSfRun(sfRunId);
    if (!sfRun) {
      console.error(`[watchdog] sf_run not found: ${sfRunId}`);
      return new Response("ok");
    }

    if (sfRun.status !== "chapters_processing") {
      console.log(`[watchdog] status=${sfRun.status} — run has advanced, exiting`);
      return new Response("ok");
    }

    const chapters = (sfRun.chapters ?? {}) as Record<string, ChapterEntry>;
    const chapterCount = sfRun.chapter_count ?? 10;

    const missing = Array.from({ length: chapterCount }, (_, i) => String(i + 1))
      .filter(n => {
        const ch = chapters[n];
        if (!ch) return true;
        if (ch.retrying) return true;
        return false;
      });

    if (missing.length === 0) {
      console.log(`[watchdog] all chapters present — pass ${pass} done`);
      return new Response("ok");
    }

    console.log(`[watchdog] pass ${pass}: missing/stuck chapters: ${missing.join(", ")}`);

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
        console.log(`[watchdog] retry ch${chapterNum}: ${JSON.stringify(data)}`);
      } catch (err) {
        console.error(`[watchdog] error retrying ch${chapterNum}:`, err);
      }
    }

    if (pass < MAX_WATCHDOG_PASSES) {
      await sleep(RETRY_INTERVAL_MS);
    }
  }

  console.log(`[watchdog] all passes complete for sfRunId: ${sfRunId}`);
  return new Response("ok");
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getSfRun(sfRunId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sf_runs?id=eq.${sfRunId}&select=id,status,chapter_count,chapters,input_payload,charachter_bible,visual_bible,chapter_outline,story,book_title,cast_registry`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json().catch(() => []);
  return data[0] ?? null;
}

type ChapterEntry = {
  title?: string; text_1?: string; failed?: boolean; retrying?: boolean; retry_count?: number;
};

export const config = { path: "/.netlify/functions/storyforge-chapter-watchdog-background" };
