/**
 * Admin: re-dispatch chapter agents for an sf_run that's stuck at chapters_processing.
 * Runs on Netlify — avoids Cloudflare 1010 block that affects direct VPS → MindStudio calls.
 * Protected by a simple shared secret header.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MS_KEY         = process.env.MINDSTUDIO_API_KEY!;
const CHAPTER_ID     = process.env.STORYFORGE_CHAPTER_AGENT_ID!;
const APP_URL        = process.env.APP_URL || "https://pagecub.com";
const ADMIN_SECRET   = process.env.ADMIN_SECRET || "pagecub-admin-2026";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sfRunId: string }> }
) {
  // Simple auth
  const secret = req.headers.get("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ ok: false, note: "unauthorized" }, { status: 401 });
  }

  const { sfRunId } = await params;
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: sfRun, error } = await admin
    .from("sf_runs")
    .select("id, status, chapter_count, chapters, charachter_bible, visual_bible, chapter_outline, story, cast_registry, input_payload")
    .eq("id", sfRunId)
    .single();

  if (error || !sfRun) {
    return NextResponse.json({ ok: false, note: "sf_run not found" }, { status: 404 });
  }

  if (sfRun.status !== "chapters_processing") {
    return NextResponse.json({ ok: false, note: `sf_run status is ${sfRun.status} — expected chapters_processing` }, { status: 400 });
  }

  const ip = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
  const chapterCount = sfRun.chapter_count ?? 10;
  const existing = (sfRun.chapters ?? {}) as Record<string, { text_1?: string; failed?: boolean }>;

  const results: Record<string, unknown> = {};

  for (let ch = 1; ch <= chapterCount; ch++) {
    const entry = existing[String(ch)];
    // Skip chapters that already completed successfully
    if (entry?.text_1 && !entry?.failed) {
      results[`ch${ch}`] = "skipped_already_done";
      continue;
    }

    await new Promise(r => setTimeout(r, 350));

    const callbackUrl = `${APP_URL}/api/pagecub/callback/chapter/${sfRunId}/${ch}`;
    try {
      const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${MS_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: CHAPTER_ID,
          workflow: "Main",
          callbackUrl,
          variables: {
            chapter_num:            String(ch),
            charachter_bible_clean: sfRun.charachter_bible,
            visual_bible_clean:     sfRun.visual_bible,
            story_clean:            sfRun.story,
            chapter_outline_clean:  sfRun.chapter_outline,
            cast_registry_clean:    sfRun.cast_registry,
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

      const msBody = await msRes.json().catch(() => ({}));
      results[`ch${ch}`] = msRes.ok
        ? `dispatched threadId=${msBody.threadId?.slice(0, 8)}`
        : `failed ${msRes.status}: ${JSON.stringify(msBody).slice(0, 80)}`;
    } catch (err) {
      results[`ch${ch}`] = `error: ${String(err).slice(0, 80)}`;
    }
  }

  return NextResponse.json({ ok: true, sfRunId, results });
}
