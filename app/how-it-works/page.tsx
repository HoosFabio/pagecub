import { ButtonLink } from "@/components/ButtonLink";
import { howSteps } from "@/lib/content";

export default function HowItWorksPage() {
  return (
    <main className="page-shell py-14">
      <p className="font-bold text-sage">How it works</p>
      <h1 className="display mt-3 max-w-3xl text-5xl font-bold">From a few details to a finished keepsake.</h1>
      <div className="mt-10 grid gap-6">
        {howSteps.map((step, index) => (
          <section key={step.title} className="grid gap-5 rounded-[2rem] border border-line bg-card p-7 shadow-sm md:grid-cols-[5rem_1fr]">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey/30 text-2xl font-bold">{index + 1}</span>
            <div>
              <h2 className="display text-3xl font-bold">{step.title}</h2>
              <p className="mt-3 max-w-3xl leading-7 text-ink/72">{step.text}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="mt-10 rounded-[2rem] bg-ink p-8 text-white">
        <h2 className="display text-3xl font-bold">Ready when you are.</h2>
        <p className="mt-3 text-white/75">The create form walks you through each choice gently.</p>
        <div className="mt-6">
          <ButtonLink href="/create">Start a Book</ButtonLink>
        </div>
      </div>
    </main>
  );
}
