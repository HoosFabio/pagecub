import Link from "next/link";

const footerLinks = [
  { href: "/samples", label: "Samples" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About & safety" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" }
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-card/70">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="display text-2xl font-bold">PageCub</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink/70">
            Personalized illustrated storybooks for families, birthdays, milestones, and everyday bravery.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink/75">Print fulfillment coming soon.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink/70 md:justify-end">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
