import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Sample Books — PageCub Personalized Illustrated Children's Storybooks",
  description: "See real illustrations from completed PageCub books across multiple illustration styles.",
};

const styleGroups = [
  {
    style: "Warm watercolor storybook",
    description: "Soft, dreamy, richly textured. The classic storybook feel.",
    images: [
      { src: "/samples/sample-01.webp", alt: "A girl in a pink dress approaches a magical treehouse where an elderly woman waits, small dragon perched above the door" },
      { src: "/samples/sample-02.webp", alt: "Inside a castle hall, a girl in a pink dress holds a baby and points excitedly at an owl on a windowsill" },
      { src: "/samples/sample-04.webp", alt: "A small girl with a satchel stands at a rushing river, stepping stones ahead, ancient trees framing the enchanted forest" },
      { src: "/samples/sample-05.webp", alt: "A curly-haired girl runs joyfully toward a golden gate where a large friendly dragon smiles gently" },
      { src: "/samples/sample-07.webp", alt: "A girl in star-patterned pajamas lies in bed cuddling a stuffed bunny, shadow puppets on the wall, crescent moon through the window" },
      { src: "/samples/sample-08.webp", alt: "A laughing toddler in a yellow dress and rainbow rain boots reaches for dandelion puffs in a sunny garden" },
      { src: "/samples/sample-10.webp", alt: "A girl in rainbow striped socks crouches in a garden, peering closely at a ladybug on a large green leaf" },
      { src: "/samples/sample-11.webp", alt: "A child peeks from under a patchwork quilt, thought bubble showing a ladybug, crescent moon glowing through a dark bedroom window" },
    ],
  },
  {
    style: "Bright colorful modern",
    description: "Bold, vibrant, high-energy. Characters that pop off the page.",
    images: [
      { src: "/samples/sample-00.webp", alt: "A girl in a yellow dress points excitedly at a large friendly green dragon, surrounded by colorful mushrooms and a purple and blue dragon" },
      { src: "/samples/sample-06.webp", alt: "A girl with long dark hair kneels on her bedroom floor hugging a small green dragon, stuffed animals and toys all around" },
    ],
  },
  {
    style: "Classic children's book",
    description: "Warm, textured, vintage-leaning. A timeless quality.",
    images: [
      { src: "/samples/sample-09.webp", alt: "A freckled curly-haired toddler boy sits cross-legged in tall grass, gazing wonderingly at a butterfly, a ladybug and snail nearby" },
    ],
  },
];

export default function SamplesPage() {
  return (
    <main>
      <section className="page-shell py-16">
        <p className="font-bold text-sage text-sm uppercase tracking-widest mb-4">Samples</p>
        <h1 className="display text-5xl font-bold mb-4">What a finished book looks like.</h1>
        <p className="text-ink/65 text-lg leading-8 max-w-xl">
          Real illustrations from completed PageCub books — across multiple styles so you can find the one that fits your child.
        </p>
      </section>

      {styleGroups.map((group, idx) => (
        <section key={group.style} className={`py-14 ${idx % 2 === 1 ? "bg-card/60 border-y border-line" : ""}`}>
          <div className="page-shell">
            <div className="mb-8">
              <span className="inline-block rounded-full border border-honey/50 bg-honey/10 px-4 py-1.5 text-xs font-bold text-honey mb-3">
                {group.style}
              </span>
              <p className="text-ink/55 text-sm">{group.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {group.images.map((img) => (
                <div key={img.src} className="overflow-hidden rounded-2xl border border-line shadow-sm">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={450}
                    height={450}
                    className="aspect-square w-full object-cover hover:scale-105 transition duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="page-shell py-16 text-center">
        <h2 className="display text-3xl font-bold mb-3">Ready to make one for your child?</h2>
        <p className="text-ink/60 mb-8 max-w-md mx-auto">Choose your illustration style, describe your child, and get a complete 10-chapter illustrated book in about 15–20 minutes.</p>
        <ButtonLink href="/create">Start a Book</ButtonLink>
      </section>
    </main>
  );
}
