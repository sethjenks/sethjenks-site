# Seth Jenks

Minimal chronological journal on a near-white page. Product truth lives in `PRODUCT.md`. Visual language is locked in `DESIGN.md` (our brand, not an Impeccable sample theme). Media files live in `public/media/` and are referenced by `media.src`. `paperRef` is agents-only and is never rendered. There is no Paper iframe.

Impeccable is installed for this project (`npx impeccable detect`, skills under `.cursor/skills/impeccable`). Run `npx impeccable detect http://127.0.0.1:43127/` before calling a UI pass done.

Type: Geist Sans via `geist/font/sans` (UI, titles, body). Geist Mono via `geist/font/mono` for day stamps, tags, and tech labels. Geist Pixel Square is loaded with `next/font/local` from the Square file only (`src/lib/pixel-font.ts`). Do not import `geist/font/pixel`; that barrel also preloads Grid, Line, Circle, and Triangle. Pixel Square is a rare display accent (the day numeral), never body or long titles. Family is Sans / Mono / Pixel only. There is no Geist Serif; do not invent one. No Inter.

The page is ground `#fafafa`, ink `#111111`, muted `#6b6b6b`. Paragraphs read in `#595959`. Whitespace separates days. A hairline shows up on the footer and on media. The header control is a pale blue glass cap with a navy label. No LED. No dark void, frosted panels, scanlines, CRT, or pixelated photos.

Contact is three links: X `https://twitter.com/sethjenks`, LinkedIn `https://www.linkedin.com/in/sethjenks`, and GitHub `https://github.com/sethjenks`. No contact form.

Intended production domain later: **sethjenks.com**. DNS stays deferred. This repo does not configure live custom-domain records, and it does not emit a canonical host until that domain is live.

## Run locally

```bash
pnpm install
pnpm dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127). `npm install` and `npm run dev` work the same way if you prefer npm.

```bash
pnpm build
```

## ASCII Journal Studio

Run the local-only Toolcraft workspace from the repo root:

```bash
pnpm studio
```

Open the printed local URL, then drop or paste an image into **Image**. To bring in a frame from Paper, export it as PNG, JPEG, GIF, SVG, or WebP into `studio/inbox/`, choose it under **Paper inbox**, and select **Load selected**. Use **Refresh list** after adding another file.

Tune the character set, density, Cipher-like marks, field, motion, contrast, polarity, inks, frame, and ground in the live 2:1 plate. Paper stays the journal ground; extra inks remap remaining tones. Drag the plate or the center pin to reframe the source after zooming in. The default canvas is 672×336, matching the journal column (`42rem`) at half that height. The top timeline loops the field for 3 seconds. **Export PNG** follows the selected PNG/JPG format and 2K/4K/8K resolution. **Export Video** writes a timeline-length MP4 or WebM at Current or 4K. To attach the current treatment to an entry, choose the entry, pick **Assign as** (live plate by default, or looping video / still image), write meaningful alt text, and select **Assign to post**. A live plate writes `public/media/<entry-id>.png` plus `<entry-id>.plate.json`. The workspace and its write APIs exist only in the local Vite development server; they are not part of the public Next.js site.

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
- `media` is optional. `src` is required when present; `alt` is optional; `type` is `"image"`, `"video"`, or `"plate"`. Plate media also needs `plate` pointing at a `.plate.json` recipe.
- `paperRef` is agents-only. The public page does not render it.
- `hidden`, when `true`, keeps the file in the repo but drops it from the public feed, the journal index, and day pages. Omit the field (or set it `false`) to publish. The public entry shape stays `id`, `date`, `title`, `summary`, optional `tags`, optional `media`.

The site reads every `content/entries/*.json` file, drops hidden entries, sorts by date descending then `id`, and groups by day (newest day first). Cards render media, then title, then summary, then tags.

Work rows read `content/work.json`. Put stills in `public/media/work/` and add `{ id, title, year, role, src, width, height, summary, sections, tags, alt }`. `role` is the work type (Product, Landing, Print, Merch), not a job title. `alt` is one sentence describing the still. Each `id` becomes `/work/[id]`. `sections` is `{ heading, body[] }`. Rows appear only when a type group has at least three items.

## Deploy

Standard Next.js App Router app. GitHub is not required. Custom-domain DNS for sethjenks.com is out of scope until an Origin ↔ Vercel connection exists.
