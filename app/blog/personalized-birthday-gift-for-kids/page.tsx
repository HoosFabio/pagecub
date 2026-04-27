import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Why a Custom Storybook Is the Most Meaningful Birthday Gift for a Child — PageCub",
  description: "Personalized children's books outlast toys and trinkets. Here's why a storybook built around your child is the birthday gift they'll actually remember.",
};

export default function BlogPost() {
  return (
    <>
      <main className="page-shell py-16 max-w-2xl">
        <p className="text-sm font-bold text-sage uppercase tracking-widest mb-4">PageCub Blog</p>
        <h1 className="display text-4xl font-bold leading-tight mb-4">Why a Custom Storybook Is the Most Meaningful Birthday Gift for a Child</h1>
        <p className="text-ink/50 text-sm mb-10">April 27, 2026</p>

        <div className="space-y-6 text-sm leading-8 text-ink/75">
          <p>
            Most birthday gifts are forgotten within a week. Toys lose their novelty. Clothes get outgrown. Gift cards disappear into a drawer. The things children actually hold onto — the ones that show up in the photos years later — tend to be the ones that felt made for them specifically.
          </p>
          <p>
            A personalized storybook is one of those things. Not because it has the child&apos;s name on the cover — that&apos;s table stakes, and most parents have seen that version — but because the right one is built around the child as a whole person. Their personality. Their fears. Their quirks. The thing they&apos;re working through right now.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">A name in a template isn&apos;t the same thing</h2>
          <p>
            There&apos;s a difference between a book that replaces a placeholder name with your child&apos;s and a book that was actually written around them. The first produces a story that exists regardless of who the child is. The second produces a story that couldn&apos;t have been written for anyone else.
          </p>
          <p>
            PageCub is built around the second approach. When you create a book, you&apos;re not choosing from a library of existing stories. You&apos;re describing your child — who they are, how they look, what they love, what they&apos;re afraid of, what you want them to carry with them — and the story is written from that description, with illustrations to match.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">Why birthdays are the right moment for this</h2>
          <p>
            Birthdays are one of the few times children are explicitly the protagonist of the day. That makes it the right moment to give them something that reflects that — a story where they are the main character, navigating something real, coming out the other side with something earned.
          </p>
          <p>
            It also means you have the context you need to make it meaningful. You know what this child is going through. You know what they need to hear. A birthday book can carry that in a way a standard gift cannot.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">What makes a good personalized children&apos;s book</h2>
          <p>
            A few things actually matter when evaluating a personalized book for a child:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The story should feel written for this child, not adapted from a template</li>
            <li>The illustrations should match the character description and maintain a consistent style throughout</li>
            <li>The moral or lesson should be one you chose, not a generic one assigned by the service</li>
            <li>The age range should match — a 4-year-old and a 10-year-old need very different stories</li>
          </ul>
          <p>
            PageCub gives you control over all of these. You choose the illustration style, the world the story takes place in, the challenge the character faces, and the lesson the story should gently teach.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">The practical part</h2>
          <p>
            It takes about 5 minutes to fill in the creation form and 15–20 minutes for the book to generate. You receive a complete 10-chapter storybook with 20 illustrations as a PDF. Print fulfillment is coming soon, which will let you order a hardcover copy.
          </p>
          <p>
            For a birthday gift, the digital version is immediately available. You can share it with family, read it together on the day, and order a printed copy when that option is live.
          </p>
        </div>

        <div className="mt-12 rounded-2xl bg-ink p-8 text-white text-center">
          <h2 className="display text-2xl font-bold mb-3">Make their birthday book.</h2>
          <p className="text-white/70 text-sm mb-6">5 minutes to fill in. 15–20 minutes to generate. A story built around them.</p>
          <ButtonLink href="/create">Start a Book</ButtonLink>
        </div>
      </main>
    </>
  );
}
