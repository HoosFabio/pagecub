import { ShieldCheck } from "lucide-react";
import { aureliaCopy } from "@/lib/content";

export default function AboutPage() {
  return (
    <main className="page-shell py-14">
      <p className="font-bold text-sage">About & safety</p>
      <h1 className="display mt-3 max-w-3xl text-5xl font-bold">A warm storybook experience built for families.</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/72">{aureliaCopy}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ["Permission matters", "PageCub asks you to confirm you are the parent or guardian, or have permission to create the book."],
          ["Family details stay focused", "The form asks only for details that help shape the storybook."],
          ["Preview first", "You can review the finished book before ordering any printed copy. Print fulfillment coming soon."]
        ].map(([title, text]) => (
          <section key={title} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <ShieldCheck className="h-7 w-7 text-sage" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">{title}</h2>
            <p className="mt-3 leading-7 text-ink/70">{text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
