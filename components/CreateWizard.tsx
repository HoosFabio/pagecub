"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportingChar = {
  name: string;
  role: string;
  personality: string;
  appearance: string;
};

type FormState = {
  // Step 0 — Child (email captured here)
  email: string;
  charachter_name: string;
  gender: string;
  gender_custom: string;
  age: string;
  charachter_bio: string;
  charachter_desc: string;
  // Step 1 — Story
  structure: string;
  structure_custom: string;
  problem: string;
  moral: string;
  moral_custom: string;
  relevant_struggles: string[];
  struggles_other: string;
  // Step 2 — World
  world_setting: string;
  world_setting_custom: string;
  world_theme: string[];
  artistic_style: string;
  artistic_style_custom: string;
  time_era: string;
  time_era_custom: string;
  // Step 3 — Personal
  book_title: string;
  dedication: string;
  opening_note: string;
  colophon: string;
};

const EMPTY_CHAR: SupportingChar = { name: "", role: "", personality: "", appearance: "" };

const INITIAL_FORM: FormState = {
  email: "", charachter_name: "", gender: "", gender_custom: "", age: "",
  charachter_bio: "", charachter_desc: "",
  structure: "", structure_custom: "", problem: "", moral: "", moral_custom: "",
  relevant_struggles: [], struggles_other: "",
  world_setting: "", world_setting_custom: "", world_theme: [],
  artistic_style: "", artistic_style_custom: "", time_era: "", time_era_custom: "",
  book_title: "", dedication: "", opening_note: "", colophon: "",
};

// ─── Option Lists ─────────────────────────────────────────────────────────────

const GENDER_OPTIONS    = ["Boy", "Girl", "Nonbinary", "Unspecified / surprise me", "Other"];
// Age is free-text — supports children, teens, adults (e.g. wedding books)
const WORLD_THEMES      = ["Wonder","Friendship","Courage","Kindness","Adventure","Mystery","Nature","Family","Magic","Growth","Belonging","Resilience"];
const STRUGGLE_OPTIONS  = ["Anxiety","Shyness","Starting school","Making friends","Fear of trying new things","Sibling jealousy","Bedtime fears","Grief / change","Big feelings","Confidence","Other"];
const MORAL_OPTIONS     = ["Be brave","Be kind","Tell the truth","Believe in yourself","Ask for help","Mistakes help us grow","Friendship matters","Patience pays off","Other"];

const STRUCTURE_OPTIONS = [
  "Linear 3-act plot",
  "Hero's journey",
  "Circular story",
  "Cumulative story",
  "Parallel story lines",
  "Reverse chronology",
  "Needs vs frustration",
  "Episodic adventure",
  "Bedtime / soothing arc",
  "Other",
];

const WORLD_SETTING_OPTIONS = [
  "Forest","Small town","Home / neighborhood","Castle","Space",
  "Ocean","Farm","School","Magical kingdom","Other",
];

const TIME_ERA_OPTIONS = [
  "Timeless / storybook","Present day","Medieval / fairy tale",
  "Victorian","1950s","Future","Ancient world","Other",
];

const STYLE_OPTIONS = [
  "Warm watercolor storybook",
  "Soft painterly",
  "Classic children's book",
  "Cute cartoon",
  "Whimsical fantasy",
  "Gentle woodland",
  "Bright colorful modern",
  "Minimal simple shapes",
  "Ghibli-inspired cozy",
  "Other — describe your own",
];

// Full descriptive expansions sent to the AI
const STYLE_EXPANSIONS: Record<string, string> = {
  "Warm watercolor storybook":
    "Warm watercolor storybook illustration: soft brushwork textures, warm golden and amber lighting, gentle translucent color washes, expressive rounded character forms, rich layered backgrounds with visible paint texture, cozy and inviting atmosphere. Consistent palette and brushwork across every spread.",
  "Soft painterly":
    "Soft painterly illustration: lush blended brushstrokes, dreamy diffused lighting, rich saturated palette with smooth transitions, impressionist influence, characters rendered with warmth and dimensional depth against detailed painted backgrounds. Consistent color temperature and stroke quality across every spread.",
  "Classic children's book":
    "Classic children's picture book illustration: clean confident line art, flat areas of color with subtle shading, clear visual hierarchy, mid-century inspired palette, timeless authoritative style reminiscent of golden age picture books. Consistent line weight and color vocabulary across every spread.",
  "Cute cartoon":
    "Cute cartoon illustration: bold outlines, simplified rounded character shapes, bright saturated primary and pastel colors, expressive large eyes, flat or lightly shaded fills, playful energetic compositions with strong graphic clarity. Consistent character proportions and outline weight across every spread.",
  "Whimsical fantasy":
    "Whimsical fantasy illustration: intricate detailed environments, fantastical flora and architecture, rich jewel-tone palette with magical lighting effects, characters with expressive exaggerated features, a sense of wonder and hidden detail in every scene. Consistent fantastical world logic and palette across every spread.",
  "Gentle woodland":
    "Gentle woodland illustration: muted earthy naturalistic palette, soft dappled light filtering through trees, detailed organic textures for bark, leaves, and moss, characters drawn in a soft naturalistic style, peaceful and grounded atmosphere. Consistent earthy tones and lighting quality across every spread.",
  "Bright colorful modern":
    "Bright colorful modern illustration: bold geometric shapes, high-contrast vibrant palette, clean contemporary flat design with strategic shadows and highlights, energetic layouts with confident graphic design sensibility. Consistent geometric language and color system across every spread.",
  "Minimal simple shapes":
    "Minimal simple shape illustration: clean flat vector-inspired art, limited palette of 3 to 5 carefully chosen tones, geometric simplified forms, generous negative space, Scandinavian picture book influence, modern and elegant. Consistent shape vocabulary and restrained palette across every spread.",
  "Ghibli-inspired cozy":
    "Ghibli-inspired cozy illustration: lush hand-painted backgrounds with rich environmental detail, warm cinematic lighting, characters with rounded features and expressive body language, painterly quality with anime proportions, a sense of lived-in warmth and quiet magic in everyday moments. Consistent lighting warmth and painterly quality across every spread.",
};

// ─── Main Component ───────────────────────────────────────────────────────────

const steps = ["Child", "Story", "World", "Personal", "Review"];

export function CreateWizard() {
  const [step, setStep]                       = useState(0);
  const [form, setForm]                       = useState<FormState>(INITIAL_FORM);
  const [supportingChars, setSupportingChars] = useState<SupportingChar[]>([{ ...EMPTY_CHAR }]);
  const [permission, setPermission]           = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleTheme(t: string) {
    setForm(f => ({
      ...f,
      world_theme: f.world_theme.includes(t)
        ? f.world_theme.filter(x => x !== t)
        : [...f.world_theme, t],
    }));
  }

  function toggleStruggle(s: string) {
    setForm(f => ({
      ...f,
      relevant_struggles: f.relevant_struggles.includes(s)
        ? f.relevant_struggles.filter(x => x !== s)
        : [...f.relevant_struggles, s],
    }));
  }

  function updateChar(i: number, key: keyof SupportingChar, val: string) {
    setSupportingChars(cs => cs.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  }

  function addChar()         { setSupportingChars(cs => [...cs, { ...EMPTY_CHAR }]); }
  function removeChar(i: number) { setSupportingChars(cs => cs.filter((_, idx) => idx !== i)); }

  function buildSupportingChars(): string {
    return supportingChars
      .filter(c => c.name.trim())
      .map(c => [c.name, c.role ? `(${c.role})` : "", c.personality, c.appearance].filter(Boolean).join(" — "))
      .join("\n");
  }

  function buildGender()        { return form.gender === "Other" ? form.gender_custom : form.gender; }
  function buildWorldSetting()  { return form.world_setting  === "Other" ? form.world_setting_custom  : form.world_setting;  }
  function buildTimeEra()       { return form.time_era       === "Other" ? form.time_era_custom       : form.time_era;       }
  function buildMoral()         { return form.moral          === "Other" ? form.moral_custom          : form.moral;          }
  function buildStructure()     { return form.structure      === "Other" ? form.structure_custom      : form.structure;      }
  function buildArtisticStyle() {
    if (form.artistic_style === "Other — describe your own") return form.artistic_style_custom;
    return STYLE_EXPANSIONS[form.artistic_style] ?? form.artistic_style;
  }
  function buildStruggles(): string {
    const base = form.relevant_struggles.filter(s => s !== "Other");
    if (form.relevant_struggles.includes("Other") && form.struggles_other.trim()) {
      return [...base, form.struggles_other.trim()].join(", ");
    }
    return base.join(", ");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const val = validateStep(4, form, permission);
    if (val) { setError(val); return; }

    setSubmitting(true);
    try {
      const payload = {
        email:                  form.email,
        charachter_name:        form.charachter_name,
        gender:                 buildGender(),
        age:                    form.age,
        charachter_bio:         form.charachter_bio,
        charachter_desc:        form.charachter_desc,
        supporting_charachters: buildSupportingChars(),
        world_setting:          buildWorldSetting(),
        world_theme:            form.world_theme,
        artistic_style:         buildArtisticStyle(),
        time_era:               buildTimeEra(),
        structure:              buildStructure(),
        problem:                form.problem,
        moral:                  buildMoral(),
        relevant_struggles:     buildStruggles(),
        book_title:             form.book_title,
        dedication:             form.dedication,
        opening_note:           form.opening_note,
        colophon:               form.colophon,
      };

      const res  = await fetch("/api/pagecub/create-book", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "We could not start checkout. Please try again.");

      const url = data.checkoutUrl || data.url;
      if (url) { window.location.href = url; return; }

      throw new Error("Checkout did not return a redirect URL. Please try again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function advance() {
    const val = validateStep(step, form, permission);
    if (val) { setError(val); return; }
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(s => Math.min(steps.length - 1, s + 1));
  }

  function back() {
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(s => Math.max(0, s - 1));
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl">
      <div className="rounded-[2rem] border border-line bg-card p-5 shadow-soft md:p-8">

        {/* Header + progress */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-bold text-sage">Create a PageCub book</p>
            <h1 className="display mt-2 text-4xl font-bold md:text-5xl">{steps[step]}</h1>
          </div>
          <p className="text-sm font-bold text-ink/60">Step {step + 1} of {steps.length}</p>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-honey transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold text-ink/55 md:grid-cols-5">
          {steps.map((label, i) => (
            <span key={label} className={i === step ? "text-ink" : ""}>{label}</span>
          ))}
        </div>

        {/* ── Step 0: Child ──────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="mt-10 grid gap-6">

            {/* Email captured here — first field */}
            <div className="rounded-2xl border border-honey/50 bg-honey/10 p-4">
              <Field label="Your email address" type="email" required
                placeholder="you@example.com"
                hint="We'll send your finished book here. We never share your email."
                value={form.email} onChange={v => update("email", v)} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Child's name" required
                placeholder="Milo"
                hint="Their real name, nickname, or a fictional name."
                value={form.charachter_name} onChange={v => update("charachter_name", v)} />

              <div>
                <SelectField label="Gender" required value={form.gender} onChange={v => update("gender", v)} options={GENDER_OPTIONS} />
                {form.gender === "Other" && (
                  <Field label="Describe" required placeholder="They/them, prefers no label…"
                    value={form.gender_custom} onChange={v => update("gender_custom", v)} className="mt-3" />
                )}
              </div>

              <Field label="Age" required
                placeholder="6"
                hint="Any age — children, teens, adults. Numbers or words both fine."
                value={form.age} onChange={v => update("age", v)} />

              <Field label="What does this child look like?" required textarea
                placeholder="Curly brown hair, bright green eyes, freckles, usually wearing a yellow raincoat and muddy boots."
                hint="Hair, eyes, skin tone, outfit, anything distinctive."
                value={form.charachter_desc} onChange={v => update("charachter_desc", v)} />

              <Field label="About this child" required textarea
                placeholder="Milo is a thoughtful 6-year-old who loves bugs, maps, and exploring outside, but gets nervous trying new things alone. He has an infectious laugh and always has a question ready."
                hint="Personality, hobbies, quirks, what they love, what scares them, what makes them special."
                value={form.charachter_bio} onChange={v => update("charachter_bio", v)} />
            </div>

            {/* Supporting characters */}
            <div>
              <p className="mb-1 text-sm font-bold">Supporting characters <span className="font-normal text-ink/50">(optional)</span></p>
              <p className="mb-4 text-xs text-ink/50">People, animals, or creatures who appear alongside {form.charachter_name || "the main character"}.</p>
              <div className="grid gap-4">
                {supportingChars.map((ch, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-cream p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-ink/45">Character {i + 1}</p>
                      {supportingChars.length > 1 && (
                        <button type="button" onClick={() => removeChar(i)} className="text-ink/40 hover:text-red-500 transition">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Name" placeholder="Nana Rose" value={ch.name} onChange={v => updateChar(i, "name", v)} />
                      <Field label="Role / relationship" placeholder="Grandmother, best friend, dog…" value={ch.role} onChange={v => updateChar(i, "role", v)} />
                      <Field label="Personality" placeholder="Kind and wise, always knows the right thing to say." value={ch.personality} onChange={v => updateChar(i, "personality", v)} />
                      <Field label="Appearance" placeholder="Silver hair, round glasses, smells like cinnamon." value={ch.appearance} onChange={v => updateChar(i, "appearance", v)} />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addChar}
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sage hover:text-ink transition">
                <Plus className="h-4 w-4" /> Add another character
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Story ──────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="mt-10 grid gap-6">
            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <SelectField label="Narrative structure" required
                  value={form.structure} onChange={v => update("structure", v)}
                  options={STRUCTURE_OPTIONS}
                  hint="Linear 3-act works for most — change it only if you have a specific vision." />
                {form.structure === "Other" && (
                  <Field label="Describe the structure" required
                    placeholder="A mystery that unravels backward from the ending…"
                    value={form.structure_custom} onChange={v => update("structure_custom", v)} className="mt-3" />
                )}
              </div>

              <Field label="Main challenge" required textarea
                placeholder="Milo wants to explore the woods but is afraid to go too far alone."
                hint="What problem, obstacle, or fear does the main character face?"
                value={form.problem} onChange={v => update("problem", v)} />

              <div className="md:col-span-2">
                <SelectField label="Moral / lesson" required
                  value={form.moral} onChange={v => update("moral", v)}
                  options={MORAL_OPTIONS}
                  hint="The takeaway the child should feel after the last page." />
                {form.moral === "Other" && (
                  <Field label="Write your own moral" required
                    placeholder="Small brave steps can lead to big adventures."
                    value={form.moral_custom} onChange={v => update("moral_custom", v)} className="mt-3" />
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-bold">Real-world struggles this story speaks to <span className="font-normal text-ink/50">(optional)</span></p>
              <p className="mb-4 text-xs text-ink/50">These emotional parallels help the story land the way it needs to. Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {STRUGGLE_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleStruggle(s)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      form.relevant_struggles.includes(s)
                        ? "border-sage bg-sage text-white"
                        : "border-line bg-cream text-ink hover:border-sage/50"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {form.relevant_struggles.includes("Other") && (
                <Field label="Describe the specific struggle" required
                  placeholder="Adjusting to a new sibling…"
                  value={form.struggles_other} onChange={v => update("struggles_other", v)} className="mt-3" />
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: World ──────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-10 grid gap-7">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <SelectField label="Where does the story happen?" required
                  value={form.world_setting} onChange={v => update("world_setting", v)}
                  options={WORLD_SETTING_OPTIONS} />
                {form.world_setting === "Other" && (
                  <Field label="Describe the setting" required
                    placeholder="A quiet woodland behind the family's cottage."
                    value={form.world_setting_custom} onChange={v => update("world_setting_custom", v)} className="mt-3" />
                )}
              </div>

              <div>
                <SelectField label="Time period" required
                  value={form.time_era} onChange={v => update("time_era", v)}
                  options={TIME_ERA_OPTIONS} />
                {form.time_era === "Other" && (
                  <Field label="Describe the era" required
                    placeholder="Far-future city with flying boats…"
                    value={form.time_era_custom} onChange={v => update("time_era_custom", v)} className="mt-3" />
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-bold">World themes</p>
              <p className="mb-4 text-xs text-ink/50">Choose all that feel right — these shape the emotional tone.</p>
              <div className="flex flex-wrap gap-2">
                {WORLD_THEMES.map(t => (
                  <button key={t} type="button" onClick={() => toggleTheme(t)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      form.world_theme.includes(t)
                        ? "border-sage bg-sage text-white"
                        : "border-line bg-cream text-ink hover:border-sage/50"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-bold">Illustration style</p>
              <p className="mb-4 text-xs text-ink/50">Applied consistently across all 20 illustrations in your book.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STYLE_OPTIONS.map(style => {
                  const isOther    = style === "Other — describe your own";
                  const isSelected = form.artistic_style === style;
                  return (
                    <button key={style} type="button" onClick={() => update("artistic_style", style)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-honey bg-honey/20 shadow-button"
                          : "border-line bg-cream hover:border-honey/50"
                      }`}>
                      {!isOther && <span className="block h-12 rounded-xl bg-gradient-to-br from-honey/60 via-card to-sage/50" />}
                      {isOther  && <span className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-line text-2xl">✏️</span>}
                      <span className="mt-3 block text-sm font-bold leading-snug">{style}</span>
                      {isOther && <span className="mt-1 block text-xs font-normal text-ink/45">Vintage Soviet children&apos;s book, cut-paper collage, woodblock print…</span>}
                      {isSelected && !isOther && <span className="mt-1 block text-xs font-bold text-honey">Selected ✓</span>}
                    </button>
                  );
                })}
              </div>
              {form.artistic_style === "Other — describe your own" && (
                <Field label="Describe the illustration style" required className="mt-4"
                  placeholder="Vintage Soviet children's book illustration: bold flat shapes, limited 4-color palette, strong graphic compositions."
                  hint="Be as specific as you like. This description will be applied consistently to all 20 illustrations."
                  value={form.artistic_style_custom} onChange={v => update("artistic_style_custom", v)} textarea />
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Personal touches ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="mt-10">
            <div className="mb-6 rounded-2xl bg-cream p-4 text-sm font-bold text-ink/70">
              All fields below are optional. Leave them blank and PageCub will write warm, fitting defaults.
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Custom book title"
                placeholder="Milo and the Map to Everywhere"
                hint="Leave blank and PageCub will invent one that fits the story."
                value={form.book_title} onChange={v => update("book_title", v)} />

              <Field label="Dedication" textarea
                placeholder={`"For Milo, who is braver than he knows."`}
                hint="A short personal note — who the book is for. Appears on its own page at the front."
                value={form.dedication} onChange={v => update("dedication", v)} />

              <Field label="Opening note" textarea
                placeholder={`"This story was written just for you. Every adventure starts with one brave step."`}
                hint="A message from you to the reader — appears before Chapter 1."
                value={form.opening_note} onChange={v => update("opening_note", v)} />

              <Field label="Colophon" textarea
                placeholder={`"Created with love in Fort Wayne, Indiana, 2026."`}
                hint="A brief note about the book's origin — appears on the last page."
                value={form.colophon} onChange={v => update("colophon", v)} />
            </div>
          </div>
        )}

        {/* ── Step 4: Review ─────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="mt-10 grid gap-6">
            <div className="rounded-2xl border border-honey/30 bg-honey/10 p-4 text-sm font-bold text-ink/70">
              Sending to: <span className="text-ink">{form.email}</span>
            </div>

            <div className="rounded-2xl border border-line bg-cream p-5">
              <h2 className="display text-2xl font-bold">Review your book details</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {buildReviewRows(form, buildSupportingChars(), buildWorldSetting(), buildTimeEra(), buildMoral(), buildStructure()).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/76">
                      {value || <span className="italic text-ink/30">Not provided</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-cream p-4 text-sm text-ink/70 leading-relaxed">
              <p><strong>What you get:</strong> A 48-page personalized illustrated storybook — 10 chapters, 2 text pages + 2 illustrations per chapter (20 illustrations total), plus a title page, dedication, opening note, and closing pages. Delivered as a PDF. Print fulfillment coming soon.</p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={permission}
                onChange={e => setPermission(e.target.checked)}
                className="mt-1 h-5 w-5 accent-sage" />
              <span>I am the parent/guardian or have permission to create this book featuring the child described above.</span>
            </label>

            <p className="text-sm text-ink/50 text-center">
              Clicking &ldquo;Create My Book&rdquo; takes you to secure checkout. Your book generation begins immediately after payment ($20.00).
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-10 flex flex-wrap justify-between gap-4">
          <button type="button" onClick={back}
            disabled={step === 0 || submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-card px-5 py-3 text-sm font-bold disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < steps.length - 1 ? (
            <button type="button" onClick={advance}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button">
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={submitting}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-honey px-6 py-3 text-sm font-bold text-ink shadow-button disabled:opacity-60">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Going to checkout…</>
                : <><Check className="h-4 w-4" /> Create My Book — $20</>
              }
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildReviewRows(
  form: FormState, supportingChars: string,
  worldSetting: string, timeEra: string, moral: string, structure: string,
): [string, string][] {
  return [
    ["Child", `${form.charachter_name}${form.age ? `, age ${form.age}` : ""}`],
    ["Gender", form.gender === "Other" ? form.gender_custom : form.gender],
    ["Appearance", form.charachter_desc],
    ["About them", form.charachter_bio],
    ["Supporting characters", supportingChars],
    ["Story structure", structure],
    ["Challenge", form.problem],
    ["Moral / lesson", moral],
    ["Real-world struggles", form.relevant_struggles.filter(s => s !== "Other").concat(
      form.relevant_struggles.includes("Other") && form.struggles_other ? [form.struggles_other] : []
    ).join(", ")],
    ["Setting", worldSetting],
    ["Time period", timeEra],
    ["World themes", form.world_theme.join(", ")],
    ["Illustration style", form.artistic_style === "Other — describe your own" ? form.artistic_style_custom : form.artistic_style],
    ["Custom title", form.book_title],
    ["Dedication", form.dedication],
    ["Opening note", form.opening_note],
    ["Colophon", form.colophon],
  ];
}

function validateStep(step: number, form: FormState, permission: boolean): string {
  if (step === 0) {
    if (!form.email.trim())           return "Please enter your email address.";
    if (!form.charachter_name.trim()) return "Please enter the child's name.";
    if (!form.gender)                 return "Please select a gender option.";
    if (form.gender === "Other" && !form.gender_custom.trim()) return "Please describe the gender.";
    if (!form.age.trim())              return "Please enter an age.";
    if (!form.charachter_desc.trim()) return "Please describe what the child looks like.";
    if (!form.charachter_bio.trim())  return "Please tell us a bit about the child.";
  }
  if (step === 1) {
    if (!form.structure)              return "Please choose a narrative structure.";
    if (form.structure === "Other" && !form.structure_custom.trim()) return "Please describe the structure.";
    if (!form.problem.trim())         return "Please describe the main challenge.";
    if (!form.moral)                  return "Please choose a moral or lesson.";
    if (form.moral === "Other" && !form.moral_custom.trim()) return "Please write your own moral.";
  }
  if (step === 2) {
    if (!form.world_setting)          return "Please choose a setting.";
    if (form.world_setting === "Other" && !form.world_setting_custom.trim()) return "Please describe the setting.";
    if (!form.time_era)               return "Please choose a time period.";
    if (form.time_era === "Other" && !form.time_era_custom.trim()) return "Please describe the time period.";
    if (form.world_theme.length === 0) return "Please choose at least one world theme.";
    if (!form.artistic_style)         return "Please choose an illustration style.";
    if (form.artistic_style === "Other — describe your own" && !form.artistic_style_custom.trim())
      return "Please describe your custom illustration style.";
  }
  if (step === 4) {
    // re-validate all steps
    for (const s of [0, 1, 2]) {
      const v = validateStep(s, form, permission);
      if (v) return v;
    }
    if (!permission) return "Please confirm you have permission to create this book.";
  }
  return "";
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, hint, textarea, required, type = "text", className,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; textarea?: boolean; required?: boolean;
  type?: string; className?: string;
}) {
  const base = "mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink placeholder-ink/30 outline-none transition focus:border-sage focus:bg-card";
  return (
    <label className={`block text-sm font-bold${className ? " " + className : ""}`}>
      {label}
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          required={required} rows={4} placeholder={placeholder}
          className={base + " resize-none"} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          required={required} placeholder={placeholder} className={base} />
      )}
      {hint && <span className="mt-1 block text-xs font-normal text-ink/45">{hint}</span>}
    </label>
  );
}

function SelectField({
  label, value, onChange, options, required, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean; hint?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)} required={required}
        className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink outline-none transition focus:border-sage focus:bg-card">
        <option value="">Choose one…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <span className="mt-1 block text-xs font-normal text-ink/45">{hint}</span>}
    </label>
  );
}
