"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Download, Eye, Loader2 } from "lucide-react";

type StatusResponse = {
  status?: string;
  stage?: string;
  previewUrl?: string;
  downloadUrl?: string;
  message?: string;
};

const stages = [
  "Building the story world",
  "Writing the chapters",
  "Creating the illustrations",
  "Preparing the book pages",
  "Assembling your storybook",
  "Ready to view"
];

export function StatusClient({ token }: { token: string }) {
  const [data, setData] = useState<StatusResponse>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch(`/api/pagecub/status/${token}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || "We could not load this book status.");
        if (alive) {
          setData(payload);
          setError("");
        }
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "We could not load this book status.");
      }
    }

    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [token]);

  const isDone = data.status === "done";
  const activeIndex = useMemo(() => {
    if (isDone) return stages.length - 1;
    if (data.stage) {
      const found = stages.findIndex((stage) => stage.toLowerCase() === data.stage?.toLowerCase());
      if (found >= 0) return found;
    }
    return 1;
  }, [data.stage, isDone]);

  return (
    <section className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-card p-6 shadow-soft md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-bold text-sage">Your PageCub book</p>
          <h1 className="display mt-3 text-4xl font-bold md:text-5xl">{isDone ? "Ready to view" : "Your book is being created"}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-ink/72">Your book is being created. This can take 15-20 minutes.</p>
        </div>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-honey/25">
          {isDone ? <BookOpenCheck className="h-8 w-8 text-ink" aria-hidden="true" /> : <Loader2 className="h-8 w-8 animate-spin text-ink" aria-hidden="true" />}
        </span>
      </div>

      {error && <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

      <div className="mt-10 grid gap-4">
        {stages.map((stage, index) => {
          const complete = index < activeIndex || isDone;
          const active = index === activeIndex && !isDone;
          return (
            <div key={stage} className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  complete ? "bg-sage text-white" : active ? "bg-honey text-ink" : "bg-card text-ink/45"
                }`}
              >
                {index + 1}
              </span>
              <p className={`font-bold ${active || complete ? "text-ink" : "text-ink/45"}`}>{stage}</p>
            </div>
          );
        })}
      </div>

      {isDone && (
        <div className="mt-8 flex flex-wrap gap-3">
          {data.previewUrl && (
            <Link href={data.previewUrl} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button">
              <Eye className="h-4 w-4" aria-hidden="true" />
              View
            </Link>
          )}
          {data.downloadUrl && (
            <Link href={data.downloadUrl} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-card px-6 py-3 text-sm font-bold">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
