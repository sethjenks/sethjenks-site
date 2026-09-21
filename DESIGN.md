---
name: Seth Jenks
description: Light, sparse chronological log
colors:
  ground: "#fafafa"
  paper: "#ffffff"
  ink: "#111111"
  muted: "#6b6b6b"
  hairline: "#e6e6e6"
  aluminum: "#d0d0d0"
  aluminum-dim: "#e4e4e4"
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
  well: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  column: "42rem"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "9px 14px"
    typography: "{typography.label}"
---

# Design System: Seth Jenks

## Overview

**Creative North Star: "Open column"**

A near-white chronological log. The page is mostly ground and type: generous space, a single reading column, machine day stamps, and almost no chrome. Hairlines appear only where a rule earns its place. The command key is a small light-aluminum object with an unlit well. Geist Pixel Square is a rare stamp, not a theme.

This supersedes the anodized night log. Glass and aluminum are light touches on the key and on media edges. They are not the page.

Paper (the product) is not the UI source. It only exports media into `public/media/`. The public page never renders `paperRef`.

**Key Characteristics:**
- Ground `#fafafa`, paper `#ffffff`, ink `#111111`, muted `#6b6b6b`
- Whitespace carries the groups; hairlines only at the footer and media edge
- Machine day stamps `2026.09.15`
- Command-key primary control, light aluminum, unlit well, no LED
- Sparse Pixel accents: `DAY` beside the stamp, an inline `SJ` wordmark
- Curated one-to-two sentence entries; no raw chats

## Colors

Neutral field, near-black type, one muted gray. No chromatic signal.

### Neutral
- **Ground** (`#fafafa`): the page. Soft off-white, not warm cream.
- **Paper** (`#ffffff`): media wells and the command-key face.
- **Ink** (`#111111`): the name, entry titles, the newest day stamp, links, and focus.
- **Muted** (`#6b6b6b`): summaries, older stamps, tags, the footer. Holds at least 4.5:1 on ground.
- **Hairline** (`#e6e6e6`): footer rule and media edge. Not a card border system.
- **Aluminum** (`#d0d0d0`) and **Aluminum Dim** (`#e4e4e4`): the command-key tray and face only. Never body text.

**The Quiet Field Rule.** The page stays inside `#fafafa`–`#ffffff` with `#111111` type. Do not reintroduce a dark void, frosted panels, or a cyan wash.

**The No Signal Rule.** There is no chromatic accent. Focus is a 1px ink outline. Do not add cyan, blue LEDs, beige, terracotta, or a second neon.

## Typography

**Display / Body / UI Font:** Geist Sans  
**Label / Stamp Font:** Geist Mono  
**Accent Font:** Geist Pixel Square  

**Load:** the `geist` package (`geist/font/sans`, `geist/font/mono`, `geist/font/pixel`). Default Pixel face is `GeistPixelSquare`. That is next/font. Apply `GeistSans.className` on `<html>` plus the CSS variables so titles, body, and UI inherit Geist Sans. Never `next/font/google` Inter. Never list Inter in a fallback stack.

**Family:** Geist is Sans / Mono / Pixel only. There is no Geist Serif — do not invent one, do not load a serif, do not map `--font-serif` to a serif face.

**Character:** Geometric and quiet. Pixel is a stamp, not a voice.

### Hierarchy
- **Display** (500, 1.75–1.9rem, line-height 1): the name only. Geist Sans.
- **Title** (500, 1.25–1.35rem): entry titles. Geist Sans.
- **Body** (400, 0.95rem / 1.7): bio and summaries. Geist Sans. Measure stays inside ~42rem and near 65ch.
- **Label** (Geist Mono, ≥11px, tracked): day stamps `2026.09.15`, tags, key captions, footer.
- **Pixel** (Geist Pixel Square, ≥11px): `DAY` beside the machine stamp, the inline `SJ` wordmark. Never body. Never long titles.

**The Pixel Budget Rule.** Pixel Square is a fun display accent. A few uses per page: `DAY` beside the machine stamp, an inline `SJ` wordmark. If a sentence needs it, use Sans instead.

**The Geist Load Rule.** Titles, body, and UI are Geist Sans via `geist/font/sans`. Geist Mono via `geist/font/mono` is for machine stamps, tags, and technical labels. Geist Pixel Square via `geist/font/pixel` is the sparse accent. No Geist Serif. No Inter. No italic-serif decoration.

## Layout

Single reading column (`max-width: 42rem`). Large vertical gaps between days and between entries. Order inside an entry is fixed: media → title → summary → tags. No panels around the header or the day. No heavy nav. Reverse-chronological day groups. The newest stamp is ink; older stamps are muted.

## Elevation & Depth

Depth is almost absent. The page is flat on purpose.

### Shadow Vocabulary
- **Hairline**: 1px `#e6e6e6` on the footer and on media. No wide diffuse shadow. No stacked card.
- **Key recess**: the command key’s tray and face carry a short inset highlight so the object reads as a key. That shadow stays on the key.
- **Focus**: `outline: 1px solid #111111`, offset 3px. Hard edge. No glow, no pulse.

**The Flat Page Rule.** Do not put glass, blur, or inset color catches behind the header or day groups. If a region needs separation, use space first and a hairline second.

**The No Halo Rule.** Do not paint chromatic glows on type, cards, or the command key. The well on the key stays unlit.

**The Eight-Bit Wink Rule.** 8-bit is type only. Allowed: Geist Pixel Square on `DAY` and the `SJ` wordmark. Forbidden: scanlines, CRT overlays, chiptune, sprite backgrounds, pixelated photos, dithered embers, and pixelated frames.

## Shapes

Soft-square keys (`9px` face, `13px` tray). Media frames are sharp (`0–2px`) with a hairline. Tags are plain mono words, not chips or pills. No rivets, leather, or gloss candy.

## Components

### Buttons
Command-key primary control, HTML/CSS only. One in the header.

- **Shape:** light recessed tray, near-white aluminum face, faint grain, recessed well.
- **Primary:** paper face, aluminum tray, ink mono label.
- **Unlit well:** a small dark socket is always visible and stays unlit. No cyan or blue LED, point light, or bottom-edge glow.
- **Use:** the header jump to the log. Not every text link.

### Tags
Geist Mono, ≥11px, muted. No fill, no border. Two tags is a note; a row of many is chip soup.

### Entries
Day groups are sections of type, not cards. Entries inside are not nested cards. Media, when present, uses a hairline frame on paper.

### Media
Full-bleed in the column, 1px hairline, paper well. The edge is the only elevation. Optional. `type` is `image` or `video`.

## Do's and Don'ts

### Do:
- **Do** keep the column near 42rem and group by day.
- **Do** leave more space between days than inside an entry.
- **Do** write 1–2 curated sentences. Never raw chat.
- **Do** honor `prefers-reduced-motion`.
- **Do** treat Paper as media export only.
- **Do** keep the command key unlit, and Pixel marks rare.

### Don't:
- **Don't** use a dark void ground, frosted glass panels, or a cyan chassis ember.
- **Don't** use warm cream, beige, italic-serif decoration, Polaroids, or rubber-stamp dates.
- **Don't** default type to Inter or load it from `next/font/google`.
- **Don't** invent a Geist Serif.
- **Don't** set body copy or long titles in Geist Pixel.
- **Don't** put a blue or cyan LED on the Command key.
- **Don't** pixelate photos or frames, or add scanlines and CRT overlays.
- **Don't** use generic purple gradients, pulsing dots, equal-weight card grids, or vague marketing headlines.
- **Don't** nest cards in cards or sprinkle chip soup.
- **Don't** render `paperRef` or a Paper iframe.
- **Don't** configure live sethjenks.com DNS.
