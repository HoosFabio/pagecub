import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Internal-use retry endpoint: re-dispatches a single missing/failed chapter.
// Called by the chapter watchdog background function.
// POST /api/pagecub/retry/[sfRunId]/[chapterNum]

export const maxDuration = 26;

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MS_KEY         = process.env.MINDSTUDIO_API_KEY!;
const CHAPTER_ID     = process.env.STORYFORGE_CHAPTER_AGENT_ID!;
const RETRY_SECRET   = process.env.STORYFORGE_RETRY_SECRET || "storyforge-retry-2026";
const APP_URL        = process.env.APP_URL || "https://pagecub.com";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sfRunId: string; chapterNum: string }> }
) {
  const { sfRunId, chapterNum } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.secret !== RETRY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: sfRun } = await admin
    .from("sf_runs")
    .select("id, status, chapters, chapter_count, input_payload, charachter_bible, visual_bible, story, chapter_outline, cast_registry")
    .eq("id", sfRunId)
    .single();

  if (!sfRun) return NextResponse.json({ error: "sf_run not found" }, { status: 404 });

  if (["done", "failed", "foundation_pending"].includes(sfRun.status)) {
    return NextResponse.json({ error: `Cannot retry — sf_run status: ${sfRun.status}` }, { status: 400 });
  }

  const chapters = (sfRun.chapters ?? {}) as Record<string, { text_1?: string; failed?: boolean }>;
  const existing = chapters[chapterNum];

  // Skip if chapter already succeeded
  if (existing?.text_1 && !existing?.failed) {
    return NextResponse.json({ ok: true, note: "already succeeded" });
  }

  const ip     = (sfRun.input_payload ?? {}) as Record<string, unknown>;
  const toStr  = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");

  // Clear existing failed entry so callback idempotency guard allows it through
  const updated = { ...chapters };
  delete updated[chapterNum];
  await admin.from("sf_runs").update({
    chapters:      updated,
    chapters_done: Object.values(updated).filter((c) => c.text_1 && !c.failed).length,
  }).eq("id", sfRunId);

  const callbackUrl = `${APP_URL}/api/pagecub/callback/chapter/${sfRunId}/${chapterNum}`;

  const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
    method:  "POST",
    headers: { Authorization: `Bearer ${MS_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      appId:    CHAPTER_ID,
      workflow: "Main",
      callbackUrl,
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
    const detail = await msRes.text().catch(() => "");
    return NextResponse.json({ ok: false, error: `MindStudio ${msRes.status}: ${detail.slice(0, 100)}` }, { status: 500 });
  }

  const msData = await msRes.json().catch(() => ({}));
  return NextResponse.json({ ok: true, sfRunId, chapterNum, threadId: msData.threadId });
}
