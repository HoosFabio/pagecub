"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpenCheck, Download, Loader2 } from "lucide-react";

type StatusResponse = {
  status?: string;
  stage?: string;
  downloadUrl?: string;
  book_title?: string;
  message?: string;
};

const stages = [
  "Building the story world",
  "Writing the chapters",
  "Creating the illustrations",
  "Preparing the book pages",
  "Assembling your storybook",
  "Ready to view",
];

const TERMINAL = ["done", "failed"];

export function StatusClient({ token }: { token: string }) {
  const [data, setData]   = useState<StatusResponse>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res     = await fetch(`/api/pagecub/status/${token}`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.message || "We could not load this book status.");
        if (alive) { setData(payload); setError(""); }
        // Stop polling once terminal
        if (TERMINAL.includes(payload?.status)) interval && clearInterval(interval);
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Could not load status.");
      }
    }

    load();
    let interval: ReturnType<typeof setInterval> | null = setInterval(load, 5000);
    return () => {
      alive = false;
      if (interval) clearInterval(interval);
    };
  }, [token]);

  const isDone   = data.status === "done";
  const isFailed = data.status === "failed";

  const activeIndex = useMemo(() => {
    if (isDone) return stages.length - 1;
    if (data.stage) {
      const found = stages.findIndex(s => s.toLowerCase() === data.stage?.toLowerCase());
      if (found >= 0) return found;
    }
    return 0;
  }, [data.stage, isDone]);

  // ── Failed state ────────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-200 bg-card p-6 shadow-soft md:p-10">
        <div className="flex items-start gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-red-500">Something went wrong</p>
            <h1 className="display mt-2 text-4xl font-bold">Your book didn&apos;t generate</h1>
            <p className="mt-4 max-w-xl leading-7 text-ink/70">
              A technical error occurred during book generation. You have not been charged — your payment will be refunded automatically within 5–10 business days.
            </p>
            <p className="mt-3 text-sm text-ink/50">
              If you have questions, email us at{" "}
              <a href="mailto:lumen@inksynth.org" className="font-bold text-ink/70 underline">lumen@inksynth.org</a>{" "}
              with the reference: <span className="font-mono text-xs">{token}</span>
            </p>
            <div className="mt-8">
              <Link
                href="/create"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button"
              >
                Try again
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── In-progress / done ────────────────────────────────────────────────────
  return (
    <section className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-card p-6 shadow-soft md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-bold text-sage">Your PageCub book</p>
          <h1 className="display mt-3 text-4xl font-bold md:text-5xl">
            {isDone ? (data.book_title || "Your book is ready") : "Being created…"}
          </h1>
          {!isDone && (
            <p className="mt-4 max-w-2xl leading-7 text-ink/72">
              Your story is being written and illustrated right now. This usually takes 15–20 minutes.
              A confirmation email was sent to you — the download link will arrive there too when it&apos;s ready.
            </p>
          )}
          {isDone && (
            <p className="mt-4 max-w-2xl leading-7 text-ink/72">
              Your personalized illustrated storybook is complete. Download it below — a copy was also sent to your email.
            </p>
          )}
        </div>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-honey/25">
          {isDone
            ? <BookOpenCheck className="h-8 w-8 text-ink" aria-hidden="true" />
            : <Loader2 className="h-8 w-8 animate-spin text-ink" aria-hidden="true" />
          }
        </span>
      </div>

      {error && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
      )}

      <div className="mt-10 grid gap-4">
        {stages.map((stage, index) => {
          const complete = index < activeIndex || isDone;
          const active   = index === activeIndex && !isDone;
          return (
            <div key={stage} className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                complete ? "bg-sage text-white" : active ? "bg-honey text-ink" : "bg-card text-ink/45"
              }`}>
                {complete ? "✓" : index + 1}
              </span>
              <p className={`font-bold ${active || complete ? "text-ink" : "text-ink/45"}`}>{stage}</p>
              {active && <Loader2 className="ml-auto h-4 w-4 animate-spin text-honey" aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      {isDone && data.downloadUrl && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={data.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download your book
          </Link>
        </div>
      )}

      {!isDone && (
        <p className="mt-8 text-center text-xs text-ink/40">
          This page updates automatically every few seconds. You can close it — the download link will arrive by email.
        </p>
      )}
    </section>
  );
}
