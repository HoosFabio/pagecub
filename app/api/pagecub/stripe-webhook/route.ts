import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET      = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SEC = process.env.STRIPE_WEBHOOK_SECRET!;
const MINDSTUDIO_KEY     = process.env.MINDSTUDIO_API_KEY!;
const FOUNDATION_ID      = process.env.STORYFORGE_FOUNDATION_AGENT_ID!;
const MAILERSEND_KEY     = process.env.MAILERSEND_API_KEY!;
const APP_URL            = process.env.APP_URL || "https://pagecub.com";

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2023-10-16" });

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SEC);
  } catch (err) {
    console.error("[pagecub/stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId     = session.metadata?.order_id;
    const statusToken = session.metadata?.status_token;

    if (!orderId) {
      console.error("[pagecub/stripe-webhook] missing order_id in metadata");
      return NextResponse.json({ ok: false });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Fetch order + input payload
    const { data: order, error: orderErr } = await admin
      .from("pagecub_orders")
      .select("id, email, input_payload, status_token")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("[pagecub/stripe-webhook] order fetch failed:", orderErr);
      return NextResponse.json({ ok: false });
    }

    // Idempotency check — don't fire twice
    if (order.status !== "pending_payment") {
      console.log("[pagecub/stripe-webhook] order already processed, skipping:", orderId);
      return NextResponse.json({ ok: true, note: "already_processed" });
    }

    // Update order: paid
    await admin.from("pagecub_orders").update({
      status:                  "paid",
      stripe_session_id:       session.id,
      stripe_payment_intent:   String(session.payment_intent ?? ""),
      amount_paid:             session.amount_total ?? 0,
      currency:                session.currency ?? "usd",
    }).eq("id", orderId);

    // Create tool_run
    const { data: toolRun } = await admin.from("tool_runs").insert({
      tool_slug:       "storyforge",
      status:          "processing",
      input_payload:   order.input_payload,
      credits_charged: 0,
    }).select("id").single();

    if (!toolRun) {
      console.error("[pagecub/stripe-webhook] tool_run insert failed");
      await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", orderId);
      return NextResponse.json({ ok: false });
    }

    // Create sf_run
    const { data: sfRun } = await admin.from("sf_runs").insert({
      tool_run_id:   toolRun.id,
      status:        "pending",
      input_payload: order.input_payload,
    }).select("id").single();

    if (!sfRun) {
      console.error("[pagecub/stripe-webhook] sf_run insert failed");
      await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", orderId);
      return NextResponse.json({ ok: false });
    }

    // Link order to runs
    await admin.from("pagecub_orders").update({
      tool_run_id: toolRun.id,
      sf_run_id:   sfRun.id,
      status:      "generating",
    }).eq("id", orderId);

    // Dispatch Foundation Agent
    const ip       = order.input_payload as Record<string, unknown>;
    const callbackUrl = `${APP_URL}/api/pagecub/callback/foundation/${sfRun.id}`;

    const toStr = (v: unknown) => Array.isArray(v) ? v.join(", ") : String(v ?? "");

    try {
      const msRes = await fetch("https://v1.mindstudio-api.com/developer/v2/apps/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${MINDSTUDIO_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          appId:       FOUNDATION_ID,
          workflow:    "Main",
          callbackUrl,
          variables: {
            run_id:                  sfRun.id,
            charachter_name:         ip.charachter_name         ?? "",
            gender:                  ip.gender                  ?? "",
            age:                     String(ip.age              ?? ""),
            charachter_bio:          ip.charachter_bio          ?? "",
            charachter_desc:         ip.charachter_desc         ?? "",
            supporting_charachters:  ip.supporting_charachters  ?? "",
            world_setting:           ip.world_setting           ?? "",
            world_theme:             toStr(ip.world_theme),
            time_era:                ip.time_era                ?? "",
            artistic_style:          ip.artistic_style          ?? "",
            structure:               ip.structure               ?? "Linear 3-act plot",
            problem:                 ip.problem                 ?? "",
            moral:                   ip.moral                   ?? "",
            relevant_struggles:      toStr(ip.relevant_struggles),
          },
        }),
      });

      if (!msRes.ok) {
        const detail = await msRes.text().catch(() => "");
        console.error(`[pagecub/stripe-webhook] MindStudio dispatch failed ${msRes.status}: ${detail.slice(0, 200)}`);
        await admin.from("sf_runs").update({ status: "failed" }).eq("id", sfRun.id);
        await admin.from("pagecub_orders").update({ status: "failed" }).eq("id", orderId);
        return NextResponse.json({ ok: false, note: "mindstudio_dispatch_failed" });
      }

      await admin.from("sf_runs").update({ status: "foundation_pending" }).eq("id", sfRun.id);
      console.log(`[pagecub/stripe-webhook] Foundation dispatched — orderId: ${orderId}, sfRunId: ${sfRun.id}`);
    } catch (err) {
      console.error("[pagecub/stripe-webhook] MindStudio dispatch threw:", err);
    }

    // Send confirmation email
    const token = statusToken ?? order.status_token;
    const statusLink = `${APP_URL}/status/${token}`;
    const childName  = String(ip.charachter_name ?? "your child");

    try {
      await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: { Authorization: `Bearer ${MAILERSEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    { email: "lumen@inksynth.org", name: "PageCub" },
          to:      [{ email: order.email }],
          subject: `${childName}'s story is being created`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#243044">
              <h1 style="font-size:22px;margin-bottom:8px">We're writing ${childName}'s story ✨</h1>
              <p style="color:#6b7280;margin-bottom:24px">Your order is confirmed and the story is being built right now. It usually takes about 15–20 minutes.</p>
              <a href="${statusLink}" style="display:inline-block;background:#E8A84F;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-weight:bold;font-size:15px">Check your book status →</a>
              <p style="margin-top:32px;font-size:12px;color:#9ca3af">You'll receive another email when your PDF is ready to download. Keep this email as your access link.<br><br>Questions? Reply to this email or contact us at lumen@inksynth.org</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error("[pagecub/stripe-webhook] confirmation email failed:", err);
      // Non-fatal — order is still processing
    }
  }

  return NextResponse.json({ ok: true });
}
