---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/testimonials.tsx"]
---

# Notes

## Scope

Home page section under the project list, above the shared drawing wall. Visitor mode: Experience. One real testimonial now; each later entry in `content/testimonials.json` is another bubble in the same field.

## Audience

Someone reading Seth’s home page after the gallery. They are not asked to act. The job is to notice a quiet object, then hear a specific person in her words.

## Constraints

Light field, ink type, Geist Sans for the quote and name, quiet role line. Glass is only the bubble: a light hairline and a soft translucent fill, never a dark panel. Motion honors `prefers-reduced-motion` (no drift, no push slide). Do not disturb the masonry lightbox, NFT fisheye, video controls, or the drawing wall.

## Direction contract

THESIS: A few glass bubbles drifting in the margin, not a testimonial card and not a quote wall. The category default — logo, stars, and a row of identical quotes — is refused.

OWN-WORLD: Near-white ground, ink at reading size, one 80px bubble per person. Ingrid’s bubble holds her portrait inside the hairline droplet. The quote appears beside it, in the same column, only while that bubble is open.

STORY: Ingrid Cruz, who hired Seth at Ivanti and SecurityScorecard, is the first bubble. It sits to the left of her name when her note is open. Hover, click, or tap opens a note; leaving it, clicking it again, or tapping outside closes it so the next bubble can be found. Other bubbles move aside. Later notes use the same field without a new layout.

FIRST VIEWPORT: No title. A bubble in the column under Projects. Her words stay folded until the bubble is opened.

FORM: Local extension of the home page, shaped directly from the brief. No concept-seed.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
