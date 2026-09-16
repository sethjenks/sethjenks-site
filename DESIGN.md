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

A dark, narrow chronological log. The page is machined: frosted glass panels, matte aluminum edges, Geist as the only type family. It is not a cream notebook, not a Quiet-editor chrome slab, and not a SaaS marketing site.

Paper (the product) is not the UI source. It only exports media into `public/media/`. The public page never renders `paperRef`.

**Key Characteristics:**
- Ground `#0c0d10`, ink `#e8eaed`, one accent `#6ec8ff`
- Frosted glass used sparingly (header, day groups, hover)
- Matte anodized aluminum hairlines and frames
- Machine day stamps `2026.09.15`
- Command-key primary controls
- Curated one-to-two sentence entries; no raw chats

## Colors

Dark field, cool metal, one cyan. Cyan is rare on purpose.

### Primary
- **Signal Cyan** (`#6ec8ff`): focus, text links, the Command-key LED language, and a quiet edge catch. Not a page wash. Not a purple gradient.

### Neutral
- **Void Ground** (`#0c0d10`): page background.
- **Ink** (`#e8eaed`): titles and readable body.
- **Muted** (`#9aa0a6`): summaries and secondary copy. Minimum 4.5:1 on ground.
- **Aluminum** (`#8a9199`): frames, chips, stamps, dimmer metal. Matte, not mirror chrome.
- **Glass** (`rgba(255,255,255,0.06)`) with **Glass Edge** (`rgba(255,255,255,0.12)`), blur `16px`.

**The One Signal Rule.** `#6ec8ff` is the only chromatic accent. Never beige, terracotta, generic purple, or a second neon.

## Typography

**Display / Body Font:** Geist Sans  
**Label / Stamp Font:** Geist Mono  
**Flourish Font:** Geist Pixel Square  

**Character:** Geometric, technical, quiet. Pixel is a stamp, not a voice.

### Hierarchy
- **Display** (500, 1.75–1.9rem, line-height 1): the name only.
- **Title** (500, 1.25–1.35rem): entry titles.
- **Body** (400, 0.95rem / 1.7): bio and summaries. Measure stays inside ~42rem.
- **Label** (Geist Mono, ≥11px, tracked): day stamps `2026.09.15`, tags, key captions.
- **Pixel** (Geist Pixel Square, ≥11px): wordmark flourish, day-group eyebrow, tiny technical labels. Never body. Never long titles.

**The Pixel Budget Rule.** Pixel Square appears a few times per page. If a sentence needs it, use Sans instead.

No Geist Serif. No Inter. No italic-serif decoration.

## Layout

Single reading column (`max-width: 42rem`). Generous vertical space between days. Card order is fixed: media → title → summary → tags. No heavy nav. Reverse-chronological day groups.

## Elevation & Depth

Depth is machined, not papery.

### Shadow Vocabulary
- **Aluminum frame**: 1px matte metal edge, no wide diffuse shadow. The edge is the elevation.
- **Glass catch** (`inset 0 1px 0 rgba(110,200,255,0.08)`): header and day groups only.
- **Focus ember** (`outline: 1px solid #6ec8ff`): keyboard focus. No pulsing.

**The No Halo Rule.** Do not paint zero-offset chromatic glows on type or cards. Cyan lives in color, outlines, the key well, and a hairline glass catch.

## Shapes

Soft-square keys (`9px` face, `13px` tray). Media frames are sharp-edged metal (`0–2px`). Tags are small aluminum chips, not candy pills. No rivets, leather, or gloss candy.

## Components

### Buttons
Command-key / Beyza-style primary control, HTML/CSS only (see Paper.tips field note; do not embed Paper).

- **Shape:** recessed tray + specular anodized/plastic face, grain overlay, recessed well.
- **Primary:** aluminum face, dark tray, mono label.
- **Unlit well:** a small socket is always visible.
- **Cyan LED:** the well may light `#6ec8ff` in the on/active/focus state. No extra point lights. No cyan bottom-edge glow on the key (that glow is reserved for ambient page accents).
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

### Don't:
- **Don't** use beige grounds, italic-serif decoration, cream paper, Polaroids, or rubber-stamp dates.
- **Don't** use generic purple gradients, pulsing dots, equal-weight card grids, or vague marketing headlines.
- **Don't** nest cards in cards or sprinkle chip soup.
- **Don't** render `paperRef` or a Paper iframe.
- **Don't** configure live sethjenks.com DNS in v1.
