# PageCub Codex Frontend Handoff

_Written: 2026-04-27_

## Summary

Codex built the first frontend scaffold for PageCub as a Next.js 14 App Router + Tailwind CSS application. The work is frontend-only. No API routes were created.

The implementation follows `docs/pagecub-spec.md` and uses the Aurelia sample material from:

- `docs/aurelia-sample-spreads.md`
- `docs/aurelia-sample-output.json`

The site is designed as a warm, parent-friendly product experience for ordering personalized illustrated children's storybooks. Public copy avoids technical backend language and does not mention AI, LLMs, agents, StoryForge, MindStudio, pipelines, or workflows.

## Local Project

Local working directory:

```text
C:\Users\Fabian Lemp\Documents\Codex\pagecub
```

Important files added:

```text
app/layout.tsx
app/globals.css
app/page.tsx
app/create/page.tsx
app/status/[token]/page.tsx
app/samples/page.tsx
app/how-it-works/page.tsx
app/pricing/page.tsx
app/faq/page.tsx
app/about/page.tsx
app/privacy/page.tsx
app/terms/page.tsx
components/CreateWizard.tsx
components/StatusClient.tsx
components/SiteHeader.tsx
components/Footer.tsx
components/ButtonLink.tsx
lib/content.ts
package.json
tailwind.config.ts
next.config.mjs
postcss.config.mjs
tsconfig.json
.eslintrc.json
.gitignore
```

## Pages Built

### `/`

Homepage with all required sections:

1. Sticky nav
2. Hero with CTAs and book mockup visual
3. "More than a name in a template" differentiator
4. How it works
5. Sample preview
6. Use cases
7. About Aurelia
8. Trust/privacy reassurance
9. Pricing preview without hardcoded pricing
10. FAQ preview
11. Final CTA and footer

### `/create`

Five-step create wizard:

1. Child
2. Story
3. World
4. Personal
5. Review

The wizard stores form data client-side, validates required steps before moving forward, shows a clean review summary, requires a parent/guardian permission checkbox, then posts the final payload to the backend.

### `/status/[token]`

Client-side polling status page. It polls every 5 seconds:

```text
GET /api/pagecub/status/[token]
```

Public progress stages:

```text
Building the story world
Writing the chapters
Creating the illustrations
Preparing the book pages
Assembling your storybook
Ready to view
```

The page displays:

```text
Your book is being created. This can take 15-20 minutes.
```

When status is `done`, it shows View and Download buttons if the backend returns URLs.

### `/samples`

Sample book page using the Aurelia run. It shows chapters 1, 3, and 5 with left-page text and right-page illustration.

### Other Pages

Also implemented:

```text
/how-it-works
/pricing
/faq
/about
/privacy
/terms
```

Privacy and terms are placeholders and should be replaced with final legal copy before launch.

## Backend API Expectations

### Create Book

Frontend posts to:

```text
POST /api/pagecub/create-book
Content-Type: application/json
```

Expected successful response can be either:

```json
{
  "checkoutUrl": "https://..."
}
```

or:

```json
{
  "url": "https://..."
}
```

The frontend redirects to `checkoutUrl` first, then `url`.

As a fallback, the frontend also supports:

```json
{
  "statusToken": "uuid-or-token"
}
```

If `statusToken` is returned without a checkout URL, the frontend redirects to:

```text
/status/[statusToken]
```

Expected error response:

```json
{
  "message": "Human-readable error"
}
```

### Status

Frontend polls:

```text
GET /api/pagecub/status/[token]
```

Supported response shape:

```json
{
  "status": "generating",
  "stage": "Writing the chapters",
  "message": "Optional human-readable message"
}
```

When complete:

```json
{
  "status": "done",
  "stage": "Ready to view",
  "previewUrl": "https://...",
  "downloadUrl": "https://..."
}
```

The frontend currently recognizes `status === "done"` as completion. If the backend uses additional statuses like `failed`, they can be surfaced later with a small UI branch.

## Payload Contract

The frontend submits exactly this object shape from `components/CreateWizard.tsx`.

Important: the misspellings are intentional and were preserved exactly for backend compatibility.

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

Fields gathered by step:

```text
Step 1 - Child
charachter_name
gender
age
charachter_bio
charachter_desc
supporting_charachters

Step 2 - Story
structure
problem
moral
relevant_struggles

Step 3 - World
world_setting
world_theme
time_era
artistic_style

Step 4 - Personal Touches
book_title
dedication
opening_note
colophon

Step 5 - Review
email
permission checkbox, not submitted
```

The permission checkbox is required in the frontend but is not currently included in the submitted payload because it is not part of the spec payload contract.

## Public Copy Constraints Followed

The frontend does not hardcode pricing.

Physical book references use:

```text
Print fulfillment coming soon.
```

The frontend avoids public mentions of:

```text
AI
LLM
agent
StoryForge
MindStudio
pipeline
workflow
```

Note: package/build artifacts may contain unrelated dependency text after install/build, but app source was scanned.

## Design System

Tailwind colors match the spec:

```text
Background: #FFF8EF
Text:       #243044
Accent:     #E8A84F
Secondary:  #7FA58A
Card:       #FFFFFF
Border:     #E8DCCB
```

Typography:

- Headings use a warm serif stack via the `.display` class and heading selectors.
- Body uses a clean system sans-serif stack.

Overall design uses soft cards, rounded controls, warm spacing, book-preview motifs, and large clear buttons.

## Verification

Commands run locally:

```bash
npm.cmd install --no-audit --no-fund
npm.cmd run lint
npm.cmd run build
```

Results:

```text
Lint: passed
Production build: passed
```

The local dev server was started and responded at:

```text
http://localhost:3000
```

## Known Notes / Next Backend Work

Backend still needs to implement:

```text
/api/pagecub/create-book
/api/pagecub/status/[token]
Stripe checkout creation
Stripe webhook handling
Order persistence
Status token generation and lookup
MailerSend confirmation and delivery emails
PDF delivery/download URLs
```

Frontend assumes payment begins generation. The create form alone does not start generation.

## Git / Repo Note

The target repo is:

```text
HoosFabio/pagecub
```

This environment did not have `git` installed on PATH, so Codex created and verified the frontend locally. The GitHub connector was used to upload the scaffold to `main`.
