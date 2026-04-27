# PageCub

**pagecub.com** — Personalized illustrated children's storybooks.

A custom adventure built around your child: their name, personality, world, and the lesson you want them to carry with them.

---

## Repo Structure

```
/docs
  pagecub-spec.md              — Full product spec, architecture, design system, all page specs
  aurelia-sample-spreads.md    — Sample chapter spreads from a real Aurelia run (chapters 1, 3, 5)
  aurelia-sample-output.json   — Raw JSON output from a real completed StoryForge run
```

## Stack

- **Next.js 14** App Router
- **Tailwind CSS**
- **Backend:** Shared InkSynth Supabase + MindStudio pipeline (do not replicate — see spec)

## Dev Notes

- Frontend only in this repo. API routes are built and maintained by Lumen (see spec Division of Labor).
- **Do not rename** any payload keys like `charachter_name` — typos are intentional, must match backend variables.
- **Do not expose** StoryForge, MindStudio, or agent names anywhere on the public site.
- Pricing is not hardcoded until Stripe is configured.

