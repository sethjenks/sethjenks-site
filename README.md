# Seth Jenks

Minimal chronological log. Visual language is locked in `DESIGN.md`. The UI is designed in code. Paper is only for optional media exports (PNG/JPG/SVG/MP4 into `public/media/`, referenced by `media.src`). There is no Paper iframe.

Type: Geist Sans (UI, titles, body), Geist Mono (day stamps, tech labels), Geist Pixel Square (eyebrows and flourishes only). No Geist Serif. No Inter.

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
3. If you have a media export, put it in `public/media/` and point `media.src` at that public path.
4. Fill the locked fields:

```json
{
  "id": "kebab-case-slug",
  "date": "2026-09-15",
  "title": "A short title",
  "summary": "One or two curated sentences. Never paste raw chat.",
  "tags": ["personal"],
  "media": {
    "src": "/media/kebab-case-slug.svg",
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
- `media` is optional. `src` is required when present; `alt` is optional; `type` is `"image"` or `"video"`.
- `paperRef` is agents-only. The public page does not render it.

The site reads every `content/entries/*.json` file, sorts by date descending then `id`, and groups by day (newest day first). Cards render media → title → summary → tags.

## Deploy

Standard Next.js App Router app. GitHub is not required. Custom-domain DNS for sethjenks.com is out of scope until an Origin ↔ Vercel connection exists.
