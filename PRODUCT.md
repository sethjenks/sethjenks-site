# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js App Router, TypeScript, Tailwind, shadcn/ui — already scaffolded on Origin for Vercel.

## Users

Seth Jenks, and anyone he points at a public daily log. They arrive to read short, curated notes about agentic work, studio, and life — not to operate a product or sign up.

## Product Purpose

Publish a chronological public log of curated agentic work. Success is a readable day-grouped feed with honest summaries and optional media, not a marketing site and not a dump of raw chats.

## Positioning

A personal visual log designed in code. Paper is only for optional media exports. The mechanism is file-based entries (`content/entries/YYYY-MM-DD-<slug>.json`) rendered as a reverse-chronological day-grouped feed.

## Operating Context

Dates are America/Denver calendar days. Intended production domain is sethjenks.com; live custom-domain DNS is deferred. GitHub is not required. Origin is the repo; Vercel is the intended host once connected.

## Capabilities and Constraints

- Read all `content/entries/*.json`, sort by date descending then `id`, group by day.
- Fields: `id`, `date`, `title`, `summary` (1–2 curated sentences), optional `tags`, optional `media`, optional `paperRef`.
- `paperRef` is agents-only and is never rendered publicly.
- No auth, no database, no Paper iframe.
- Home feed plus one project page per `content/work.json` item at `/work/[id]`.
- Work fields: `id`, `title`, `year`, `role`, `src`, `width`, `height`, `summary` (1–2 sentences), `sections` (`heading` + short paragraphs), optional `tags`.
- Project pages are case studies: large title and lede, framed still, sections, related work.

## Brand Commitments

Binding visual lock (see DESIGN.md): near-white ground `#fafafa`, ink `#111111`, muted meta `#6b6b6b`, hairline chrome only. Geist Sans (UI/titles/body), Geist Mono (stamps/tags/labels), Geist Pixel Square as a sparse accent (`DAY`). The header control is a pale blue glass cap with a navy label — no LED. Glass is a touch on that control and on the media edge, not the page. No Geist Serif. Machine day stamps. Voice is first-person, specific, short. Not SaaS marketing.

## Evidence on Hand

- Sample entries under `content/entries/` (domain lock, Paper-as-media, Claire Vo notebook reference).
- No testimonials, metrics, or press. Do not invent them.

## Product Principles

1. Curate after the fact. Never paste raw chat.
2. One job: read the log.
3. Design in code; Paper exports media only.
4. Hierarchy over chrome. The day and the note come first.
5. Stop before live DNS until Origin ↔ Vercel exists.

## Accessibility & Inclusion

WCAG 2.1 AA for text and controls. `prefers-reduced-motion` is required. Functional UI text stays at or above 11px.
