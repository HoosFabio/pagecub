import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Personalized Books for Grandchildren: A Gift Grandparents Actually Love Giving — PageCub",
  description: "A custom storybook built around your grandchild — their name, personality, and world — is the kind of gift that lasts. Here's how to make one.",
};

export default function BlogPost() {
  return (
    <>
      <main className="page-shell py-16 max-w-2xl">
        <p className="text-sm font-bold text-sage uppercase tracking-widest mb-4">PageCub Blog</p>
        <h1 className="display text-4xl font-bold leading-tight mb-4">Personalized Books for Grandchildren: A Gift Grandparents Actually Love Giving</h1>
        <p className="text-ink/50 text-sm mb-10">April 27, 2026</p>

        <div className="space-y-6 text-sm leading-8 text-ink/75">
          <p>
            Grandparents tend to give gifts with more intentionality than anyone else at the birthday party. They&apos;re not trying to be cool. They&apos;re trying to give something that matters — something the grandchild will remember, something that shows how much they actually pay attention to who this child is.
          </p>
          <p>
            A personalized storybook is built for that impulse. Not the kind with a name swapped into a pre-written story, but a book that was actually written around this specific child — their personality, their world, the thing you want them to carry with them.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">What makes it work for grandparents</h2>
          <p>
            Grandparents often know things about their grandchildren that don&apos;t make it into gift registries. The specific fear. The running joke. The thing the child is working through right now. The comfort object or favorite character that only close family would know about.
          </p>
          <p>
            Those details are exactly what makes a personalized book meaningful. PageCub gives you fields to describe the child as fully as you want: their appearance, personality, favorite things, supporting characters who matter to them, and the lesson you want the story to gently teach.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">The permission question</h2>
          <p>
            PageCub is designed for parents and guardians, but grandparents can absolutely create a book — as long as you have permission from the child&apos;s parent or guardian. That&apos;s a simple yes in most families. And it means the gift can be created ahead of time, ready for the occasion.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">A keepsake that lives in the family</h2>
          <p>
            A book built around a grandchild becomes a piece of family history. It captures something about who this child was at a specific age — their loves, their world, the people around them — in a form that can be reread for years and passed down.
          </p>
          <p>
            That&apos;s different from a toy that loses relevance in a season. It&apos;s the kind of thing that shows up in a childhood bedroom long after the child has grown, that gets read to the next generation, that becomes part of the family&apos;s story.
          </p>

          <h2 className="display text-2xl font-bold text-ink mt-8">How to make one</h2>
          <p>
            The creation form takes about 5 minutes. You describe the child, choose the world and illustration style, set the challenge and lesson, and add any personal touches like a dedication or opening note. The book generates in 15–20 minutes and is delivered as a PDF you can share immediately or save for print.
          </p>
          <p>
            Print fulfillment is coming soon — hardcover, approximately 48 pages — which will make it easy to order a physical copy as the gift itself.
          </p>
        </div>

        <div className="mt-12 rounded-2xl bg-ink p-8 text-white text-center">
          <h2 className="display text-2xl font-bold mb-3">Make a book for your grandchild.</h2>
          <p className="text-white/70 text-sm mb-6">Built around them specifically. Ready in 15–20 minutes.</p>
          <ButtonLink href="/create">Start a Book</ButtonLink>
        </div>
      </main>
    </>
  );
}
