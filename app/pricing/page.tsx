import { ButtonLink } from "@/components/ButtonLink";

const plans = [
  { title: "Digital storybook", text: "Personalized illustrated book creation with preview access and digital delivery." },
  { title: "Gift-ready storybook", text: "A polished keepsake experience for birthdays, milestones, and bedtime surprises." },
  { title: "Printed keepsake", text: "Print fulfillment coming soon." }
];

export default function PricingPage() {
  return (
    <main className="page-shell py-14">
      <p className="font-bold text-sage">Pricing</p>
      <h1 className="display mt-3 max-w-3xl text-5xl font-bold">Simple options, with final pricing shown at checkout.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/72">
        PageCub launch pricing is being finalized. We will keep the checkout clear before you place an order.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.title} className="rounded-[2rem] border border-line bg-card p-7 shadow-sm">
            <h2 className="display text-3xl font-bold">{plan.title}</h2>
            <p className="mt-4 min-h-24 leading-7 text-ink/70">{plan.text}</p>
            <div className="mt-7 h-px bg-line" />
            <p className="mt-5 text-sm font-bold text-ink/65">Price shown when checkout is available.</p>
          </article>
        ))}
      </div>
      <div className="mt-10">
        <ButtonLink href="/create">Start a Book</ButtonLink>
      </div>
    </main>
  );
}
