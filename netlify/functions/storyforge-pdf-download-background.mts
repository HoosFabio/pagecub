/**
 * StoryForge PDF Download — Netlify Background Function
 * Responds 202 immediately (Netlify behavior for -background functions).
 * Then:
 *   1. Polls DocRaptor status every 30s until completed or failed (up to 10 min)
 *   2. Downloads PDF immediately when completed (no URL expiry race)
 *   3. Uploads to Supabase Storage (pdfs bucket)
 *   4. Finalizes sf_runs + tool_runs
 *   5. Sends email with PDF attached
 *
 * Trigger: POST /.netlify/functions/storyforge-pdf-download-background
 * Body: { sfRunId, toolRunId, docraptorStatusId }
 *
 * Background functions run up to 15 minutes — polling loop is safe.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_KEY!;
const DOCRAPTOR_API_KEY  = process.env.DOCRAPTOR_API_KEY!;
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY!;
const PDF_BUCKET         = "pdfs";
const FROM_EMAIL         = "lumen@inksynth.org";
const FROM_NAME          = "PageCub";

const POLL_INTERVAL_MS = 20_000; // 20 seconds between polls
const MAX_POLLS        = 30;     // 30 × 20s = 10 minutes max

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Netlify background function — no Response return; filename -background suffix = 202 + async execution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async (req: Request) => {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { sfRunId, toolRunId, docraptorStatusId } = body as {
    sfRunId: string;
    toolRunId: string;
    docraptorStatusId: string;
  };

  if (!sfRunId || !docraptorStatusId) {
    console.error("[storyforge/pdf-bg] missing sfRunId or docraptorStatusId");
    return;
  }

  try {
    await runBackground(sfRunId, toolRunId, docraptorStatusId);
  } catch (err) {
    console.error("[storyforge/pdf-bg] unhandled error:", err);
  }
};

export const config = { path: "/.netlify/functions/storyforge-pdf-download-background" };

// ─── Background work ──────────────────────────────────────────────────────────

async function runBackground(sfRunId: string, toolRunId: string, docraptorStatusId: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Heartbeat #1 — proves bg fn started and Supabase is reachable
  await admin.from("sf_runs").update({ packaging_status: "bg_polling" }).eq("id", sfRunId);
  console.log(`[storyforge/pdf-bg] started — sfRunId: ${sfRunId}, statusId: ${docraptorStatusId}`);

  // ── Poll DocRaptor until completed ─────────────────────────────────────
  let downloadUrl: string | null = null;
  let pageCount: number | null   = null;

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    if (poll > 0) {
      await sleep(POLL_INTERVAL_MS);
      // Heartbeat after each sleep — if packaging_status stops incrementing, fn was killed
      await admin.from("sf_runs").update({ packaging_status: `bg_poll_${poll}` }).eq("id", sfRunId);
    }

    let statusRes: Record<string, unknown>;
    try {
      const res = await fetch(`https://docraptor.com/status/${docraptorStatusId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${DOCRAPTOR_API_KEY}:`).toString("base64")}`,
        },
      });
      statusRes = await res.json() as Record<string, unknown>;
    } catch (err) {
      console.warn(`[storyforge/pdf-bg] poll ${poll} fetch failed:`, err);
      continue;
    }

    const status = String(statusRes.status ?? "").toLowerCase();
    console.log(`[storyforge/pdf-bg] poll ${poll}: status=${status} — sfRunId: ${sfRunId}`);

    if (status === "completed") {
      downloadUrl = String(statusRes.download_url ?? "").trim();
      pageCount   = typeof statusRes.number_of_pages === "number" ? statusRes.number_of_pages : null;
      break;
    }

    if (status === "failed") {
      console.error("[storyforge/pdf-bg] DocRaptor render failed:", statusRes.validation_errors);
      await admin.from("sf_runs").update({
        status:           "done",
        packaging_status: "docraptor_failed",
        packaging_error:  JSON.stringify(statusRes.validation_errors ?? {}).slice(0, 500),
        docraptor_status: "failed",
        completed_at:     new Date().toISOString(),
      }).eq("id", sfRunId);
      await finalizeToolRun(admin, sfRunId, toolRunId);
      return;
    }
    // queued / working — keep polling
  }

  if (!downloadUrl) {
    console.error("[storyforge/pdf-bg] timed out waiting for DocRaptor completion");
    await admin.from("sf_runs").update({
      status:           "done",
      packaging_status: "docraptor_timeout",
      packaging_error:  "background fn timed out polling DocRaptor",
      completed_at:     new Date().toISOString(),
    }).eq("id", sfRunId);
    await finalizeToolRun(admin, sfRunId, toolRunId);
    return;
  }

  // ── Download PDF immediately (no delay) ────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    const pdfRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${DOCRAPTOR_API_KEY}:`).toString("base64")}`,
      },
    });
    if (!pdfRes.ok) throw new Error(`HTTP ${pdfRes.status}`);
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    if (pdfBuffer.length === 0) throw new Error("empty PDF — test doc may allow only one download");
    console.log(`[storyforge/pdf-bg] downloaded ${pdfBuffer.length} bytes — sfRunId: ${sfRunId}`);
  } catch (err) {
    console.error("[storyforge/pdf-bg] PDF download failed:", err);
    await admin.from("sf_runs").update({
      status:           "done",
      packaging_status: "pdf_download_failed",
      packaging_error:  String(err).slice(0, 300),
      docraptor_status: "completed",
      completed_at:     new Date().toISOString(),
    }).eq("id", sfRunId);
    await finalizeToolRun(admin, sfRunId, toolRunId);
    return;
  }

  // ── Upload to Supabase Storage ──────────────────────────────────────────
  const storagePath = `pagecub/${sfRunId}/interior.pdf`;
  const { error: uploadError } = await admin.storage
    .from(PDF_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert:      true,
    });

  if (uploadError) {
    console.error("[storyforge/pdf-bg] Storage upload failed:", uploadError.message);
    await admin.from("sf_runs").update({
      status:           "done",
      packaging_status: "storage_upload_failed",
      packaging_error:  uploadError.message.slice(0, 300),
      docraptor_status: "completed",
      completed_at:     new Date().toISOString(),
    }).eq("id", sfRunId);
    await finalizeToolRun(admin, sfRunId, toolRunId);
    return;
  }

  // Get public URL
  const { data: publicUrlData } = admin.storage.from(PDF_BUCKET).getPublicUrl(storagePath);
  const interiorPdfUrl = publicUrlData?.publicUrl ?? "";

  // ── Finalize ────────────────────────────────────────────────────────────
  await admin.from("sf_runs").update({
    status:               "done",
    interior_pdf_url:     interiorPdfUrl,
    pdf_url:              interiorPdfUrl,
    packaging_status:     "pdf_generated",
    docraptor_status:     "completed",
    docraptor_page_count: pageCount,
    expected_page_count:  48,
    pod_package_id:       "0850X0850.FC.PRE.CW.080CW444.MXX",
    completed_at:         new Date().toISOString(),
  }).eq("id", sfRunId);

  await finalizeToolRun(admin, sfRunId, toolRunId, interiorPdfUrl);

  // ── Update pagecub_orders status + send delivery email ─────────────────
  const { data: order } = await admin
    .from("pagecub_orders")
    .select("id, email")
    .eq("sf_run_id", sfRunId)
    .single();

  if (order) {
    await admin.from("pagecub_orders").update({ status: "done" }).eq("id", order.id);

    const { data: sfRun } = await admin
      .from("sf_runs")
      .select("book_title, matter, input_payload")
      .eq("id", sfRunId)
      .single();

    if (sfRun) {
      await sendBookEmail(order.email, sfRun, pdfBuffer, interiorPdfUrl).catch(
        err => console.error("[storyforge/pdf-bg] delivery email failed:", err)
      );
    }
  }

  console.log(`[storyforge/pdf-bg] ✓ done — sfRunId: ${sfRunId}, pages: ${pageCount}, url: ${interiorPdfUrl}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ChapterEntry = {
  title: string; summary: string; text_1: string; text_2: string;
  text_1_word_count: number; text_2_word_count: number;
  total_word_count: number; image_1: string; image_2: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeToolRun(admin: any, sfRunId: string, toolRunId: string | null | undefined, pdfUrl?: string) {
  // toolRunId is null for pagecub orders (no credit billing) — skip tool_runs update
  if (!toolRunId) {
    console.log(`[storyforge/pdf-bg] no toolRunId — skipping tool_runs finalize for sfRunId: ${sfRunId}`);
    return;
  }
  const { data: sfRun } = await admin.from("sf_runs").select("chapters").eq("id", sfRunId).single();
  const out: Record<string, string | number> = {};
  if (pdfUrl) out.pdf_url = pdfUrl;
  for (const [num, ch] of Object.entries((sfRun?.chapters ?? {}) as Record<string, ChapterEntry>)) {
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
  await admin.from("tool_runs").update({
    status: "done", output_payload: out, completed_at: new Date().toISOString(),
  }).eq("id", toolRunId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBookEmail(toEmail: string, sfRun: any, pdfBuffer: Buffer, pdfUrl: string) {
  if (!toEmail) { console.warn("[storyforge/pdf-bg] no delivery email provided"); return; }

  const ip        = (sfRun.input_payload ?? {}) as Record<string, string>;
  const matter    = (sfRun.matter        ?? {}) as Record<string, unknown>;
  const bookTitle = String(matter.book_title ?? sfRun.book_title ?? "Your Book");
  const childName = ip.charachter_name || "";
  const safeName  = bookTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  const subject = childName
    ? `${bookTitle} — ${childName}'s PageCub book is ready!`
    : `${bookTitle} — Your PageCub book is ready!`;

  // Attach PDF only if under 20MB — MailerSend limit is 25MB but leave headroom.
  // For larger files, include a direct download link instead.
  const ATTACH_LIMIT_BYTES = 20 * 1024 * 1024;
  const useAttachment = pdfBuffer.length <= ATTACH_LIMIT_BYTES;
  console.log(`[storyforge/pdf-bg] PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB — ${useAttachment ? "attaching" : "link-only (too large)"}`);

  const downloadSection = useAttachment
    ? `<p style="line-height:1.8;margin:24px 0;">Your personalized illustrated storybook is attached as a PDF. Open it on any device, share with family, or print at home.</p>`
    : `<p style="line-height:1.8;margin:24px 0;">Your personalized illustrated storybook is ready! Some larger books are too big to send as email attachments — click the button below to download yours directly.</p>
       <p style="margin:24px 0;"><a href="${pdfUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-family:Georgia,serif;">Download Your Book</a></p>
       <p style="font-size:12px;color:#999;margin-top:8px;">If the button doesn't work, copy this link into your browser: <a href="${pdfUrl}" style="color:#666;">${pdfUrl}</a></p>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
  <h1 style="font-size:28px;margin-bottom:8px;">✨ Your book is ready!</h1>
  <p style="font-size:18px;font-weight:bold;margin-bottom:4px;">${bookTitle}</p>
  ${childName ? `<p style="color:#666;margin-top:0;">A story made for ${childName}.</p>` : ""}
  ${downloadSection}
  <p style="line-height:1.8;">Print fulfillment coming soon — we'll let you know when hardcover ordering is available.</p>
  <p style="margin-top:32px;font-size:13px;color:#888;">Made with ❤️ by PageCub · <a href="https://pagecub.com" style="color:#888;">pagecub.com</a></p>
</body></html>`;

  const payload: Record<string, unknown> = {
    from: { email: FROM_EMAIL, name: FROM_NAME },
    to:   [{ email: toEmail }],
    subject, html,
  };

  if (useAttachment) {
    payload.attachments = [{
      filename:    `${safeName}.pdf`,
      content:     pdfBuffer.toString("base64"),
      disposition: "attachment",
    }];
  }

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { Authorization: `Bearer ${MAILERSEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`MailerSend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  console.log(`[storyforge/pdf-bg] email sent → ${toEmail} (${useAttachment ? "attached" : "link-only"})`);
}
