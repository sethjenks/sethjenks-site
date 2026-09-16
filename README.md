# Seth Jenks

Visual-forward chronological log. The home page reads JSON entries, sorts them, groups them by day, and leads with media plus type — not a plain text blog.

Intended production domain later: **sethjenks.com**. DNS is deferred — this repo does not configure live custom-domain records.

Paper will later be the UI design source and the place media is exported from. v1 uses sample files under `public/media/`.

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
3. Put images or videos in `public/media/` (or similar) and point `media.src` at that public path.
4. Fill the locked fields:

```json
{
  "id": "kebab-case-slug",
  "date": "2026-09-15",
  "title": "A short title",
  "summary": "One or two curated sentences. Never paste raw chat.",
  "tags": ["personal"],
  "media": {
    "src": "/media/kebab-case-slug.jpg",
    "alt": "What the frame shows.",
    "type": "image"
  },
  "paperRef": "paper://entries/kebab-case-slug"
}
```

- `id` must be unique kebab-case and match the filename slug.
- `date` must match the filename date (`YYYY-MM-DD`).
- `summary` is curated copy, 1–2 sentences.
- `tags` is optional. Prefer `Arcana`, `Philo`, or `personal`.
- `media` is optional. `src` is required; `alt` is optional; `type` is `"image"` or `"video"` (defaults to image).
- `paperRef` is agents-only. The public page does not render it.

The site reads every `content/entries/*.json` file, sorts by date descending then `id`, and groups by day for display (newest day first).

## Deploy

This is a standard Next.js App Router app and can deploy on Vercel from this Origin repo. GitHub is not required. Custom-domain DNS for sethjenks.com is out of scope until the Origin ↔ Vercel connection is in place.
