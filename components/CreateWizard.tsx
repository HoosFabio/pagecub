"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

type FormState = {
  email: string;
  charachter_name: string;
  gender: string;
  age: string;
  charachter_bio: string;
  charachter_desc: string;
  supporting_charachters: string;
  world_setting: string;
  world_theme: string[];
  artistic_style: string;
  time_era: string;
  structure: string;
  problem: string;
  moral: string;
  relevant_struggles: string;
  book_title: string;
  dedication: string;
  opening_note: string;
  colophon: string;
};

const initialForm: FormState = {
  email: "",
  charachter_name: "",
  gender: "",
  age: "",
  charachter_bio: "",
  charachter_desc: "",
  supporting_charachters: "",
  world_setting: "",
  world_theme: [],
  artistic_style: "",
  time_era: "",
  structure: "",
  problem: "",
  moral: "",
  relevant_struggles: "",
  book_title: "",
  dedication: "",
  opening_note: "",
  colophon: ""
};

const steps = ["Child", "Story", "World", "Personal", "Review"];
const themes = ["Wonder", "Friendship", "Courage", "Kindness", "Adventure", "Mystery", "Nature", "Family", "Magic", "Growth", "Belonging", "Resilience"];
const styles = ["Warm watercolor storybook", "Soft painterly", "Classic children's book", "Cute cartoon", "Whimsical fantasy", "Gentle woodland", "Bright colorful modern", "Minimal simple shapes", "Ghibli-inspired cozy"];

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [permission, setPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTheme(theme: string) {
    setForm((current) => ({
      ...current,
      world_theme: current.world_theme.includes(theme)
        ? current.world_theme.filter((item) => item !== theme)
        : [...current.world_theme, theme]
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const validation = validateStep(4, form, permission);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/pagecub/create-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "We could not start checkout. Please try again.");
      }

      const checkoutUrl = data.checkoutUrl || data.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      if (data.statusToken) {
        window.location.href = `/status/${data.statusToken}`;
        return;
      }

      throw new Error("Checkout did not return a next step. Please try again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl">
      <div className="rounded-[2rem] border border-line bg-card p-5 shadow-soft md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-bold text-sage">Create a PageCub book</p>
            <h1 className="display mt-2 text-4xl font-bold md:text-5xl">{steps[step]}</h1>
          </div>
          <p className="text-sm font-bold text-ink/60">
            Step {step + 1} of {steps.length}
          </p>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-honey transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold text-ink/55 md:grid-cols-5">
          {steps.map((label, index) => (
            <span key={label} className={index === step ? "text-ink" : ""}>
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10">
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Child's name" value={form.charachter_name} onChange={(value) => update("charachter_name", value)} required />
              <Field label="Pronouns or gender" value={form.gender} onChange={(value) => update("gender", value)} required />
              <Field label="Age" value={form.age} onChange={(value) => update("age", value)} required />
              <Field label="What do they look like?" value={form.charachter_desc} onChange={(value) => update("charachter_desc", value)} textarea required />
              <Field label="A few things about them" value={form.charachter_bio} onChange={(value) => update("charachter_bio", value)} textarea required />
              <Field label="Other characters to include" value={form.supporting_charachters} onChange={(value) => update("supporting_charachters", value)} textarea />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Story shape"
                value={form.structure}
                onChange={(value) => update("structure", value)}
                options={["Linear adventure", "Mystery", "Quest", "Bedtime journey"]}
                required
              />
              <Field label="Main challenge" value={form.problem} onChange={(value) => update("problem", value)} textarea required />
              <Field label="What should the story gently teach?" value={form.moral} onChange={(value) => update("moral", value)} textarea required />
              <Field label="Any real-life situation to echo? (optional)" value={form.relevant_struggles} onChange={(value) => update("relevant_struggles", value)} textarea />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Where does the story happen?" value={form.world_setting} onChange={(value) => update("world_setting", value)} required />
                <Field label="Time period" value={form.time_era} onChange={(value) => update("time_era", value)} required />
              </div>
              <div>
                <p className="mb-3 text-sm font-bold">What kind of world?</p>
                <div className="flex flex-wrap gap-3">
                  {themes.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => toggleTheme(theme)}
                      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                        form.world_theme.includes(theme) ? "border-sage bg-sage text-white" : "border-line bg-cream text-ink"
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-bold">Illustration style</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {styles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => update("artistic_style", style)}
                      className={`min-h-32 rounded-2xl border p-4 text-left transition ${
                        form.artistic_style === style ? "border-honey bg-honey/20" : "border-line bg-cream"
                      }`}
                    >
                      <span className="block h-12 rounded-xl bg-gradient-to-br from-honey/60 via-card to-sage/50" />
                      <span className="mt-4 block text-sm font-bold">{style}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-6 rounded-2xl bg-cream p-4 text-sm font-bold text-ink/70">
                Leave these blank and PageCub will write gentle defaults.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Custom title" value={form.book_title} onChange={(value) => update("book_title", value)} />
                <Field label="Dedication" value={form.dedication} onChange={(value) => update("dedication", value)} textarea />
                <Field label="Opening note" value={form.opening_note} onChange={(value) => update("opening_note", value)} textarea />
                <Field label="Colophon note" value={form.colophon} onChange={(value) => update("colophon", value)} textarea />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-6">
              <Field label="Parent email" type="email" value={form.email} onChange={(value) => update("email", value)} required />
              <div className="rounded-2xl border border-line bg-cream p-5">
                <h2 className="display text-2xl font-bold">Review your book details</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {reviewRows(form).map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/76">{value || "Not provided"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm font-bold text-ink/70">You&apos;ll be able to preview the finished book before ordering any printed copy.</p>
              <label className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 text-sm font-bold">
                <input type="checkbox" checked={permission} onChange={(event) => setPermission(event.target.checked)} className="mt-1 h-5 w-5 accent-sage" />
                <span>I am the parent/guardian or have permission to create this book.</span>
              </label>
            </div>
          )}
        </div>

        {error && <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <div className="mt-10 flex flex-wrap justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-card px-5 py-3 text-sm font-bold disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const validation = validateStep(step, form, permission);
                if (validation) {
                  setError(validation);
                  return;
                }
                setError("");
                setStep((current) => Math.min(steps.length - 1, current + 1));
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Create My Book
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function reviewRows(form: FormState): [string, string][] {
  return [
    ["Child", `${form.charachter_name} ${form.age ? `(${form.age})` : ""}`.trim()],
    ["Pronouns or gender", form.gender],
    ["About them", form.charachter_bio],
    ["Appearance", form.charachter_desc],
    ["Other characters", form.supporting_charachters],
    ["Story shape", form.structure],
    ["Challenge", form.problem],
    ["Gentle lesson", form.moral],
    ["Real-life echo", form.relevant_struggles],
    ["World", form.world_setting],
    ["World themes", form.world_theme.join(", ")],
    ["Time period", form.time_era],
    ["Illustration style", form.artistic_style],
    ["Custom title", form.book_title],
    ["Dedication", form.dedication],
    ["Opening note", form.opening_note],
    ["Colophon note", form.colophon]
  ];
}

function validateStep(step: number, form: FormState, permission: boolean): string {
  if (step === 0) {
    if (!form.charachter_name || !form.gender || !form.age || !form.charachter_bio || !form.charachter_desc) {
      return "Please complete the child details before continuing.";
    }
  }
  if (step === 1) {
    if (!form.structure || !form.problem || !form.moral) {
      return "Please complete the story details before continuing.";
    }
  }
  if (step === 2) {
    if (!form.world_setting || !form.time_era || !form.artistic_style || form.world_theme.length === 0) {
      return "Please complete the world details before continuing.";
    }
  }
  if (step === 4) {
    if (!form.email) return "Please add the parent email address.";
    const childValidation = validateStep(0, form, permission);
    if (childValidation) return childValidation;
    const storyValidation = validateStep(1, form, permission);
    if (storyValidation) return storyValidation;
    const worldValidation = validateStep(2, form, permission);
    if (worldValidation) return worldValidation;
    if (!permission) return "Please confirm you have permission to create this book.";
  }
  return "";
}

function Field({
  label,
  value,
  onChange,
  textarea,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  required?: boolean;
  type?: string;
}) {
  const className =
    "mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink outline-none transition focus:border-sage focus:bg-card";
  return (
    <label className="block text-sm font-bold">
      {label}
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={5} className={className} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className={className} />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink outline-none transition focus:border-sage focus:bg-card"
      >
        <option value="">Choose one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
