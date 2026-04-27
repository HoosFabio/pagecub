# PageCub Codex Frontend Handoff

_Written: 2026-04-27_

## Summary

Codex built the first frontend scaffold for PageCub as a Next.js 14 App Router + Tailwind CSS application. The work is frontend-only. No API routes were created.

The implementation follows `docs/pagecub-spec.md` and uses the Aurelia sample material from:

- `docs/aurelia-sample-spreads.md`
- `docs/aurelia-sample-output.json`

The site is designed as a warm, parent-friendly product experience for ordering personalized illustrated children's storybooks. Public copy avoids technical backend language and does not mention AI, LLMs, agents, StoryForge, MindStudio, pipelines, or workflows.

## Pages Built

- `/`
- `/create`
- `/status/[token]`
- `/samples`
- `/how-it-works`
- `/pricing`
- `/faq`
- `/about`
- `/privacy`
- `/terms`

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

If `statusToken` is returned without a checkout URL, the frontend redirects to `/status/[statusToken]`.

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

The frontend currently recognizes `status === "done"` as completion.

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

The local dev server responded at:

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
