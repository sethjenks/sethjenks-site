# sethjenks.com — design lock

UI is designed in code. Paper is optional media export only (PNG/JPG/SVG/MP4 into `public/media/`, referenced by `media.src`). No Paper iframe. No live custom-domain DNS in v1.

## Surface

- Ground `#0c0d10`
- Ink `#e8eaed`
- Muted `#9aa0a6`
- Accent `#6ec8ff` — focus, links, and ambient bloom only
- Aluminum `#8a9199` (dim `#5c636b`) — hairlines, frames, chips; matte, not mirror chrome
- Glass: fill `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.12)`, blur `16px`
- Glass is restrained: header, day groups, and hover only

Column ~`42rem`. Chronological day groups. Cards: media → title → summary → tags.

## Type

| Face | Source | Use |
| --- | --- | --- |
| Geist Sans | `geist/font/sans` | UI, titles, body |
| Geist Mono | `geist/font/mono` | Day stamps, tech labels, tags |
| Geist Pixel Square | `geist/font/pixel` | Day-group eyebrow, tiny labels, wordmark flourish |

Rules:

- Pixel Square is spare. Never body copy. Never long titles.
- No Geist Serif. No Inter. No other display families in v1.
- Day stamps are machine style: `2026.09.15`

CSS variables: `--font-geist-sans`, `--font-geist-mono`, `--font-geist-pixel-square`. Utilities: `font-sans`, `font-mono`, `font-pixel`.

## Media

Aluminum-edged frames, soft ambient shadow. Not Polaroids, not photo prints.

## Primary controls

Command-key / Beyza-style face in HTML/CSS:

- Layered specular gradients on an anodized/plastic key
- Fine grain overlay (kills banding)
- Recessed well visible when unlit
- No blue LED, point light, or cyan bottom-edge glow on the button

`#6ec8ff` glow is ambient and elsewhere: a soft bloom on the active day stamp, a quiet glass/aluminum edge catch, a small focus ember. No pulsing chip soup. Honor `prefers-reduced-motion`.

Use the key sparingly (header / one entry action). Not every text link.

## Do not

- Cream paper, fiber overlays, rubber-stamp dates, terracotta accents
- Leather, rivets, gloss candy buttons, fake scrollbars
- Embed Paper, or treat Paper as the UI source of truth
- Render `paperRef` on the public page
