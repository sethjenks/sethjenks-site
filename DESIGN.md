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
  key: "12px"
  tray: "14px"
  well: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  column: "42rem"
components:
  button-primary:
    backgroundColor: "pale blue glass"
    textColor: "#001A42"
    rounded: "{rounded.key}"
    padding: "11px 18px"
    typography: "Geist Sans 600 15px / -0.035em"
---

# Design System: Seth Jenks

## Overview

**Creative North Star: "Open column"**

A near-white chronological log. The page is mostly ground and type: generous space, a single reading column, machine day stamps, and almost no chrome. Hairlines appear only where a rule earns its place. The primary control is a pale blue glass cap — Paper material `blue rounded`, scaled to the header. Geist Pixel Square is a rare stamp, not a theme.

This supersedes the anodized night log. Glass is a light touch on the header control and on media edges. It is not the page.

Paper (the product) is not the UI source. It only exports media into `public/media/`. The public page never renders `paperRef`.

**Key Characteristics:**
- Ground `#fafafa`, paper `#ffffff`, ink `#111111`, muted `#6b6b6b`
- Whitespace carries the groups; hairlines only at the footer and media edge
- Machine day stamps `2026.09.15`
- Pale blue glass-cap primary control, navy label, no LED well
- Sparse Pixel accent: `DAY` beside the stamp
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

**The No Signal Rule.** The page stays ink on ground. The glass cap is the only chromatic object. Focus is a 2px ink outline with a 3px offset. Do not add cyan LEDs, beige, terracotta, or a second neon.

## Typography

**Display / Body / UI Font:** Geist Sans  
**Label / Stamp Font:** Geist Mono  
**Accent Font:** Geist Pixel Square  

**Load:** Geist Sans and Geist Mono from the `geist` package (`geist/font/sans`, `geist/font/mono`). Geist Pixel Square only, via `next/font/local` in `src/lib/pixel-font.ts`. Do not import `geist/font/pixel`; that barrel also preloads Grid, Line, Circle, and Triangle. Apply `GeistSans.className` on `<html>` plus the CSS variables so titles, body, and UI inherit Geist Sans. Never `next/font/google` Inter. Never list Inter in a fallback stack.

**Family:** Geist is Sans / Mono / Pixel only. There is no Geist Serif — do not invent one, do not load a serif, do not map `--font-serif` to a serif face.

**Character:** Geometric and quiet. Pixel is a stamp, not a voice.

### Hierarchy
- **Display** (500, `clamp(2rem, 4vw, 3rem)`, tracking `-0.03em`): the name on the home log. Geist Sans. On other routes the same word is a 16px/500 link back home.
- **Study title** (500, clamp 2.75rem to 5.5rem): the project name on a case-study page only. Geist Sans. `text-wrap: balance`.
- **Title** (500, 20px, line-height 1.3, tracking `-0.01em`): entry titles. Geist Sans.
- **Body** (400, 16px / 1.6, `#595959`): intro and summaries. Geist Sans. Measure stays inside 42rem and near 65ch.
- **Label** (Geist Mono, 12px minimum, tracking `0.08em`, `#6b6b6b`): tags, work type, footer. Day stamps stay 13px with `0.16em` tracking, format `2026.09.15`.
- **Pixel** (Geist Pixel Square, 48px): the day-of-month numeral in the log rail. Never body. Never long titles.

**The Pixel Budget Rule.** Pixel Square is a display accent. One use: the day numeral. If a sentence needs it, use Sans instead.

**The Geist Load Rule.** Titles, body, and UI are Geist Sans via `geist/font/sans`. Geist Mono via `geist/font/mono` is for machine stamps, tags, and technical labels. Geist Pixel Square is the sparse accent, loaded alone. No Geist Serif. No Inter. No italic-serif decoration.

## Layout

Single reading column (`max-width: 42rem`) for the intro, log, and footer. The header shares that left edge. Between the intro and the feed, work rows break the measure: horizontal, user-scrolled, first card aligned to the column. Each still links to `/work/[id]`. Project pages leave the column on purpose: a wide title and lede, a framed still, then a 42rem reading measure for sections. Gaps: 40px from a stamp to its entries, 64px between entries, 96px between days. Order inside an entry is fixed: media, title, summary, tags. No panels around the header or the day. Nav is Work, Log, X, and LinkedIn. Reverse-chronological day groups. The newest stamp is ink; older stamps are muted. At 1024px and up the day stamp sits in a 160px sticky rail to the left of the column.

## Elevation & Depth

Depth is almost absent. The page is flat on purpose.

### Shadow Vocabulary
- **Hairline**: 1px `#e6e6e6` on the footer and on media. No wide diffuse shadow. No stacked card.
- **Glass cap**: the header control carries a soft blue under-shadow, a dark-blue rim, and inset specular on a clipped glass face. That material stays on the control.
- **Focus**: `outline: 1px solid #111111`, offset 3px. Hard edge. No glow, no pulse.

**The Flat Page Rule.** Do not put glass, blur, or inset color catches behind the header or day groups. If a region needs separation, use space first and a hairline second.

**The No Halo Rule.** Do not paint chromatic glows on type or cards. The glass cap may keep its blue under-shadow; nothing else gets a glow.

**The Eight-Bit Wink Rule.** 8-bit is type only. Allowed: Geist Pixel Square on `DAY`. Forbidden: scanlines, CRT overlays, chiptune, sprite backgrounds, pixelated photos, dithered embers, and pixelated frames.

## Shapes

Soft glass caps (`12px` face, `14px` rim). Media frames are sharp (`0–2px`) with a hairline. Tags are plain mono words, not chips or pills. No rivets, leather, or gloss candy.

## Components

### Buttons
Pale blue glass-cap primary control, HTML/CSS only. One in the header.

- **Shape:** soft blue under-shadow, dark-blue rim, clipped glass face with side tints, top specular, and a lower filament.
- **Primary:** ice-blue face, navy `#001A42` Geist Sans 600 label, tracking `-0.035em`.
- **No well:** no LED socket, no cyan point light.
- **Hover:** the cap saturates slightly; the under-shadow goes bluer and falls away from the cursor, which acts as a soft light on the glass. Fine pointer only.
- **Use:** the header jump to the log. Not every text link.

### Tags
Geist Mono, 12px minimum, muted `#6b6b6b`. No fill, no border. Two tags is a note; a row of many is chip soup.

### Entries
Day groups are sections of type, not cards. Entries inside are not nested cards. Media, when present, uses a hairline frame on paper.

### Media
Full-bleed in the column, 1px hairline, paper well. The edge is the only elevation. Optional. `type` is `image` or `video`.

### Work rows
Labeled horizontal rows of stills, between the intro and the log. A row exists only when a type has at least three pieces. Smaller types fold into a neighboring row.

- **Track:** full viewport width (`100%`, not `100vw`). Leading padding and scroll-padding are `max(24px, calc((100% - 42rem) / 2 + 32px))`, so the first card starts on the text column. Trailing padding is 24px, so cards scroll off both screen edges. A short mask fades only the screen margin.
- **Tiles:** one 4:3 frame, `object-fit: cover`, 16px radius, 1px hairline, paper well.
- **Header:** a visible "Work" heading plus a mono count. Each band has a 12px mono caps label, a count, and 44px prev/next controls.
- **Motion:** drag, swipe, or arrow keys. `touch-action: pan-x pan-y` so a vertical swipe still scrolls the page. No auto-advance.
- **Links:** each tile goes to `/work/[id]`.

### Work study
Case-study page for one `content/work.json` item. Large title, lede, then the work. The body stays in the 42rem measure.

- **Intro:** crumb `Home / Work / Title`, a large Geist study title, the summary as a standfirst, then Year and Type. The content `role` field is the type. Do not invent a job title.
- **Frame:** wide stills fill a 1px hairline frame. Phone and other narrow stills sit centered in that frame at their native width or smaller.
- **Sections:** `heading` plus short paragraphs. First person. No invented impact. A next-case link follows.
- **Related:** one more-work row, other items only.
- **Type:** Geist Sans for title and lede. No serif. No Inter. No Pixel on this page.
- **Source:** `content/work.json` plus files in `public/media/work/`.

## Do's and Don'ts

### Do:
- **Do** keep the column near 42rem and group by day.
- **Do** leave more space between days than inside an entry.
- **Do** write 1–2 curated sentences. Never raw chat.
- **Do** honor `prefers-reduced-motion`.
- **Do** treat Paper as media export only.
- **Do** keep Pixel marks rare. The glass cap is the only chromatic object.

### Don't:
- **Don't** use a dark void ground, frosted glass panels, or a cyan chassis ember.
- **Don't** use warm cream, beige, italic-serif decoration, Polaroids, or rubber-stamp dates.
- **Don't** default type to Inter or load it from `next/font/google`.
- **Don't** invent a Geist Serif.
- **Don't** set body copy or long titles in Geist Pixel.
- **Don't** add an LED well or extra glow around the glass cap.
- **Don't** pixelate photos or frames, or add scanlines and CRT overlays.
- **Don't** use generic purple gradients, pulsing dots, equal-weight card grids, or vague marketing headlines.
- **Don't** nest cards in cards or sprinkle chip soup.
- **Don't** render `paperRef` or a Paper iframe.
- **Don't** configure live sethjenks.com DNS.
