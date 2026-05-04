import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Maps sf_runs.status → human-readable stage label for the status page
const SF_STATUS_TO_STAGE: Record<string, string> = {
  foundation_pending:  "Building the story world",
  chapters_processing: "Writing the chapters",
  matter_pending:      "Creating the illustrations",
  pdf_pending:         "Assembling your storybook",
  docraptor_pending:   "Assembling your storybook",
  done:                "Ready to view",
  failed:              "Something went wrong",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ message: "Invalid token." }, { status: 400 });

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: order, error } = await admin
    .from("pagecub_orders")
    .select("id, status, sf_run_id")
    .eq("status_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  // If still pending payment — not started yet
  if (!order.sf_run_id) {
    return NextResponse.json({
      status:      order.status,
      stage:       "Building the story world",
      downloadUrl: null,
    });
  }

  const { data: sfRun } = await admin
    .from("sf_runs")
    .select("status, pdf_url, book_title")
    .eq("id", order.sf_run_id)
    .single();

  if (!sfRun) {
    return NextResponse.json({ status: order.status, stage: "Building the story world", downloadUrl: null });
  }

  const stage       = SF_STATUS_TO_STAGE[sfRun.status] ?? "Building the story world";
  const downloadUrl = sfRun.status === "done" && sfRun.pdf_url ? sfRun.pdf_url : null;

  return NextResponse.json({
    status:      sfRun.status === "done" ? "done" : sfRun.status === "failed" ? "failed" : "generating",
    stage,
    downloadUrl,
    book_title:  sfRun.book_title ?? null,
  });
}
