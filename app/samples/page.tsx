import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/ButtonLink";
import { aureliaCopy, styleGallery } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sample Books — PageCub Personalized Illustrated Children's Storybooks",
  description: "See real chapters and illustrations from completed PageCub books in multiple illustration styles.",
};

export default function SamplesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-shell py-16">
          <p className="font-bold text-sage text-sm uppercase tracking-widest mb-4">Samples</p>
          <h1 className="display text-5xl font-bold mb-4">What a finished book looks like.</h1>
          <p className="text-ink/65 text-lg leading-8 max-w-xl">
            Real chapters and illustrations from completed PageCub books — two different illustration styles, same character, two different stories.
          </p>
        </section>

        {styleGallery.map((styleRun, styleIdx) => (
          <section
            key={styleRun.style}
            className={`py-16 ${styleIdx % 2 === 1 ? "bg-sage/8" : ""}`}
          >
            <div className="page-shell">
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <div>
                  <span className="inline-block rounded-full border border-honey/50 bg-honey/10 px-4 py-1.5 text-xs font-bold text-honey mb-2">
                    Style: {styleRun.style}
                  </span>
                  <h2 className="display text-3xl font-bold">{styleRun.story}</h2>
                  <p className="text-ink/55 text-sm mt-1">Character: {styleRun.character}</p>
                </div>
              </div>

              <div className="space-y-12">
                {styleRun.chapters.map((chapter) => (
                  <div key={chapter.number} className="rounded-[2rem] border border-line bg-card overflow-hidden">
                    <div className="px-7 py-5 border-b border-line">
                      <p className="text-xs font-bold uppercase tracking-widest text-sage mb-1">Chapter {chapter.number}</p>
                      <h3 className="display text-2xl font-bold">{chapter.title}</h3>
                      {chapter.summary && (
                        <p className="text-sm text-ink/50 mt-1 italic">{chapter.summary}</p>
                      )}
                    </div>
                    {chapter.pages.map((page, pageIdx) => (
                      <div
                        key={pageIdx}
                        className={`grid md:grid-cols-2 ${pageIdx % 2 === 1 ? "md:[direction:rtl]" : ""}`}
                      >
                        <div className={`p-7 flex items-center ${pageIdx % 2 === 1 ? "md:[direction:ltr]" : ""}`}>
                          <p className="text-sm leading-8 text-ink/80 whitespace-pre-line">{page.text}</p>
                        </div>
                        <div className={pageIdx % 2 === 1 ? "md:[direction:ltr]" : ""}>
                          <Image
                            src={page.image}
                            alt={`${chapter.title} — illustration ${pageIdx + 1}`}
                            width={720}
                            height={720}
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="border-t border-line bg-card/70 py-16">
          <div className="page-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="display text-3xl font-bold mb-4">About Aurelia</h2>
              <p className="text-lg leading-9 text-ink/72 max-w-2xl">{aureliaCopy}</p>
            </div>
            <ButtonLink href="/create">Start a Book</ButtonLink>
          </div>
        </section>

        <section className="page-shell py-16 text-center">
          <h2 className="display text-3xl font-bold mb-3">Ready to make one for your child?</h2>
          <p className="text-ink/60 mb-8">Any illustration style. Any character. Any story.</p>
          <ButtonLink href="/create">Start a Book</ButtonLink>
        </section>
      </main>
      <Footer />
    </>
  );
}
