# Link Previews: the tool

The exact look, structure, states and behavior of the dev-only tool, and the templates in numbers. Build from it so the tool comes out the same in every framework. Setup is in [setup.md](setup.md).

---

## 1. Structure

```
root (position: fixed; inset: 0; grid: sidebar | canvas; height: 100dvh; overflow: hidden)
├── sidebar ............ All, Template, then pages under group labels (read-only)
└── canvas ............. inset, light gray, rounded, scrolls
    ├── header ......... view name · [note] [Save | Save all]   (sticky)
    └── content ........ All grid | Page view | Template gallery
```

- One root element with one class, and every rule in the tool's stylesheet scoped under it. No host classes, utility classes or components. The root is fixed over the whole viewport with `z-index: 0`, so the host's navigation and footer don't show.
- The root's background is the sidebar's color (`--lp-surface`); the canvas sits on it.
- `box-sizing: border-box` for everything inside the root, including `::before` and `::after`.
- Form controls reset at zero specificity, so the tool's own rules win: `:where(.root) :where(button, input, select) { margin: 0; font: inherit; color: inherit; letter-spacing: inherit }`.
- A visually hidden class: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap`.
- The document title is "Link Previews", and the page is `noindex, nofollow`.
- The start view is **All**. If the selected view stops existing, the tool shows All.

**Fonts without the site's styles.** The tool page needs the site's display font (for the frame) and interface font (for the chrome), but none of the site's element rules, since a site's `h1`, `p`, `header` or `img` rules would move the tool's chrome. Load only the font definitions: the site's font stylesheet if its `@font-face` rules live in their own file, or a small dev-only stylesheet with copies of those rules. In a framework app, render the tool outside the site's layout or in a layout that loads only fonts, where the framework allows it without restructuring the app (Next: [next.md](frameworks/next.md#dev-only)). Installed fonts need nothing loaded.

If a host stylesheet must be present anyway (a framework layout you can't avoid, fonts that live in the main stylesheet), neutralize its element rules at zero specificity: `:where(.root) :where(h1, h2, h3, p, ul, ol, li, figure, figcaption, nav, header, main, aside, section, label) { margin: 0; padding: 0; border: 0; font: inherit; color: inherit; letter-spacing: inherit; text-transform: none; background: none; box-shadow: none; }`, then let each tool rule set what it needs. Check after building: the canvas header is 52px tall with its view name centered in it, and the first card or frame starts right under it. Anything lower means site rules are leaking in.

**What the page needs from the server** on load (as props, a dev-only JSON endpoint or a build-time import, whatever suits the framework):
- the manifest (`system` and `entries`). Its `template` and `color` as loaded are where the drafts start; keep those two values fixed for the session, so a save that writes a new template doesn't move them.
- for each entry, whether its saved PNG exists (`<served>/og/<id>.png`, or the adapter's path)
- for each entry, the byte size on disk of its saved image and of its video, if any, for the video's 10 MB check (7). The tool keeps them current: a save's reply gives the new image size, and adding, replacing or removing a video gives the video's.
- the sources list: `{ src, label, folder }` per image (label = file name)
- the registry file's path from the project root, for the prompt

**Sitemap.** The tool fetches it in the browser from the app's own address (`/sitemap.xml` by default; adapt it). Take each `<loc>`'s pathname (ignore its origin, which carries the production domain), decode entities and URI escapes, drop a trailing slash, de-duplicate. Follow a `<sitemapindex>` one level, fetching each child by its path from this app. No sitemap, or one that fails to load or parse, means no missing pages, not an error.

**Image URLs.** A source under the public folder loads from its public path, and a source in the sources folder through the source route.

## 2. Tokens

The tool takes one thing from the host, its interface font: the font the app's own body text uses. Everything else is its own. Light and dark follow `prefers-color-scheme`.

```css
/* tokens, light ............................................... */
--lp-font: <host interface font>, system-ui, sans-serif;
--lp-font-weight: <host body weight>;   /* 400 for a static font; the reference's variable font uses 420 */
--lp-surface:     #ffffff;               /* sidebar, popover, prompt tile */
--lp-canvas:      #f5f5f5;               /* the inset canvas */
--lp-fill:        #e8e8e8;               /* segmented track */
--lp-selected:    #f0f0f0;               /* hovered or selected thumbnail */
--lp-text:        #171717;
--lp-muted:       #737373;
--lp-hairline:    rgba(0, 0, 0, 0.08);
--lp-thumb:       #ffffff;               /* pills: segment thumb, picker, quiet button, color pill */
--lp-soft-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
--lp-shadow:      0 8px 28px rgba(0, 0, 0, 0.12);   /* popover */
--lp-draft:       #d9a54a;
--lp-stale:       #d4805f;

/* tokens, dark (prefers-color-scheme: dark) .................... */
--lp-surface:     #171717;
--lp-canvas:      #0f0f0f;
--lp-fill:        #262626;
--lp-selected:    #262626;
--lp-text:        #f5f5f5;
--lp-muted:       #a3a3a3;
--lp-hairline:    rgba(255, 255, 255, 0.1);
--lp-thumb:       #3a3a3a;
--lp-soft-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
--lp-shadow:      0 8px 28px rgba(0, 0, 0, 0.6);
--lp-draft:       #c3913a;
--lp-stale:       #c0704f;

/* radii ......................................................... */
--lp-radius-row:     8px;
--lp-radius-pill:    999px;
--lp-radius-canvas:  16px;
--lp-radius-popover: 20px;
/* thumbnail option 12px, its image 8px, prompt slot 4px */

/* sizes ......................................................... */
--lp-sidebar: 240px;   /* 208px at max-width 900px */
--lp-inset:   8px;     /* canvas margin */

/* motion ........................................................ */
/* A spring of 0.2s visual duration and 0.2 bounce, sampled into linear(). */
--lp-spring: linear(0, 0.0534, 0.1757, 0.3247, 0.4743, 0.6097, 0.7238, 0.8149, 0.8841, 0.9343, 0.9689, 0.9914, 1.0049, 1.012, 1.0148, 1.015, 1.0136, 1.0115, 1.0092, 1.007, 1.0051, 1.0035, 1.0023, 1.0014, 1);
--lp-spring-duration: 330ms;
```

Root type: `font-family: var(--lp-font); font-weight: var(--lp-font-weight); font-optical-sizing: auto; font-size: 14px; line-height: 20px; letter-spacing: normal; text-align: left; -webkit-font-smoothing: antialiased`. `color-scheme` is `light`, and `dark` in the dark block.

**Focus**: everything focusable shows `outline: 2px solid var(--lp-text); outline-offset: 2px` on `:focus-visible`, except where noted below.

**Smooth corners**: under `@supports (corner-shape: squircle)`, the canvas, the popover and thumbnail options get `corner-shape: squircle`. Pills stay fully round.

**Reduced motion**: under `prefers-reduced-motion: reduce`, the sidebar rows and the segmented thumb have no transition.

```css
/* breakpoints ................................................... */
@media (max-width: 900px) { --lp-sidebar: 208px; header and content padding-inline: 16px }
@media (max-width: 600px) {
  root: one column, rows auto | minmax(0, 1fr)   /* sidebar above the canvas */
  sidebar: max-height 36dvh; padding 8px
  canvas: margin 0 8px 8px
}
```

## 3. Sidebar

- Container: `min-height: 0; overflow-y: auto; padding: 12px`. Inside, a `nav` labeled "Link previews", a single column.
- **Rows**: All, Template, then each group. Every row is a button: `display: flex; width: 100%; height: 32px; align-items: center; gap: 8px; padding: 0 8px; border: 0; border-radius: 8px; background: transparent; color: var(--lp-text); font-size: 14px; line-height: 20px; font-weight: var(--lp-font-weight); text-align: left; cursor: pointer; transition: font-weight 160ms ease`. A page row's label is its real path.
- The label truncates on one line with an ellipsis (`flex: 1; min-width: 0`).
- **Active row**: `aria-current="page"` and `font-weight: 600`. Nothing else: no fill, no hover state. With a variable font the weight glides over 160ms; with a static font it switches.
- **Dot**: after the label, only for draft, stale or missing pages (10). Saved pages, All and Template have none.
- **Group labels**: an `h2` before each group's rows: `margin: 24px 0 4px; padding: 0 8px; color: var(--lp-muted); font-size: 12px; line-height: 16px; font-weight: var(--lp-font-weight)`.
- **One group**: no labels. The page rows follow the Template row directly, in the same 32px rhythm, with no extra space or divider.
- **Order**: groups in the order they first occur in the manifest's entries, pages in manifest order within a group, then sitemap pages with no entry at the end of their group, in sitemap order. A sitemap page's group is the first folder of its path, title-cased (`/blog/first-post` → "Blog"), or "Pages" for a top-level page.
- **Read-only.** No add button, no path editing, no reordering, no delete.

## 4. Canvas and header

- **Canvas**: `position: relative; min-width: 0; min-height: 0; margin: 8px 8px 8px 0; overflow-y: auto; border-radius: 16px; background: var(--lp-canvas)`.
- **Header**: `position: sticky; top: 0; z-index: 2; display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 24px; background: var(--lp-canvas)`.
  - Left, an `h1`: "All", "Template", or the selected page's path. 14px / 20px, weight 600, one line with an ellipsis.
  - Right, `display: flex; min-width: 0; align-items: center; gap: 12px`: an optional note (`min-width: 0`, 13px / 20px, muted, right-aligned, `role="status"`), then the action.
- **The action** shows only when something needs saving, and disappears when nothing does (for example after undoing the only change):
  - Page view: **Save** when the page needs saving (10). While saving: **Saving…**, disabled. The note shows that page's last failure.
  - All and Template views: **Save all** when any page needs saving. While running: **Saving i of N…**, disabled. The note shows the last batch's failures.
- **Content**: `padding: 8px 24px 32px`.

## 5. Controls

All controls are fully rounded pills with a soft shadow and no strokes. Text in controls is 13px / 20px, weight 500.

- **Primary button** (Save, Save all): `display: inline-flex; flex: none; align-items: center; justify-content: center; white-space: nowrap; border: 0; cursor: pointer; height: 32px; padding: 0 14px; gap: 6px; border-radius: 999px; background: var(--lp-text); color: var(--lp-surface); box-shadow: var(--lp-soft-shadow)`. Hover: `opacity: 0.85`. Disabled: `opacity: 0.6; cursor: default`.
- **Quiet button** (Upload, Copy prompt, Replace): the same, but `height: 36px; padding: 0 16px; background: var(--lp-thumb); color: var(--lp-text)`. Hover background: `color-mix(in srgb, var(--lp-thumb), var(--lp-text) 4%)`.
- **Segmented**: `position: relative; isolation: isolate; display: inline-flex; align-items: stretch; height: 36px; padding: 3px; border-radius: 999px; background: var(--lp-fill)`.
  - One **thumb** behind the options: `position: absolute; top: 3px; bottom: 3px; left: 0; z-index: -1; width: 0; border-radius: 999px; background: var(--lp-thumb); box-shadow: var(--lp-soft-shadow); pointer-events: none`. Place it with `transform: translateX(<option offsetLeft>px)` and `width: <option offsetWidth>px`, re-placed on resize. Add `transition: transform, width` on `var(--lp-spring-duration) var(--lp-spring)` only after it has been placed once, so it never slides in on load.
  - **Options**: `display: inline-flex; align-items: center; justify-content: center; padding: 0 16px; border: 0; border-radius: 999px; background: transparent; color: var(--lp-muted); white-space: nowrap; cursor: pointer; transition: color 150ms ease`. Hover and checked: `var(--lp-text)`.
  - A radio group: container `role="radiogroup"` with an `aria-label`; options `role="radio"`, `aria-checked`, roving `tabIndex` (0 on the checked one).
- **Controls row**: beneath the frame, outside it, `display: flex; flex-wrap: wrap; align-items: center; gap: 8px`.
- **Chevron**: 12×12 SVG, a path `M3 4.5 6 7.5 9 4.5`, stroke `currentColor`, width 1.5, round caps and joins, in the muted color.

## 6. All view

- **Grid**: `grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 28px 20px`.
- **Card**: a `figure`, `position: relative; display: flex; min-width: 0; flex-direction: column; gap: 8px; margin: 0`.
  - The frame, scaled to the card's width (7, Scaled frame), with `outline: 1px solid var(--lp-hairline)`.
  - A caption: `display: flex; align-items: center; gap: 8px; color: var(--lp-muted); font-size: 13px; line-height: 20px`. The path (one line, ellipsis), then at the right "Video" (muted) when the page has a video, followed by the dot (draft, stale, missing).
  - The whole card is one transparent button over everything (`position: absolute; inset: 0; z-index: 1; padding: 0; border: 0; background: transparent; cursor: pointer`, no focus outline of its own) with visually hidden text "Edit <path>". Its focus ring goes on the card: `outline: 2px solid var(--lp-text); outline-offset: 4px`.
- Every page appears, in sidebar order. A missing page shows its default draft.

## 7. Page view

**Workspace**: `display: flex; flex-direction: column; gap: 16px; width: min(100%, 900px); margin-inline: auto; padding-top: 40px` (48px from the header to the frame, with the content's 8px).

**Scaled frame.** A box `position: relative; width: 100%; aspect-ratio: 1200 / 630; overflow: hidden` holding a layer `position: absolute; top: 0; left: 0; width: 1200px; height: 630px; transform-origin: top left; transform: scale(<box width> / 1200)`. Measure the width with a ResizeObserver and keep the layer `visibility: hidden` until the first measurement. The layer sets `--frame-scale` to the scale (1 before measuring) so rings drawn inside it can divide by it. The editable title and the crop target are drawn inside the layer in frame pixels, so they sit exactly over the frame. The frame has `outline: 1px solid var(--lp-hairline)`.

**Controls**, only those the template and the layout use:
1. **Theme**: segmented, Light / Dark (when `uses.theme`, and not in Image only).
2. **Layout**: segmented, "Text" / "Text & Image" / "Image" for `type-only` / `type-and-image` / `image-only` (Type only, Type and image, Image only in these files), label "Layout". A template that doesn't use images (Poster) offers "Text" and "Image"; a Type and image page shows as Text under it.
3. **Image picker** (9): in any layout but Type only, or while a layout is waiting for an image.

**Choosing a layout.**
- Choosing Type and image or Image only uses the page's image, else the sheet it had when the tool loaded, else the first source in the picker with `focus { x: 0.5, y: 0.5 }`. With none of these, the picker opens and choosing an image switches to that layout.
- Choosing a source on a Type only page switches it to Type and image (Image only under a template without images). Elsewhere it sets `{ src, focus: { x: 0.5, y: 0.5 } }` (no zoom) and keeps the layout. Choosing the source already in use does nothing.
- **The sheet option** exists only for a page whose manifest entry had a sheet when the tool loaded. It puts that exact sheet back after the page was switched to a single source. The tool never builds a new sheet.

**Crop by dragging.** A transparent target placed exactly over the image box (the template's `imageBox`, or the whole frame in Image only), absolute in frame pixels, `cursor: grab` (`grabbing` while dragging), `touch-action: none`, `tabIndex 0`, `role="group"`, label "Image crop. Drag or use the arrow keys to move the image." Only a single source with an image box has one; sheets and Type only don't.
- Pointer down (primary button) captures the pointer, focuses the target, and records the start point and focus.
- The image's overhang per axis, in frame pixels: `cover = max(box.width / naturalWidth, box.height / naturalHeight) × (zoom ?? 1)`; `slack = natural × cover − box`. Moving by `dx` frame pixels sets `focus.x = clamp(start.x − dx / slack.x, 0, 1)`, rounded to 3 decimals; the same for y. Divide pointer deltas by the on-screen scale (`target width / box.width`) first.
- An axis with 0.5px of slack or less never moves. An edit that leaves the focus unchanged records nothing.
- Arrow keys move 10 frame pixels, 50 with Shift.
- Focus ring: `outline: calc(3px / var(--frame-scale)) solid var(--lp-text); outline-offset: calc(-3px / var(--frame-scale))`.

**Drop to upload.** Dragging files over the frame (while it can show an image, under a template with images or in Image only, or the page can take a video) shows `outline: 2px solid var(--lp-text)` on the frame. A dropped file that looks like a video (type `video/*`, or a name ending `.mp4`, `.m4v`, `.mov` or `.webm`) goes to the video control, below; with no entry yet, the status line shows "Save this page’s image before adding a video." Otherwise the first PNG, JPEG or WebP file is uploaded and chosen as the source: the status line shows "Uploading…", then clears, and a failure shows the endpoint's sentence. Anything else shows "Drop a PNG, JPEG or WebP image, or an MP4 video.", "Drop a PNG, JPEG or WebP image. A video can be added once this page’s image is saved." with no entry yet, or "Drop an MP4 video." when the frame can't show an image.

**Editable title.** The template's title slot, rendered editable with the exact title style: `contenteditable="plaintext-only"`, `role="textbox"`, `aria-label="Title"`, `aria-multiline="true"`, `tabIndex 0`, `spellcheck` off, `position: relative; z-index: 2; cursor: text`.
- Enter inserts `\n` at the caret instead of a new block.
- Paste inserts plain text only, with `\r\n` and `\r` turned into `\n`. Drops are ignored.
- Non-breaking spaces become plain spaces.
- Keep one `<br>` at the end when the text ends with `\n`, so a trailing line break shows while editing, and never include it in the value.
- The element holds its own text while typing. It's rewritten only when the value changes from outside (undo, switching pages), and then the caret goes to the end if it had focus.
- Focus ring: `outline: calc(2px / var(--frame-scale)) solid color-mix(in srgb, var(--lp-text), transparent 60%); outline-offset: calc(8px / var(--frame-scale))`.

**Status line** beneath the controls, only when it has something to show (otherwise no row, no gap): `display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; min-height: 20px; color: var(--lp-muted); font-size: 13px; line-height: 20px`. In order:
- on overflow (not in Image only, which has no title): a dot in `--lp-stale` and "The title doesn’t fit, even at 40px. Shorten it or break it differently." in the text color, `role="alert"`
- a note (`role="status"`): the page's upload or drop note, else the video's

**Video.** Every page with a manifest entry gets the video control, under any template and layout. A page with no entry gets it only once its image has been saved.
- Buttons, after the other controls in the controls row: a quiet button "Add video", or "Replace video" and "Remove video" when the page has one, all disabled while busy. "Add" and "Replace" open a hidden file input (`accept="video/mp4"`, label "Video file").
- Before sending, the tool checks the first 12 bytes are an MP4 and the size is at most 8 MiB (the adapter's checks), then reads the clip's pixel size from a muted `<video>`'s metadata. Refusals: "That isn’t an MP4 video. Export it as MP4 (H.264) and try again.", "Videos can be up to 8.4 MB. This one is <size>.", "This video has no picture.", "This browser can’t read that video."
- While uploading, the status line shows "Uploading the video…". After a removal it shows "Video removed. The file is still at <src>." Failures show the endpoint's sentence, or "The video could not be saved. Try again." / "The video could not be removed. Try again."
- **Preview**, under the controls row when the page has a video: `display: flex; align-items: center; gap: 16px`. The clip: `display: block; flex: none; width: auto; max-width: 160px; height: 90px; border-radius: var(--lp-radius-row); background: var(--lp-fill); object-fit: contain`, `muted loop autoPlay playsInline`, label "Video preview", its URL carrying `?v=<version>` so a replace loads the new file. Beside it a column (`display: flex; min-width: 0; flex-direction: column; gap: 2px; color: var(--lp-muted); font-size: 13px; line-height: 20px`): "<size>, <width>×<height>" in the text color with `font-variant-numeric: tabular-nums` ("File missing: <src>, …" when the file isn't on disk); "Plays in Messages. Other apps show the image."; and, when the saved image and the video together pass 10,000,000 bytes (current sizes, no reload needed), a `--lp-stale` dot and "The saved image and this video come to <size>, over the 10 MB Messages loads for one link." (`role="alert"`, `display: inline-flex; align-items: center; gap: 8px`).
- Sizes are decimal megabytes with one decimal (two under 0.1 MB), the unit Apple's limit uses.
- Add, replace and remove take effect at once through the video endpoint, so videos sit outside drafts and undo, and never make a page need saving.

**A sitemap page with no entry.** Selecting it shows a default draft, editable like any page: `id` from the path (`/` → `home`, otherwise the path without its leading slash and with `/` turned into `-`; add `-2`, `-3`, … if taken), the title from the path (last segment, split on `-`, each word capitalized; `/` is "Home"), the derived group, `theme: "light"`, `image: null`. Its first edit adds it to the drafts in the same undo step, and saving writes its entry.

## 8. Template view

- **Gallery**: `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px 32px; max-width: 1280px`, one column at `max-width: 1180px`. With three templates and the prompt tile, it's a 2×2 grid.
- **One card per registry template**, in registry order, each the template's frame scaled to the card and drawn with one sample page. A small pure function picks it: the first Type and image page (entries and sitemap drafts, in sidebar order) with a single image; else the first page; else neutral sample content (`id "sample"`, path `/`, title "Your page title", group "Pages", light, no image), so the gallery always renders.
  - The whole card is a button (`aria-pressed` on the current one) with visually hidden text "<label>, the current template" or "Use <label> for every page". Choosing another template applies it to every page as one undo step.
  - The current card's frame: `outline: 2px solid var(--lp-text); outline-offset: 4px`.
  - Caption (as in the All view, with `min-height: 36px`): the label, then at the right (`gap: 10px`) the color pill if the template uses color, and "Current" (text color, weight 500) on the current one.
- **Color pill**: `position: relative; z-index: 2` (above the card's button); `display: inline-flex; height: 36px; align-items: center; gap: 8px; padding: 0 14px 0 6px; border-radius: 999px; background: var(--lp-thumb); box-shadow: var(--lp-soft-shadow); color: var(--lp-text); font-size: 13px; line-height: 20px; font-weight: 500; font-variant-numeric: tabular-nums; cursor: pointer`. Contents: a 24px round dot of the color (`flex: none`) with `box-shadow: inset 0 0 0 1px var(--lp-hairline)`, the hex in uppercase, a chevron. A native `<input type="color">` covers the whole pill (`position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; opacity: 0; cursor: pointer`), labeled "<label> background color", so a click (or Enter / Space when focused) opens the browser's picker. Its focus ring goes on the pill. Changes update the site color live, and a run of changes within 1000ms is one undo step.
- **Make your own** (last tile, not a template, in a card like the others): a box the size of a frame (`position: relative; width: 100%; aspect-ratio: 1200 / 630`), `display: flex; flex-direction: column; gap: 8px; padding: 16px 20px; overflow: hidden; container-type: inline-size; background: var(--lp-surface); outline: 1px dashed color-mix(in srgb, var(--lp-text), transparent 75%); outline-offset: -1px`.
  - The prompt (15), `white-space: pre-wrap`, text color, `font-size: clamp(11px, 2.55cqw, 14px); line-height: 1.45`, scrolling if it must. The bracketed slot is highlighted: `background: color-mix(in srgb, var(--lp-draft), transparent 75%); border-radius: 4px`.
  - A quiet button "Copy prompt" at its natural width at the start of the row (wrap it, or `align-self: flex-start`, so the column doesn't stretch it). It copies the full prompt (falling back to a hidden textarea and `execCommand('copy')`), then reads "Copied" for 1600ms.
  - Caption: "Make your own".
  - The prompt names the registry file by the path passed in from the server. Without it, the prompt says "the file that defines the share image templates".

## 9. Image picker and upload

- **Button**: `display: inline-flex; max-width: 260px; height: 36px; align-items: center; gap: 8px; padding: 0 14px 0 6px; border: 0; border-radius: 999px; background: var(--lp-thumb); box-shadow: var(--lp-soft-shadow); color: var(--lp-text); cursor: pointer`. Contents: a 24px round thumbnail of the current source (`display: block; flex: none; max-width: none; border-radius: 50%; object-fit: cover`, background `--lp-surface`), the file name (`min-width: 0`, one line, ellipsis), a chevron (`flex: none`). `aria-haspopup="listbox"`, `aria-expanded`, label "Image source: <name>".
- **Popover**, above the button: `position: absolute; bottom: calc(100% + 8px); left: 0; z-index: 10; display: flex; flex-direction: column; width: min(360px, calc(100vw - 32px)); max-height: min(420px, 70dvh); border-radius: 20px; background: var(--lp-surface); box-shadow: var(--lp-shadow)`.
  - **Grid** (`role="listbox"`, label "Image source"): 3 equal columns, `gap: 8px; padding: 12px; overflow-y: auto`. Options: the page's original sheet first when it had one ("Sheet of <n>", thumbnail its first tile), then every PNG, JPEG or WebP in the sources folder sorted by file name, then any other image an entry already uses.
  - **Option** (`role="option"`, `aria-selected`): `display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 12px; background: transparent; color: var(--lp-muted); font-size: 12px; line-height: 16px`. Hover and selected: `background: var(--lp-selected); color: var(--lp-text)`. Image: `display: block; width: 100%; max-width: none; aspect-ratio: 4 / 3; border-radius: 8px; object-fit: cover; background: var(--lp-canvas); outline: 1px solid var(--lp-hairline); outline-offset: -1px`, lazy-loaded. Name below, one line, ellipsis.
  - **Footer**: `display: flex; align-items: center; gap: 12px; padding: 4px 12px 12px; color: var(--lp-muted); font-size: 13px`. A quiet button "Upload" ("Uploading…" and disabled while busy), then a status: "PNG, JPEG or WebP, up to 10 MB", or the upload's error.
- Opening focuses the selected option (else the first). Choosing an option sets the source, closes the popover and returns focus to the button. Escape or a pointer down outside closes it; Escape returns focus to the button.
- **Upload** opens a file input (`accept="image/png,image/jpeg,image/webp"`). The tool checks the type and the 10 MiB limit before sending, with the upload endpoint's messages (the copy says "10 MB"). On success the new source joins the picker, becomes the page's source, and the popover closes.

## 10. Statuses

Derived, never stored. A page's *saved copy* is its entry as loaded from the manifest or as returned by its last save.

| Status | Means | Dot |
| --- | --- | --- |
| **Missing** | A sitemap page with no entry and no edits. Never stale, since it has no saved file or hash. Its first edit makes it **Draft**; saving creates its entry, and from then on it's like any other page | hollow: transparent, `box-shadow: inset 0 0 0 1px var(--lp-muted)` |
| **Draft** | Differs from its saved copy, or has no saved file | `--lp-draft` |
| **Saved** | Equals its saved copy, its file exists, and nothing makes it stale | none shown |
| **Stale** | Equals its saved copy and its file exists, but its `savedHash` differs from the definition hash of the page under the current (drafted) template and color: the template changed, the color under a template that uses it, another `system` value, or the entry was edited outside the tool | `--lp-stale` |

- The dot is 6×6, round, `role="img"`, with an `aria-label` and `title` of the status label.
- With a saved file and no recorded `savedHash` (saved before hashes), a Type only or Type and image page is **Stale**, since nothing shows it matches the current template, and an Image only page is **Saved**, since it depends on no template.
- Compare entries by canonical JSON (keys sorted, `undefined` dropped), so key order never makes a draft.
- **Needs saving**: any page that isn't Saved. That set decides Save and Save all.

## 11. Saving

- **Save** (page view): make the PNG (below), then post to the save endpoint with the page, the PNG, and the drafted template and color. A save is refused when the title overflows, with the reason shown. On success the server's copy replaces both the draft and the saved copy, and its file counts as existing. On failure the draft stays and the reason shows in the header note while that page is selected.
- **Making the PNG.** A pure `saveMethod({ width, height, zoom, sheet, layout, png })` decides, from the source's natural size and whether it starts with the PNG signature. It returns `capture` unless the page is Image only with one source, zoom 1 or absent, and `fitsFrame(width, height)`: at most 2400×1260 and `width / height` within 1% of 1200/630. Then a PNG is sent as its own bytes (`source-bytes`), and any other format is drawn once on a canvas of its own size and sent as a PNG (`source-redraw`), never enlarged. Save calls it in the browser in place of the capture, fetching the source (`no-store`) and reading its size with `createImageBitmap`. The interface never shows the method. The endpoint's matching check: [adapters § Save endpoint](adapters.md#save-endpoint).
- **Edits made during a save** stay a draft: the page adopts only the server's `version` and `savedHash`. A page saved for the first time joins the entries.
- **Save all** queues every page that needs saving, in sidebar order, and saves them one after another, never in parallel, showing "Saving i of N…". A failure doesn't stop the rest; failed pages keep their status and their reason. Afterwards the header note reads "<f> of <N> couldn’t be saved: <first reason>".
- Saving any page writes the drafted template, and sometimes the color, into the manifest's `system`: the full rule is in [adapters § Save endpoint](adapters.md#save-endpoint).
- The tool never deletes files. A moved page's old file, if the adapter keeps one per route, stays where it was.

## 12. Keyboard

Everything is reachable by keyboard.

| Where | Key | Does |
| --- | --- | --- |
| Anywhere in the tool, outside text fields | Cmd/Ctrl+Z | Undo |
| Anywhere in the tool, outside text fields | Shift+Cmd/Ctrl+Z, or Ctrl+Y (not Cmd+Y) | Redo |
| Segmented control | Arrow Left/Up, Right/Down | Select the previous / next option, wrapping, and focus it |
| Sidebar, cards, buttons | Tab, Enter / Space | Move, activate |

The title, crop target and picker keys are in 7 and 9.

Undo and redo listen on the window in the capture phase, ignore combinations with Alt, and skip only text fields (`<textarea>`, and `<input>` of type text, search, url, tel, email, password or number), which keep the browser's own text undo. They apply to every other control, including the color input while it keeps focus, and inside the editable title, where the tool's history replaces the browser's.

## 13. Undo and drafts

- Drafts, the drafted template and color, and the history live in memory. Drafts survive switching views but not a reload, and nothing is written until a save.
- Every change records the entries before and after, the template or color before and after when it changed them, and the view before and after.
- **Merging**: a change merges into the previous step when it has the same key (kind + page id), arrives within 1000ms, and its kind allows it:
  - title typing merges while the number of typed line breaks (`\n` characters, not fitted lines) stays the same. An edit that adds or removes one starts a new step, and typing right after it merges into that step
  - one crop drag is one step (its key includes the drag's start time), as long as no more than 1000ms passes between pointer moves; holding still longer than that mid-drag starts a new step
  - arrow-key nudges merge
  - color changes merge (key "color")
  - theme, layout, source and template never merge
- A change that changes nothing records nothing.
- Undo restores the entries, template, color and the view the change happened in; if that view no longer exists (All and Template always do), it goes to All. Redo likewise. A new change clears redo.
- A save isn't a step. Its `version` and `savedHash` are written through every step in the history, so undo never brings back an out-of-date saved stamp.
- Selecting a view isn't a step, and nor is a video change (7).

## 14. Templates

All values are frame pixels from the manifest's `system` block, on a 1200×630 frame.

```
SYSTEM (shared geometry)
  margin           56     top, left and right
  textBottom       80     text's bottom inset (below)
  panelGap         48     text column's right padding when there is an image
  panelWidth       540
  labelSize        24
  labelLineHeight  1.3
  labelGap         48     least space between label and title
  lineHeight       0.9    title
  titleSize        40 – 150
  maxLines         4
```

Derived: label line `round(24 × 1.3)` = 31; title box height `630 − 56 − 80 − 31 − 48` = 415 in every template.

**`textBottom`** keeps the title clear of the dark pill X draws with the page title over the bottom left of a link card's image on desktop, roughly 29 to 74px above the bottom edge from about 28px in. Don't set it back to `margin` (its fallback when missing). It's sized for desktop: on a phone the pill covers about 116px (an estimate), and sizing for that pushes the title too high. A title whose last line starts with a descender (g, p, y near the left edge) can still touch the pill at large sizes; clearing that would take about 100. Nothing in the tool's interface mentions it.

### Registry

```ts
TEMPLATES = {
  plate: {
    label: "Plate",
    uses: { theme: true, image: true, color: false },   // which controls the tool shows
    titleBox: (entry, system) => ({ width, height }),   // the box the title is fitted into
    imageBox: (entry, system) => ({ x, y, width, height }) | null,  // where the image sits; null without an image
    Frame: Plate,                                       // draws the 1200×630 frame
  },
  poster: { … }, inset: { … },
}
DEFAULT_TEMPLATE = "plate"   // an unknown or missing name falls back to it
```

`titleBox` lets the tool and the capture fit the title and refuse an overflow. `imageBox` places the crop target. `uses` decides which controls the tool shows and whether the site color counts toward staleness.

Every template keeps these rules: inline styles only; the title drawn through the shared fitted title part; type only when `entry.image` is null, never a placeholder; sheets and both themes handled; the text's bottom inset is `textBottom`.

### Layouts

`layout` is read as in [SKILL.md § Entries](../SKILL.md#entries), and a page with no image is Type only whatever it says. Templates draw only the first two: a Type only page reaches its template with `image: null`, so the kept image doesn't show. **Image only** skips the template: the image covers the whole 1200×630 frame (one panel at 0, 0, 1200 × 630, background `colors.panel`), with no label or title, the same under every template. Its image box is the whole frame and it has no title box.

### Element reset

The capture serializes the frame's DOM, so its look has to travel with it. No classes: every element carries inline styles, including its own box model, so the host's resets and `img { height: auto }` can't change it: `box-sizing: border-box`, zero margin, padding and border, `min-width: 0`, `letter-spacing: normal`, `text-transform: none`, `text-align: left`, `font-style: normal`.

Images are a plain `<img>`, never a framework image component: `display: block; max-width: none; max-height: none; object-fit: cover`, empty `alt`, not draggable.

Font families are quoted names in CSS (`font-family: "Site Display"`). When `system.font.family` is a stack, quote each name and keep generic keywords bare (`"Avenir Next", "Avenir", system-ui, sans-serif`).

### Shared parts

- **Frame root**: `position: relative; display: flex; width: 1200px; height: 630px; overflow: hidden`, the template's background, the site's display family, `font-optical-sizing: auto`, `data-og-frame`.
- **Text column**: `position: relative; display: flex; flex-direction: column; flex: none`, its width, height 630, its padding. Contents:
  1. **Label**: `flex: none`, the label weight, 24px, line height 1.3, the label color, `white-space: nowrap`. Text: `system.domain`.
  2. **Spacer**: `flex-grow: 1`.
  3. **Title**: `display: block`, width = title box width, the family, `font-optical-sizing: auto`, the title weight, the fitted size, line height 0.9, the ink color, `white-space: pre-wrap; overflow-wrap: normal; word-break: normal` (typed line breaks stay, words never split), `visibility: hidden` until fonts are ready, `data-og-title`.
- **Panel** (the image box): `position: relative; flex: none`, its width and height, `overflow: hidden`, background `colors.panel`, `data-og-panel`.
  - **Single source**: one `<img>` at the box's width and height, `object-fit: cover`, `object-position` and `transform-origin` both `<focus.x × 100>% <focus.y × 100>%`, `transform: scale(zoom)`, or `none` when zoom is 1 or absent. Covering with the focus as the position and zooming about the same point keeps the focus put.
  - **Sheet**: `cols = max(1, columns)`, `rows = ceil(n / cols)`, `cw = floor(width / cols)`, `ch = floor(height / rows)`. Tile *i* is absolute at left `(i mod cols) × cw`, top `floor(i / cols) × ch`, `cw × ch`, except that the last column is `width − cw × (cols − 1)` wide and the last row `height − ch × (rows − 1)` tall, so tiles meet the edges. `object-fit: cover`, no gaps. Six sources in two columns on a 540×630 panel give 270 × 210 tiles.

**Title color isn't a registry field.** Each template works out its own colors inside `Frame` (Plate and Inset from `colors[theme]`, Poster from the site color) and passes the ink to the shared title part. That part fits the title, builds its full style (family, weight, fitted size, line height, color, wrapping) and either draws it as plain text or hands `{ text, style, fit }` to the tool's editable title, which applies the style as is. So the editable title always matches the frame, and the fitter never needs a color.

### Title fitting

In the browser, with the real font:
1. Load the title weight at 150px and the label weight at 24px (`document.fonts.load`), then wait for `document.fonts.ready`. Keep the title `visibility: hidden` until then.
2. In one hidden offscreen element styled like the title (family, weight, size, line height; no color) and set to the box's width, step the size down 1px at a time from `titleSize.max` (150) to `titleSize.min` (40). The first size that fits wins. A size fits when the text isn't wider than the box (`scrollWidth > clientWidth + 0.5` fails), wraps into at most `maxLines` (4) lines, and its height is at most the box height + 0.5px. Lines = `max(1, round(height / (size × lineHeight)))`.
3. **Prefer fewer lines.** From the winning size, keep stepping down 1px to `max(min, 0.9 × size)`. The first size there that fits in fewer lines replaces it ("Field / Notes / Vol. 2" becomes "Field Notes / Vol. 2").
4. **Overflow.** If nothing fits even at the minimum, draw the title at the minimum, say so in the tool, and refuse to save.

No negative tracking, ever; `font-optical-sizing: auto` does that work. Cache fits by family, weight, box and text, and clear the cache when fonts finish loading. Refit when the text, the box (the image or template changing) or the fonts change.

### Plate (default)

`uses: theme, image`. Background, ink and label from `colors[theme]`.

| | With image | Type only |
| --- | --- | --- |
| Text column | 660 wide | 1200 wide |
| Padding (top right bottom left) | 56 48 80 56 | 56 56 80 56 |
| Title box | 556 × 415 | 1088 × 415 |
| Image box | x 660, y 0, 540 × 630, bleeding off the right edge, no radius | none |

### Poster

`uses: color` only. No image, no theme.
- Background: `system.color` if it's a valid `#rrggbb`, else `#000000`.
- Text column 1200 wide, padding 56 56 80 56, title box 1088 × 415 (Plate's type-only layout). Image box: none.
- **Ink**: of the site's two inks (`colors.dark.ink`, the light one, and `colors.light.ink`, the dark one), the one with the higher WCAG contrast ratio on the background; a tie goes to the light ink. Contrast is `(L1 + 0.05) / (L2 + 0.05)` with WCAG relative luminance (channels `c / 255`, linearized as `c / 12.92` at or below 0.04045, else `((c + 0.055) / 1.055)^2.4`; `L = 0.2126 R + 0.7152 G + 0.0722 B`).
- **Label**: the ink mixed toward the background, at 72% ink for the light ink or 60% for the dark ink (each channel `round(ink × a + bg × (1 − a))`), used if its contrast on the background is at least 4.5; otherwise the ink itself.

### Inset

`uses: theme, image`. Plate's colors and layout, with the image as a rounded card inside the margin.
- Card height `630 − 2 × 56` = 518; card width `round(518 × 540 / 630)` = 444; card at x `1200 − 56 − 444` = 700, y 56; `border-radius: 24px`; positioned absolutely over the frame.
- With image: text column 700 wide, padding 56 48 80 56, title box 596 × 415, image box x 700, y 56, 444 × 518 (the card keeps `margin` top and bottom).
- Type only: as Plate's type only (1088 × 415).

## 15. The "Make your own" prompt

Verbatim, with `<registry path>` replaced by the registry file's path from the project root:

```
I want a new share image template for this site.

What I want: [Describe it: where the title and image go, the colors, the type, anything else.]

Read the comment at the top of <registry path> first. It explains how templates work and the rules to keep. Add mine there as a new template, and don't change the existing ones. It will appear in the Template gallery of the Link Previews tool.
```
