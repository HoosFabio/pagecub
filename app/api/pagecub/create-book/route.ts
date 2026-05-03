import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY!;
const STRIPE_PRICE  = process.env.STRIPE_PRICE_ID!;
const APP_URL       = process.env.APP_URL || "https://pagecub.com";

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2023-10-16" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, ...formInputs } = body;

    if (!email || !formInputs.charachter_name) {
      return NextResponse.json({ message: "Email and character name are required." }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Insert order row — status=pending_payment
    const { data: order, error: orderErr } = await admin
      .from("pagecub_orders")
      .insert({
        email,
        status: "pending_payment",
        input_payload: { email, ...formInputs },
      })
      .select("id, status_token")
      .single();

    if (orderErr || !order) {
      console.error("[pagecub/create-book] order insert failed:", orderErr);
      return NextResponse.json({ message: "Failed to start your order. Please try again." }, { status: 500 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE, quantity: 1 }],
      customer_email: email,
      success_url: `${APP_URL}/status/${order.status_token}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/create`,
      metadata: {
        order_id:     order.id,
        status_token: String(order.status_token),
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[pagecub/create-book] error:", err);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
