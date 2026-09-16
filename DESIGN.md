---
name: Seth Jenks
description: Dark glass-and-aluminum chronological log
colors:
  ground: "#0c0d10"
  ink: "#e8eaed"
  muted: "#9aa0a6"
  accent: "#6ec8ff"
  aluminum: "#8a9199"
  aluminum-dim: "#8a9199"
  glass: "rgba(255,255,255,0.06)"
  glass-border: "rgba(255,255,255,0.12)"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.14em"
  pixel:
    fontFamily: "Geist Pixel Square, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.18em"
rounded:
  sm: "2px"
  md: "8px"
  key: "9px"
  tray: "13px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  column: "42rem"
components:
  button-primary:
    backgroundColor: "{colors.aluminum}"
    textColor: "{colors.ground}"
    rounded: "{rounded.key}"
    padding: "9px 14px"
    typography: "{typography.label}"
---

# Design System: Seth Jenks

## Overview

**Creative North Star: "Anodized night log"**

A dark, narrow chronological log. The page is machined: frosted glass panels, matte aluminum edges, Geist Sans for reading, Geist Mono for stamps, Geist Pixel Square as a sparse accent. Eight-bit marks are a wink, not a theme. It is not a cream notebook, not a Quiet-editor chrome slab, and not a SaaS marketing site.

Paper (the product) is not the UI source. It only exports media into `public/media/`. The public page never renders `paperRef`.

**Key Characteristics:**
- Ground `#0c0d10`, ink `#e8eaed`, one accent `#6ec8ff`
- Frosted glass used sparingly (header, day groups, hover)
- Matte anodized aluminum hairlines and frames
- Machine day stamps `2026.09.15`
- Command-key primary controls (no LED on the key)
- Sparse 8-bit accents: Pixel type, one cyan ember, 1px focus edges
- Curated one-to-two sentence entries; no raw chats

## Colors

Dark field, cool metal, one cyan. Cyan is rare on purpose.

### Primary
- **Signal Cyan** (`#6ec8ff`): focus, text links, ambient glass catch, and one chassis ember. Not a page wash. Not a purple gradient. Not a LED on the Command key.

### Neutral
- **Void Ground** (`#0c0d10`): page background.
- **Ink** (`#e8eaed`): titles and readable body.
- **Muted** (`#9aa0a6`): summaries and secondary copy. Minimum 4.5:1 on ground.
- **Aluminum** (`#8a9199`): frames, chips, stamps, dimmer metal. Matte, not mirror chrome.
- **Glass** (`rgba(255,255,255,0.06)`) with **Glass Edge** (`rgba(255,255,255,0.12)`), blur `16px`.

**The One Signal Rule.** `#6ec8ff` is the only chromatic accent. Never beige, terracotta, generic purple, or a second neon.

## Typography

**Display / Body / UI Font:** Geist Sans  
**Label / Stamp Font:** Geist Mono  
**Accent Font:** Geist Pixel Square  

**Load:** the `geist` package (`geist/font/sans`, `geist/font/mono`, `geist/font/pixel`). Default Pixel face is `GeistPixelSquare`. That is next/font. Apply `GeistSans.className` on `<html>` plus the CSS variables so titles, body, and UI inherit Geist Sans. Never `next/font/google` Inter. Never list Inter in a fallback stack.

**Family:** Geist is Sans / Mono / Pixel only. There is no Geist Serif — do not invent one, do not load a serif, do not map `--font-serif` to a serif face.

**Character:** Geometric, technical, quiet. Pixel is a stamp, not a voice.

### Hierarchy
- **Display** (500, 1.75–1.9rem, line-height 1): the name only. Geist Sans.
- **Title** (500, 1.25–1.35rem): entry titles. Geist Sans.
- **Body** (400, 0.95rem / 1.7): bio and summaries. Geist Sans. Measure stays inside ~42rem.
- **Label** (Geist Mono, ≥11px, tracked): day stamps `2026.09.15`, tags, key captions, footer and other tech labels.
- **Pixel** (Geist Pixel Square, ≥11px): day-group eyebrow, tiny labels, occasional wordmark. Never body. Never long titles.

**The Pixel Budget Rule.** Pixel Square is a fun display accent. A few uses per page: `DAY` beside the machine stamp, an inline `SJ` wordmark, a tiny label. If a sentence needs it, use Sans instead.

**The Geist Load Rule.** Titles, body, and UI are Geist Sans via `geist/font/sans`. Geist Mono via `geist/font/mono` is for machine stamps, tags, and technical labels. Geist Pixel Square via `geist/font/pixel` is the sparse accent. No Geist Serif. No Inter. No italic-serif decoration.

## Layout

Single reading column (`max-width: 42rem`). Generous vertical space between days. Card order is fixed: media → title → summary → tags. No heavy nav. Reverse-chronological day groups.

## Elevation & Depth

Depth is machined, not papery.

### Shadow Vocabulary
- **Aluminum frame**: 1px matte metal edge, no wide diffuse shadow. The edge is the elevation.
- **Glass catch** (`inset 0 1px 0 rgba(110,200,255,0.08)`): header and day groups only.
- **Focus ember** (`outline: 1px solid #6ec8ff`): keyboard focus. Hard 1px pixel edge. No pulsing. No soft halo.
- **Chassis ember**: one 6px square, 1px cyan edge, 2×2 cyan dither fill. Ambient page chrome only — never on the Command key, never on photos, never on card frames.

**The No Halo Rule.** Do not paint zero-offset chromatic glows on type or cards. Cyan lives in color, 1px outlines, the glass catch, and the chassis ember.

**The Eight-Bit Wink Rule.** 8-bit is an accent, not a retro skin. Allowed: Geist Pixel Square on day eyebrows / tiny labels / occasional flourish; 1px hard pixel edges or 2×2 dither on cyan embers and focus dots only. Forbidden: scanlines, CRT overlays, chiptune, busy sprite backgrounds, pixelated photos, pixelated aluminum frames.

## Shapes

Soft-square keys (`9px` face, `13px` tray). Media frames are sharp-edged metal (`0–2px`). Tags are small aluminum chips, not candy pills. No rivets, leather, or gloss candy.

## Components

### Buttons
Command-key / Beyza-style primary control, HTML/CSS only (see Paper.tips field note; do not embed Paper).

- **Shape:** recessed tray + specular anodized/plastic face, grain overlay, recessed well.
- **Primary:** aluminum face, dark tray, mono label.
- **Unlit well:** a small socket is always visible and stays unlit. No cyan LED, point light, or bottom-edge glow on the key.
- **Ambient cyan:** lives on the glass catch and the chassis ember, not on the key.
- **Use:** one or two per page (header). Not every text link.

### Chips
Quiet aluminum/glass chips. Geist Mono, ≥11px. Two tags is a note; a row of many is chip soup.

### Cards / Containers
Day groups sit in one glass panel. Entries inside are not nested cards. Media uses an aluminum frame, not a card-in-a-card.

### Media
Full-bleed in the column, aluminum-edged. The 1px metal edge is the elevation — no wide diffuse shadow. Optional. `type` is `image` or `video`.

## Do's and Don'ts

### Do:
- **Do** keep the column near 42rem and group by day.
- **Do** write 1–2 curated sentences. Never raw chat.
- **Do** honor `prefers-reduced-motion`.
- **Do** treat Paper as media export only.
- **Do** keep glass and aluminum as the page chrome. 8-bit marks stay rare.

### Don't:
- **Don't** use beige grounds, italic-serif decoration, cream paper, Polaroids, or rubber-stamp dates.
- **Don't** default type to Inter or load it from `next/font/google`.
- **Don't** invent a Geist Serif.
- **Don't** set body copy or long titles in Geist Pixel.
- **Don't** put a cyan LED on the Command key.
- **Don't** pixelate photos or card frames.
- **Don't** add scanlines, CRT overlays, chiptune, or sprite backgrounds.
- **Don't** use generic purple gradients, pulsing dots, equal-weight card grids, or vague marketing headlines.
- **Don't** nest cards in cards or sprinkle chip soup.
- **Don't** render `paperRef` or a Paper iframe.
- **Don't** configure live sethjenks.com DNS in v1.
