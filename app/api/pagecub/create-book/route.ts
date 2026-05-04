import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// TEMPORARY: Stripe disabled for pipeline testing.
// Auth is a single shared password. Re-enable Stripe once pipeline is confirmed reliable.

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MS_KEY        = process.env.MINDSTUDIO_API_KEY!;
const FOUNDATION_ID = process.env.STORYFORGE_FOUNDATION_AGENT_ID!;
const MAILERSEND_KEY = process.env.MAILERSEND_API_KEY!;
const APP_URL       = process.env.APP_URL || "https://pagecub.com";

const ACCESS_PASSWORD = "InkSynth2026!";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  // ── Password check ──────────────────────────────────────────────────────────
  if (body.password !== ACCESS_PASSWORD) {
    return NextResponse.json({ message: "Incorrect access code." }, { status: 401 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ message: "Email address is required." }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // ── Create order ────────────────────────────────────────────────────────────
  const statusToken = randomUUID();
  const inputPayload = { ...body };
  delete inputPayload.password; // never store the password

  const { data: order, error: orderErr } = await admin
    .from("pagecub_orders")
    .insert({
      email,
      status:        "paid",       // skip payment flow
      status_token:  statusToken,
      amount_paid:   0,
      currency:      "usd",
      input_payload: inputPayload,
    })
    .select("id, status_token")
    .single();

  if (orderErr || !order) {
    console.error("[pagecub/create-book] order insert failed:", orderErr);
    return NextResponse.json({ message: "Could not create your order. Please try again." }, { status: 500 });
  }

  // ── Create sf_run ───────────────────────────────────────────────────────────
  const { data: sfRun, error: sfRunErr } = await admin
    .from("sf_runs")
    .insert({
      status:        "foundation_pending",
      input_payload: inputPayload,
    })
    .select("id")
    .single();

  if (sfRunErr || !sfRun) {
    console.error("[pagecub/create-book] sf_run insert failed:", sfRunErr);
    await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ message: "Could not start book generation. Please try again." }, { status: 500 });
  }

  // Link sf_run to order
  await admin.from("pagecub_orders").update({
    sf_run_id: sfRun.id,
    status:    "generating",
  }).eq("id", order.id);

  // ── Dispatch Foundation Agent ───────────────────────────────────────────────
  const toStr = (v: unknown) => Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
  const ip = inputPayload as Record<string, unknown>;
  const callbackUrl = `${APP_URL}/api/pagecub/callback/foundation/${sfRun.id}`;

  try {
    const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
      method:  "POST",
      headers: { Authorization: `Bearer ${MS_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        appId:    FOUNDATION_ID,
        workflow: "Main",
        callbackUrl,
        variables: {
          run_id:                 sfRun.id,
          charachter_name:        ip.charachter_name         ?? "",
          gender:                 ip.gender                  ?? "",
          age:                    String(ip.age              ?? ""),
          charachter_bio:         ip.charachter_bio          ?? "",
          charachter_desc:        ip.charachter_desc         ?? "",
          supporting_charachters: ip.supporting_charachters  ?? "",
          world_setting:          ip.world_setting           ?? "",
          world_theme:            toStr(ip.world_theme),
          time_era:               ip.time_era                ?? "",
          artistic_style:         ip.artistic_style          ?? "",
          structure:              ip.structure               ?? "Linear 3-act plot",
          problem:                ip.problem                 ?? "",
          moral:                  ip.moral                   ?? "",
          relevant_struggles:     toStr(ip.relevant_struggles),
        },
      }),
    });

    if (!msRes.ok) {
      const detail = await msRes.text().catch(() => "");
      console.error(`[pagecub/create-book] MindStudio dispatch failed ${msRes.status}: ${detail.slice(0, 200)}`);
      await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRun.id);
      await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", order.id);
      return NextResponse.json({ message: "Could not start book generation. Please try again." }, { status: 500 });
    }

    console.log(`[pagecub/create-book] Foundation dispatched — orderId: ${order.id}, sfRunId: ${sfRun.id}`);
  } catch (err) {
    console.error("[pagecub/create-book] MindStudio dispatch threw:", err);
    await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ message: "Could not start book generation. Please try again." }, { status: 500 });
  }

  // ── Confirmation email ──────────────────────────────────────────────────────
  const statusLink = `${APP_URL}/status/${statusToken}`;
  const childName  = String(ip.charachter_name ?? "your character");

  try {
    await fetch("https://api.mailersend.com/v1/email", {
      method:  "POST",
      headers: { Authorization: `Bearer ${MAILERSEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { email: "lumen@inksynth.org", name: "PageCub" },
        to:   [{ email }],
        subject: `${childName}'s story is being made ✨`,
        html: `
          <div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;padding:40px 24px;color:#243044">
            <h1 style="font-size:26px;margin-bottom:8px;font-weight:bold">We're writing ${childName}'s story ✨</h1>
            <p style="color:#6b7280;font-size:15px;margin-bottom:28px;line-height:1.7">Your book is being built right now. It usually takes about 15–20 minutes.</p>
            <a href="${statusLink}" style="display:inline-block;background:#E8A84F;color:#243044;padding:14px 32px;border-radius:99px;text-decoration:none;font-weight:bold;font-size:15px;font-family:sans-serif">Watch the progress →</a>
            <p style="margin-top:32px;font-size:13px;color:#9ca3af;line-height:1.7">
              You'll receive another email as soon as your PDF is ready.<br>
              Questions? <a href="mailto:lumen@inksynth.org" style="color:#9ca3af">lumen@inksynth.org</a>
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[pagecub/create-book] confirmation email failed (non-fatal):", err);
  }

  return NextResponse.json({
    url: `${APP_URL}/status/${statusToken}`,
    statusToken,
  });
}
