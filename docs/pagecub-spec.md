# PageCub — Launch SOP & Migration Plan

_Written: 2026-04-26_
_Status: Pre-build. Nothing started yet._

---

## What PageCub Is

pagecub.com — standalone public-facing product site for the StoryForge pipeline. Warm, parent-friendly, keepsake-positioned children's book generator. Separate brand from InkSynth. InkSynth is optional footer attribution only.

**Domain:** pagecub.com (purchased 2026-04-26)
**Brand:** PageCub
**Internal engine:** StoryForge (never say this on the public site)
**Parent company:** InkSynth (footer only)

---

## Architecture Decision Log

| Decision | Choice | Reasoning |
|---|---|---|
| Repo | `HoosFabio/pagecub` — separate repo | Clean deploy history, no inksynth breakage risk |
| Hosting | Netlify, same account as inksynth | Shared account, separate site |
| Backend | Shared — same Supabase tables, same MindStudio agents | No duplication, pagecub is a different front door |
| Auth | No login required | Lower friction for parents |
| Payment gate | Stripe payment BEFORE generation fires | Blocks freeloaders, Stripe email = identity |
| Status tracking | Unique private link emailed post-payment | Link IS their session — no account needed |
| Delivery | PDF emailed via MailerSend when done | User walks away after submit, email arrives |
| Pricing | TBD — do not hardcode yet | ~$5/run cost, $15-25 target, decide at launch |
| POD | Lulu API — not built yet | Note on site: "Print fulfillment coming soon" |
| Accounts | Not in MVP — add later if needed | Order history, reorder, etc. can come later |

---

## Fabian's Manual Prerequisites (before any build starts)

1. **Create GitHub repo:** `HoosFabio/pagecub`
2. **Re-establish Codex connection** to the new repo (manual Codex setup)
3. **Create Netlify site** pointed at `HoosFabio/pagecub`
4. **Connect pagecub.com domain** to new Netlify site
5. **Set up Stripe product** for PageCub (separate from InkSynth Stripe if desired, or same account)

---

## Division of Labor

### Codex builds (frontend scaffolding)
Give Codex the spec below. It should NOT touch API routes or backend wiring.

- Homepage (all sections — see Homepage Structure below)
- Multi-step create form wizard (5 steps)
- Review/confirm page
- Status/polling page
- Sample books page
- FAQ page
- About/Safety page
- Privacy page
- Terms page

### Lumen builds (backend wiring)
- `/api/pagecub/create-book` — Stripe checkout session creation + form payload storage
- Stripe webhook handler — on payment confirmed, create `tool_run` + `sf_run`, fire Foundation Agent
- `/api/pagecub/status/[token]` — polling endpoint using unique token
- Unique token generation + storage (maps token → run_id)
- MailerSend email: confirmation on submit, PDF delivery on completion
- Netlify env vars
- Supabase wiring (reusing existing tables)
- PDF delivery endpoint (once PDF packager is built)

---

## Payment Flow (detailed)

```
User fills multi-step form → Review page → "Create My Book" button
    ↓
Frontend calls /api/pagecub/create-book
    - Saves form payload to Supabase (new table: pagecub_orders, status=pending_payment)
    - Creates Stripe checkout session with order_id in metadata
    - Returns Stripe checkout URL
    ↓
User completes Stripe checkout
    ↓
Stripe webhook → /api/pagecub/stripe-webhook
    - Verifies payment
    - Retrieves order from pagecub_orders
    - Creates tool_run + sf_run
    - Fires Foundation Agent with callbackUrl
    - Generates unique status token (UUID), stores in pagecub_orders
    - Sends confirmation email via MailerSend with status link
    - Sets pagecub_orders.status = generating
    ↓
Generation pipeline runs (existing StoryForge flow)
    ↓
On completion (status=done in tool_runs):
    - PDF packager fires (once built)
    - MailerSend sends PDF delivery email
    - Status page shows download link
```

---

## New Supabase Table Needed

```sql
CREATE TABLE pagecub_orders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id text,
  stripe_payment_intent text,
  email         text NOT NULL,
  status        text DEFAULT 'pending_payment',
  -- pending_payment | paid | generating | done | failed
  tool_run_id   uuid REFERENCES tool_runs(id),
  sf_run_id     uuid REFERENCES sf_runs(id),
  status_token  uuid DEFAULT gen_random_uuid(),
  input_payload jsonb,
  amount_paid   integer, -- in cents
  currency      text DEFAULT 'usd',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
```

Run this migration when ready to build.

---

## Netlify Env Vars Needed (pagecub site)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MINDSTUDIO_API_KEY
STORYFORGE_AGENT_ID          = a271929c-9cd0-4751-b21f-1f43c2d5e824
STORYFORGE_CHAPTER_AGENT_ID  = 1421a93f-f05c-4d19-9184-e2af13b48c41
STORYFORGE_MATTER_AGENT_ID   = 1fd15183-6f6d-4549-ac11-1da1f72f6c24
MAILERSEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID              (create in Stripe dashboard — price for one book)
APP_URL                      = https://pagecub.com
```

---

## Codex Task Spec (write this when ready to hand off)

**Repo:** HoosFabio/pagecub
**Stack:** Next.js 14 App Router, Tailwind CSS
**No backend — frontend only. Do not create API routes.**

### Brand & Design
- **Name:** PageCub
- **Tagline:** A custom illustrated adventure made around your child.
- **Tone:** warm, trustworthy, parent-friendly, giftable. Not technical. Not AI-forward.
- **Never say:** AI, LLM, agent, pipeline, workflow, StoryForge, MindStudio
- **Say instead:** create, build, personalize, illustrate, storybook, keepsake, custom book

**Color palette:**
```
Background:  #FFF8EF
Text:        #243044
Accent:      #E8A84F  (honey/amber)
Secondary:   #7FA58A  (sage green)
Card:        #FFFFFF
Border:      #E8DCCB
```

**Typography:**
- Headings: warm rounded serif or display serif
- Body: clean humanist sans-serif
- No childish fonts for body text

**Layout:** large whitespace, rounded cards, soft shadows, book-preview motifs, big clear buttons

### Pages to Build

**1. Homepage (`/`)**
- Sticky nav: logo | How it works | Samples | Pricing | FAQ | [Start a Book] button
- Hero: headline + subheadline + two CTAs (Start a Book / See a Sample) + book mockup visual
- Differentiator section: "More than a name in a template" — 4 feature cards
- How it works: 4 steps (Tell us about the child / We build the story / Review the result / Keep or gift it)
- Sample preview section (placeholder — link to /samples)
- Use cases: 6 cards (Birthday gift / Bedtime adventure / Grandparent keepsake / New sibling / Starting school / Bravery story)
- About Aurelia section (see copy below)
- Trust/privacy reassurance section
- Pricing preview (placeholder cards — do not hardcode prices)
- FAQ preview (5-6 questions)
- Final CTA

**Aurelia section copy:**
> You'll notice most of our examples follow the same little girl, Aurelia. That's my daughter. I originally built PageCub because I wanted to make her books — stories built around whatever she was going through, whatever she was into, whatever she couldn't find on the shelf. She was the first reader. She still is.

**2. Create Book (`/create`)**
Multi-step wizard. Progress bar: Child → Story → World → Personal → Review

Step 1 — Child:
- Child's name → `charachter_name` (keep typo in payload key, label is clean)
- Pronouns/gender → `gender`
- Age → `age`
- A few things about them → `charachter_bio`
- What do they look like? → `charachter_desc`
- Other characters to include → `supporting_charachters` (keep typo in payload key)

Step 2 — Story:
- Story shape → `structure` (dropdown: Linear adventure / Mystery / Quest / Bedtime journey)
- Main challenge → `problem`
- What should the story gently teach? → `moral`
- Any real-life situation to echo? (optional) → `relevant_struggles`

Step 3 — World:
- Where does the story happen? → `world_setting`
- What kind of world? → `world_theme` (multi-select chips)
- Time period → `time_era`
- Illustration style → `artistic_style` (style cards with small visuals)

Step 4 — Personal Touches (all optional):
- Custom title (leave blank for PageCub to write one) → `book_title`
- Dedication → `dedication`
- Opening note → `opening_note`
- Colophon note → `colophon`
- Help text: "Leave these blank and PageCub will write gentle defaults."

Step 5 — Review:
- Clean summary of all inputs
- CTA: "Create My Book"
- Microcopy: "You'll be able to preview the finished book before ordering any printed copy."
- Checkbox: "I am the parent/guardian or have permission to create this book."

On submit: POST to `/api/pagecub/create-book` (backend — do not build this route, just wire the fetch call)

**3. Status page (`/status/[token]`)**
- Soft progress display (no raw agent names)
- Stages: Building the story world / Writing the chapters / Creating the illustrations / Preparing the book pages / Assembling your storybook / Ready to view
- "Your book is being created. This can take 15–20 minutes."
- When done: View / Download buttons
- Poll `/api/pagecub/status/[token]` every 5 seconds

**4. Samples (`/samples`)**
- Show 2–3 sample spreads from Aurelia run
- Left page: chapter text. Right page: illustration.
- Chapter list
- Aurelia story copy (see above)
- CTA: Start a Book

**5. How It Works (`/how-it-works`)** — expand the homepage section into a full page

**6. Pricing (`/pricing`)** — placeholder cards, no hardcoded prices

**7. FAQ (`/faq`)** — full FAQ page

**8. About / Safety (`/about`)** — trust and privacy page

**9. Privacy (`/privacy`)** — legal page placeholder

**10. Terms (`/terms`)** — legal page placeholder

### Payload Contract
Frontend submits exactly this shape on review confirmation:
```json
{
  "email": "parent@example.com",
  "charachter_name": "",
  "gender": "",
  "age": "",
  "charachter_bio": "",
  "charachter_desc": "",
  "supporting_charachters": "",
  "world_setting": "",
  "world_theme": [],
  "artistic_style": "",
  "time_era": "",
  "structure": "",
  "problem": "",
  "moral": "",
  "relevant_struggles": "",
  "book_title": "",
  "dedication": "",
  "opening_note": "",
  "colophon": ""
}
```

**Critical:** Do not rename backend variables like `charachter_name`. Frontend labels can be clean English. Payload keys must match exactly.

---

## Homepage Structure (full)

See Codex task above. All sections in order:
1. Sticky nav
2. Hero
3. Differentiator ("More than a name in a template")
4. How it works (4 steps)
5. Sample preview
6. Use cases (6 cards)
7. About Aurelia (founder story)
8. Trust / privacy reassurance
9. Pricing preview
10. FAQ preview
11. Final CTA + footer

---

## Key Constraints / Warnings

- **Do not rename `charachter_name`** or any backend variable. The typo is intentional — it matches MindStudio agent input variable names throughout the pipeline.
- **Do not promise exact timing** — say "15–20 minutes" not "2 minutes."
- **Do not overpromise POD** — say "Print fulfillment coming soon" until Lulu is actually wired.
- **Do not expose StoryForge, MindStudio, or agent names** anywhere on the public site.
- **Do not hardcode pricing** until Stripe product is configured and pricing is decided.
- **Payment fires generation** — form submission alone does not start the pipeline.

---

## Content Still Needed Before Launch

- [ ] Final pricing decision
- [ ] Stripe product + price ID created
- [ ] Sample book spreads exported (Aurelia run — chapter 1, chapter 3, cover)
- [ ] Legal pages (Privacy, Terms) — Fabian to draft or use template
- [ ] FAQ copy finalized
- [ ] MailerSend email templates: confirmation + delivery
- [ ] Lulu POD status decision (is it live or "coming soon" at launch?)
- [ ] PDF packager built and tested end-to-end

---

## When to Launch

Not before:
- PDF packager working end-to-end
- Email delivery tested
- Stripe payment flow tested
- At least one polished sample book available for the samples page
- Legal pages in place (child data collection requires this)

---

_File: `docs/projects/pagecub-launch-sop.md`_
_Next reference: when Codex is reconnected and Fabian creates HoosFabio/pagecub repo_
