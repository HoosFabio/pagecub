import Image from "next/image";
import { ButtonLink } from "@/components/ButtonLink";
import { aureliaCopy, sampleChapters } from "@/lib/content";

export default function SamplesPage() {
  return (
    <main className="page-shell py-14">
      <div className="max-w-3xl">
        <p className="font-bold text-sage">Sample book</p>
        <h1 className="display mt-3 text-5xl font-bold">Aurelia and the Moonlight Kingdom</h1>
        <p className="mt-5 text-lg leading-8 text-ink/72">{aureliaCopy}</p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {sampleChapters.map((chapter) => (
          <a key={chapter.number} href={`#chapter-${chapter.number}`} className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
            Chapter {chapter.number}: {chapter.title}
          </a>
        ))}
      </div>
      <div className="mt-12 grid gap-12">
        {sampleChapters.map((chapter) => (
          <section key={chapter.number} id={`chapter-${chapter.number}`} className="rounded-[2rem] border border-line bg-card p-4 shadow-soft md:p-7">
            <div className="mb-6">
              <p className="text-sm font-bold text-sage">Chapter {chapter.number}</p>
              <h2 className="display mt-1 text-3xl font-bold">{chapter.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">{chapter.summary}</p>
            </div>
            <div className="grid gap-5">
              {chapter.pages.map((page, index) => (
                <article key={index} className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-2">
                  <div className="book-paper p-6 md:p-8">
                    <p className="mb-4 text-sm font-bold text-ink/55">Page {index + 1}</p>
                    <p className="whitespace-pre-line text-[15px] leading-7 text-ink/78">{page.text}</p>
                  </div>
                  <Image src={page.image} alt={`${chapter.title} illustration page ${index + 1}`} width={720} height={720} className="h-full min-h-80 w-full object-cover" />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-12 rounded-[2rem] bg-sage/18 p-8 text-center">
        <h2 className="display text-3xl font-bold">Make a book around your child</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink/70">Choose the world, the lesson, the people, and the tiny details that make it feel like home.</p>
        <div className="mt-7">
          <ButtonLink href="/create">Start a Book</ButtonLink>
        </div>
      </div>
    </main>
  );
}
