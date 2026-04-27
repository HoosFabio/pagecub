import Link from "next/link";
import { BookOpen } from "lucide-react";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/samples", label: "Samples" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur">
      <nav className="page-shell flex min-h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-bold text-ink" aria-label="PageCub home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-honey text-ink shadow-sm">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="display text-2xl">PageCub</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-ink/75 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
        <Link
          href="/create"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
        >
          Start a Book
        </Link>
      </nav>
    </header>
  );
}
