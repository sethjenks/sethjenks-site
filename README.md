# Seth Jenks

Personal chronological feed. First milestone: read JSON entries and render them on the home page, grouped by day.

Intended production domain later: **sethjenks.com**. DNS is deferred — this repo does not configure live custom-domain records.

## Run locally

```bash
pnpm install
pnpm dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127). `npm install` and `npm run dev` work the same way if you prefer npm.

```bash
pnpm build
```

## Add an entry

1. Create a file at `content/entries/YYYY-MM-DD-<slug>.json`.
2. Dates are calendar days in **America/Denver**.
3. Fill the locked fields:

```json
{
  "id": "kebab-case-slug",
  "date": "2026-09-15",
  "title": "A short title",
  "summary": "One or two curated sentences. Never paste raw chat.",
  "tags": ["personal"]
}
```

- `id` must be unique kebab-case and match the filename slug.
- `date` must match the filename date (`YYYY-MM-DD`).
- `summary` is curated copy, 1–2 sentences.
- `tags` is optional. Prefer `Arcana`, `Philo`, or `personal`.

The site reads every `content/entries/*.json` file, sorts by date descending then `id`, and groups by day for display (newest day first).

## Deploy

This is a standard Next.js App Router app and can deploy on Vercel from this Origin repo. GitHub is not required. Custom-domain DNS for sethjenks.com is out of scope until the Origin ↔ Vercel connection is in place.
