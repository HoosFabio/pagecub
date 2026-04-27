import Image from "next/image";
import Link from "next/link";
import { BookHeart, Gift, HeartHandshake, LockKeyhole, Moon, School, ShieldCheck, Sparkles, Star, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";
import { aureliaCopy, faqs, howSteps, sampleChapters } from "@/lib/content";

const features = [
  "Story details shaped around your child",
  "Illustrations matched to the world you choose",
  "Gentle themes for real childhood moments",
  "A keepsake made to read, save, and share"
];

const useCases = [
  { label: "Birthday gift", Icon: Gift },
  { label: "Bedtime adventure", Icon: Moon },
  { label: "Grandparent keepsake", Icon: HeartHandshake },
  { label: "New sibling", Icon: UsersRound },
  { label: "Starting school", Icon: School },
  { label: "Bravery story", Icon: ShieldCheck }
];

export default function HomePage() {
  const preview = sampleChapters[0].pages[0];

  return (
    <main>
      <section className="page-shell grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 md:grid-cols-[1fr_0.86fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-line bg-card px-4 py-2 text-sm font-bold text-ink/75">
            A custom illustrated adventure made around your child.
          </p>
          <h1 className="display max-w-3xl text-5xl font-bold leading-[1.04] text-ink md:text-7xl">
            A storybook where your child belongs on every page.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/72">
            PageCub turns a few loving details into a personalized illustrated keepsake for birthdays, bedtime, big feelings,
            and little milestones.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/create">Start a Book</ButtonLink>
            <ButtonLink href="/samples" variant="secondary">
              See a Sample
            </ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -left-5 top-10 h-28 w-16 rounded-l-[2rem] bg-sage/30" />
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-card p-4 shadow-soft">
            <div className="grid gap-3 rounded-[1.5rem] bg-cream p-3">
              <Image
                src={preview.image}
                alt="A sample PageCub illustration of Aurelia at bedtime"
                width={720}
                height={720}
                priority
                className="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
              />
              <div className="book-paper rounded-[1.25rem] border border-line p-5">
                <p className="display text-2xl font-bold">Not Sleepy Yet</p>
                <p className="mt-3 line-clamp-6 text-sm leading-6 text-ink/72">{preview.text}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card/68 py-16">
        <div className="page-shell">
          <h2 className="display text-4xl font-bold">More than a name in a template</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {features.map((feature) => (
              <div key={feature} className="rounded-2xl border border-line bg-cream p-6 shadow-sm">
                <Sparkles className="h-6 w-6 text-honey" aria-hidden="true" />
                <p className="mt-5 font-bold leading-7">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="page-shell py-16">
        <h2 className="display text-4xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {howSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-honey/25 font-bold">{index + 1}</span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/70">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-sage/16 py-16">
        <div className="page-shell grid gap-8 md:grid-cols-[0.9fr_1fr] md:items-center">
          <div>
            <h2 className="display text-4xl font-bold">Peek inside a finished book</h2>
            <p className="mt-4 text-lg leading-8 text-ink/72">
              Read real spreads from an Aurelia story, with chapter text beside finished illustrations.
            </p>
            <div className="mt-7">
              <ButtonLink href="/samples" variant="secondary">
                Open Samples
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {sampleChapters.map((chapter) => (
              <Link key={chapter.number} href="/samples" className="rounded-2xl border border-line bg-card p-3 shadow-sm transition hover:-translate-y-1">
                <Image src={chapter.pages[0].image} alt={`Sample illustration from ${chapter.title}`} width={420} height={420} className="aspect-square rounded-xl object-cover" />
                <p className="mt-3 text-sm font-bold">{chapter.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16">
        <h2 className="display text-4xl font-bold">Made for moments families remember</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-honey/25">
                <Icon className="h-6 w-6 text-ink" aria-hidden="true" />
              </span>
              <p className="font-bold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card/70 py-16">
        <div className="page-shell grid gap-8 md:grid-cols-[0.7fr_1fr] md:items-center">
          <div className="rounded-[2rem] border border-line bg-cream p-8">
            <Star className="h-8 w-8 text-honey" aria-hidden="true" />
            <h2 className="display mt-5 text-4xl font-bold">About Aurelia</h2>
          </div>
          <p className="text-xl leading-9 text-ink/76">{aureliaCopy}</p>
        </div>
      </section>

      <section className="page-shell grid gap-6 py-16 md:grid-cols-3">
        {["Private by design", "Made with permission", "Preview before print"].map((title) => (
          <div key={title} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <LockKeyhole className="h-6 w-6 text-sage" aria-hidden="true" />
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Family details are used to create your book experience. Print fulfillment coming soon.
            </p>
          </div>
        ))}
      </section>

      <section className="bg-card/70 py-16">
        <div className="page-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-4xl font-bold">Simple launch options</h2>
              <p className="mt-3 text-ink/70">Final pricing will appear at checkout once launch pricing is set.</p>
            </div>
            <ButtonLink href="/pricing" variant="secondary">
              View Pricing
            </ButtonLink>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {["Digital storybook", "Gift-ready storybook", "Printed keepsake"].map((title) => (
              <div key={title} className="rounded-2xl border border-line bg-cream p-6">
                <BookHeart className="h-6 w-6 text-honey" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  {title === "Printed keepsake" ? "Print fulfillment coming soon." : "Personalized book creation with preview access."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16">
        <h2 className="display text-4xl font-bold">Questions parents ask</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.slice(0, 6).map((item) => (
            <div key={item.q} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
              <h3 className="font-bold">{item.q}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/70">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell pb-16">
        <div className="rounded-[2rem] bg-ink px-8 py-12 text-center text-white shadow-soft">
          <h2 className="display text-4xl font-bold">Ready to make their story?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/75">Start with a few loving details. PageCub will handle the storybook magic.</p>
          <div className="mt-8">
            <ButtonLink href="/create">Start a Book</ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
