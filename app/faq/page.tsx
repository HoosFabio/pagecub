import { faqs } from "@/lib/content";

export default function FAQPage() {
  return (
    <main className="page-shell py-14">
      <p className="font-bold text-sage">FAQ</p>
      <h1 className="display mt-3 text-5xl font-bold">Questions parents ask</h1>
      <div className="mt-10 grid gap-4">
        {faqs.map((item) => (
          <section key={item.q} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">{item.q}</h2>
            <p className="mt-3 leading-7 text-ink/72">{item.a}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
