import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PageCub Blog — Personalized Children's Books, Gift Ideas & Parenting Stories",
  description: "Ideas, guides, and stories for parents and gift-givers looking for something more meaningful than a name on a template.",
};

const posts = [
  {
    slug: "personalized-birthday-gift-for-kids",
    title: "Why a Custom Storybook Is the Most Meaningful Birthday Gift for a Child",
    excerpt: "Gifts that get forgotten by Tuesday. Books that get read for years. Here's why a personalized storybook lands differently — and how to make one that fits.",
    date: "April 27, 2026",
  },
  {
    slug: "personalized-book-for-grandchildren",
    title: "Personalized Books for Grandchildren: A Gift Grandparents Actually Love Giving",
    excerpt: "Grandparents want to give something that matters. Here's why a book built around your grandchild — their name, their world, their story — is the one they'll remember.",
    date: "April 27, 2026",
  },
];

export default function BlogPage() {
  return (
    <>
      <main className="page-shell py-16">
        <p className="font-bold text-sage text-sm uppercase tracking-widest mb-4">PageCub Blog</p>
        <h1 className="display text-5xl font-bold mb-3">Stories about stories.</h1>
        <p className="text-ink/65 text-lg leading-8 mb-12 max-w-xl">Ideas for parents and gift-givers. How to make a book that actually fits the child it&apos;s for.</p>

        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="rounded-2xl border border-line bg-card p-7 hover:-translate-y-1 transition group">
              <p className="text-xs font-bold text-sage/70 mb-3">{post.date}</p>
              <h2 className="display text-2xl font-bold group-hover:text-honey transition mb-3">{post.title}</h2>
              <p className="text-sm text-ink/65 leading-6">{post.excerpt}</p>
              <p className="mt-5 text-sm font-bold text-honey">Read →</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
