import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
import { NextRequest, NextResponse } from "next/server";

const APP_URL          = process.env.APP_URL          || "https://pagecub.com";
const DOCRAPTOR_API_KEY = process.env.DOCRAPTOR_API_KEY!;

// ─── Resolve @@remote_variable@@ pointers from MindStudio Large File Storage ─

async function resolveRemoteVariable(value: unknown): Promise<string> {
  const str = String(value ?? "").trim();
  if (str.startsWith("@@remote_variable@@")) {
    const url = str.slice("@@remote_variable@@".length).trim();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`remote_variable fetch failed: ${url} → ${res.status}`);
    return await res.text();
  }
  return str;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

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
    .select("id, tool_run_id, status, chapters")
    .eq("id", sfRunId)
    .single();

  if (sfRunError || !sfRun) {
    console.error("[storyforge/pdf] sf_run not found:", sfRunId);
    return NextResponse.json({ ok: false, note: "sf_run not found" });
  }

  // Idempotency — already handed off to DocRaptor or fully done
  if (["done", "failed", "docraptor_pending", "docraptor_failed"].includes(sfRun.status)) {
    console.log("[storyforge/pdf] already processed:", sfRunId, sfRun.status);
    return NextResponse.json({ ok: true, note: "already_processed" });
  }

  // Agent 3B explicit failure
  if (body.success === false) {
    console.error("[storyforge/pdf] Agent 3B success:false for sfRun:", sfRunId);
    await finalizeWithoutPdf(admin, sfRun, "agent_3b_failed");
    return NextResponse.json({ ok: false, note: "agent_3b_failed_fallback" });
  }

  const result = (body.result ?? {}) as Record<string, unknown>;

  // ── Resolve book_html (may be @@remote_variable@@) ────────────────────────
  let bookHtml: string;
  try {
    bookHtml = await resolveRemoteVariable(
      result["book_html"] ?? result["book_html_url"] ?? ""
    );
  } catch (err) {
    console.error("[storyforge/pdf] failed to resolve book_html:", err);
    await finalizeWithoutPdf(admin, sfRun, "book_html_resolve_failed");
    return NextResponse.json({ ok: false, note: "book_html_resolve_failed" });
  }

  if (!bookHtml || !bookHtml.trim().startsWith("<")) {
    console.error("[storyforge/pdf] book_html missing or invalid. result keys:", Object.keys(result));
    await finalizeWithoutPdf(admin, sfRun, "no_book_html");
    return NextResponse.json({ ok: false, note: "no_book_html" });
  }

  // Inject Prince image magic CSS for belt-and-suspenders image compression
  // Primary compression is done upstream by the image optimizer background function
  const princeMagicStyle = `<style>
  img { -prince-image-magic: recompress-jpeg(85%) convert-to-jpeg(85%); }
  * { -prince-image-magic: recompress-jpeg(85%) convert-to-jpeg(85%); }
  </style>`;
  bookHtml = bookHtml.includes("</head>")
    ? bookHtml.replace("</head>", `${princeMagicStyle}\n</head>`)
    : princeMagicStyle + bookHtml;

  // Extract validation metadata
  const validationStatus   = String(result["validation_status"]   ?? "").trim() || null;
  const validationErrors   = String(result["validation_errors"]   ?? "").trim() || null;
  const validationWarnings = String(result["validation_warnings"] ?? "").trim() || null;

  // Store validation data + set status = docraptor_pending
  await admin.from("sf_runs").update({
    status:              "docraptor_pending",
    validation_status:   validationStatus,
    validation_errors:   validationErrors,
    validation_warnings: validationWarnings,
  }).eq("id", sfRunId);

  // ── Dispatch to DocRaptor async ───────────────────────────────────────────
  // No callback_url — background function polls DocRaptor directly to avoid test-mode URL expiry race condition

  let docraptorStatusId: string | null = null;
  try {
    const drRes = await fetch("https://docraptor.com/docs", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${Buffer.from(`${DOCRAPTOR_API_KEY}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        user_credentials: DOCRAPTOR_API_KEY,
        doc: {
          test:             process.env.DOCRAPTOR_TEST_MODE !== "false", // default test=true until explicitly disabled
          type:             "pdf",
          async:            true,
          name:             `pagecub-${sfRunId}-interior.pdf`,
          document_content: bookHtml,
          prince_options: {
            media:       "print",
            input:       "html",
            http_timeout: 60,
            css_dpi:     96,
          },
        },
      }),
    });

    if (!drRes.ok) {
      const errText = await drRes.text().catch(() => "");
      console.error(`[storyforge/pdf] DocRaptor dispatch failed: ${drRes.status} — ${errText.slice(0, 300)}`);
      await finalizeWithoutPdf(admin, sfRun, `docraptor_dispatch_failed:${drRes.status}`);
      return NextResponse.json({ ok: false, note: "docraptor_dispatch_failed" });
    }

    const drBody = await drRes.json() as Record<string, unknown>;
    docraptorStatusId = String(drBody.status_id ?? drBody.id ?? "").trim() || null;
  } catch (err) {
    console.error("[storyforge/pdf] DocRaptor dispatch threw:", err);
    await finalizeWithoutPdf(admin, sfRun, `docraptor_dispatch_threw:${String(err).slice(0, 200)}`);
    return NextResponse.json({ ok: false, note: "docraptor_dispatch_threw" });
  }

  if (!docraptorStatusId) {
    console.error("[storyforge/pdf] DocRaptor returned no status_id");
    await finalizeWithoutPdf(admin, sfRun, "no_docraptor_status_id");
    return NextResponse.json({ ok: false, note: "no_docraptor_status_id" });
  }

  // Store status_id
  await admin.from("sf_runs").update({
    docraptor_status_id: docraptorStatusId,
  }).eq("id", sfRunId);

  // Trigger background function to poll DocRaptor + download + upload + email
  // MUST be awaited — fire-and-forget fetch is killed when Lambda freezes on response return
  // Background functions respond 202 immediately so this adds <1s latency
  await fetch(`${APP_URL}/.netlify/functions/storyforge-pdf-download-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sfRunId,
      toolRunId:       sfRun.tool_run_id,
      docraptorStatusId,
    }),
  }).catch(err => console.warn("[storyforge/pdf] bg fn trigger failed:", err));

  console.log(`[storyforge/pdf] DocRaptor dispatched, bg fn triggered — sfRunId: ${sfRunId}, status_id: ${docraptorStatusId}`);
  return NextResponse.json({ ok: true, docraptor_status_id: docraptorStatusId });
}

// ─── Fallback: finalize run without PDF (chapters still available) ────────────

async function finalizeWithoutPdf(
  admin: any,
  sfRun: { id: string; tool_run_id: string; chapters: unknown },
  reason: string,
) {
  await admin.from("sf_runs").update({
    status:          "done",
    packaging_error: reason,
    completed_at:    new Date().toISOString(),
  }).eq("id", sfRun.id);

  await admin.from("tool_runs").update({
    status:         "done",
    output_payload: buildFlatOutputPayload(sfRun.chapters),
    completed_at:   new Date().toISOString(),
  }).eq("id", sfRun.tool_run_id);

  console.log(`[storyforge/pdf] finalized without PDF — sfRunId: ${sfRun.id}, reason: ${reason}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ChapterEntry = {
  title: string; summary: string; text_1: string; text_2: string;
  text_1_word_count: number; text_2_word_count: number;
  total_word_count: number; image_1: string; image_2: string;
};

function buildFlatOutputPayload(chapters: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [num, ch] of Object.entries((chapters ?? {}) as Record<string, ChapterEntry>)) {
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
