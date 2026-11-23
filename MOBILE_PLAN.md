# Chia signer on phones

Every card type declares a mobile experience in `src/components/board/presentations/mobile.ts`. Phone, desktop, widget, and icon open as the sideways pager on a small screen or a coarse pointer. A fine pointer at 720px or wider keeps that card's desktop stage. Adding a presentation kind without a plan fails the typecheck. Lens and dock stay on the stage.

Preview note: the phone sheet uses the open card's field, chip, type, and collapse control. The query is `(max-width: 719px), (pointer: coarse)`.

Planning note for the homepage phone mosaic. No product code in this change.

The homepage tile labeled Welcome is the Chia Transaction Signer. Tapping it mounts the shared board kit (`ExpandLoop` + `PresentationShell`) that the card lab also uses. On a desktop-width window that kit scales a 1532×862 stage down slightly and the five-column mosaic reads as a gallery. On a phone the same stage is scaled to about a quarter, so the chrome, the captions, and the screens shrink together.

Probed with Playwright 1.55 driving system Chrome (headless, touch, `deviceScaleFactor: 2`, mobile Safari UA) against `npm run dev` on port 43127. Viewports: 390×844, 430×932, 360×800, and the same devices in landscape (844×390, 932×430, 800×360). This is Chromium touch emulation, not iOS Safari. Safe-area insets were not painted by Chrome; they are judged from the measured boxes plus `viewportFit: "cover"` in `src/app/layout.tsx`.

## What the kit does

Closed tile. `content/home.json` marks `chia-signer` as `presentation: "phone"`. `src/lib/home.ts` sizes that card to the closed stage, 453×551, not the phone frame in CSS. The resting screen is placed with percentages inside the card (`src/components/board/presentations/resting.tsx`). The whole card is a `<button>`, so the tap target is the card. Hover chrome (title and expand glyph sliding in, tile scale) is limited to `(hover: hover) and (pointer: fine)` in `src/app/home-board.css`. On a coarse pointer the title and the 36px expand glyph stay visible. Column hover-grow runs only at `min-width: 1100px` (`src/components/board/masonry-flex.ts`, `WIDE_BOARD` in `src/components/home-masonry.tsx`). A tap on the closed tile opened the mosaic at every viewport tested.

Open stage. `src/components/board/presentations/phone.ts` lays out 36 screens in 5 columns on a stage whose open size is 1532×862. Each cell is 275px wide. `ExpandLoop` then scales that stage with `viewport.width / spec.open.width` and animates `x`, `y`, and `scale` on `.card-canvas-loop` (`src/components/board/expand-loop.tsx`). `PresentationShell` separately animates the shell’s `x`, `y`, `width`, and `height` (`shellVariants` in `src/components/board/presentations/motion.ts`). The header, the collapse control, the captions, and the screens are all inside that scaled shell (`src/components/board/presentations/shell.tsx`, `src/components/card-open-header.tsx`).

Pointer and scroll. There is no drag on this presentation. The shell’s `onClick` toggles a tile’s `data-described` flag when a screen is hit, and toggles the mosaic when the hit is the shell background. Captions (`.card-image-label`, 12px type) show on hover, or on `data-described` when `(hover: none)`. The scrollport (`.card-scroll`) stays `overflow: hidden` until 0.42s after open, then becomes `overflow-y: auto` with `touch-action: pan-y`. `html:has(.board-presentation-loop)` sets `overflow: hidden`, so the page underneath does not scroll. Escape closes. Nothing listens for `popstate`.

Card lab. `/lab/card` in single mode scales the 1621×949 artboard with `min(innerWidth / STAGE_W, innerHeight / STAGE_H)` (`src/components/card-expand.tsx`). Masonry mode uses the same `ExpandLoop`. The tune sheet is `position: fixed` with `touch-action: none` (`src/app/lab/card/card-expand.css`).

## Root causes

Ranked by how badly the phone session fails.

### 1. The open mosaic is a desktop stage scaled to the phone width

Severity: the feature does not work in portrait.

`PHONE_OPEN` is 1532×862 and `PHONE_COLUMNS` is 5 (`src/components/board/presentations/phone.ts` lines 5–13 and 253–294). `masonryOpenFrame` divides the viewport width by that 1532 (`src/components/board/expand-loop.tsx` lines 44–61 and 185–196). The header is 96px tall with 36px type, and the collapse control is 40×40, all in stage pixels (`src/components/board/board.css` lines 132–202, `CARD_OPEN_HEADER` in `src/components/card-open-header.tsx` line 7). Captions are 12px stage type (`src/components/board/board.css` lines 213–233).

Measured open state:

| Viewport | Scale | Screen cell | Header box | Collapse box |
| --- | --- | --- | --- | --- |
| 390×844 | 0.255 | 70×153 | 390×24 at y=8 | 10×10 at (373, 15) |
| 430×932 | 0.281 | 77×169 | 430×27 at y=8 | 11×11 at (411, 16) |
| 360×800 | 0.235 | about 65×142 | 360×23 at y=8 | 9×9 at (344, 15) |

A 70px-wide cell is about 13mm on an iPhone. The screenshot’s own UI type shrinks by the same 0.25, so headlines and buttons become texture. The tap caption measured 61×7. After a tap set `data-described="p-1-1"`, the caption is not readable in the screenshot.

The collapse control is a handful of pixels in the top-right corner. A Playwright tap on its exact center did close the sheet. A finger does not hit a 9–11px target, and the control sits at y=15. With `viewportFit: "cover"` (`src/app/layout.tsx` lines 22–26), a typical iPhone status-bar inset is about 47–59px, so the entire 24px header is under the clock and the island. `readViewport` (`src/components/board/expand-loop.tsx` lines 171–183) anchors the sheet 8px from the top when the filter bar has scrolled away. It never reads `safe-area-inset-*`.

`whileHover` scale on the shell (`src/components/board/presentations/shell.tsx` lines 128–135) does not stick during the open state: hover scale is off while `appearOpen` is true. The closed homepage tile is also fine. The failure is the open stage, not the resting card.

Screenshots: `iphone-390x844-open.png`, `crop-header-390.png`, `crop-collapse-390.png`, `crop-tile-390.png`, `android-360x800-open.png`, `iphone-390x844-tile-tap.png`.

### 2. System back leaves the site

Severity: breaks the platform gesture people use to dismiss a sheet.

Open state is React state in `BoardMasonry` (`src/components/home-masonry.tsx` lines 141–149). `ExpandLoop` closes on Escape, on the collapse control, and on a click of the loop backdrop (`src/components/board/expand-loop.tsx` lines 98–122). It does not call `history.pushState`, and nothing in `src/components` listens for `popstate`.

Measured: `history.length` stayed 2 across open. `page.goBack()` navigated to `about:blank`. The overlay was gone because the document was gone. The project dialog (`<dialog>` in `src/components/board-stage.tsx`) has the same hole. A shared history helper is worth it if that dialog is touched; the signer sheet needs it either way. Desktop visuals stay as they are.

Screenshot: `iphone-390x844-after-back.png`.

### 3. Open pays for every screen, and animates layout under a scale

Severity: first open on a phone is a multi-megabyte layout animation.

The 36 PNGs under `public/media/card/chia-signer/` total 10,949,019 bytes. Opening the tile requested all 36 at every viewport (`pngRequests: 36`). Cells use a CSS filter drop-shadow and `will-change: transform, opacity` (`src/components/board/board.css` lines 82–86 and 112–115). The shell animates `width` and `height` for 0.42s while the canvas animates `scale` (`src/components/board/presentations/motion.ts` lines 28–42, `src/components/board/expand-loop.tsx` lines 45–61). That is layout work on a tree of 36 filtered images.

The signer path does not mount a canvas or a WebGL layer. GSAP is not on this path. The portrait shader and the jelly scene are separate homepage costs. Jelly is parked (`SHOW_BOARD_JELLY` in `src/components/home-board.tsx`). The portrait sets `touch-action: none` and captures the pointer (`src/components/board-portrait.tsx` lines 219–230, `src/app/home-board.css` lines 122–131). That can steal a scroll that starts on the photo. It is adjacent to this bug, not the mosaic itself.

### 4. Landscape is a clipped version of the same stage

Severity: readable enough to tell what the piece is, still a bad phone UI.

| Viewport | Scale | Header | Collapse | Notes |
| --- | --- | --- | --- | --- |
| 844×390 | 0.551 | 844×53 at y=20 | 22×22 at (807, 35) | one row, bottoms past the viewport |
| 932×430 | 0.608 | 932×58 at y=8 | 24×24 | same |
| 800×360 | 0.522 | 800×50 at y=16 | 21×21 at (764, 31) | same |

At scale 0.55 a cell is about 151×331. The shell is only ~370px tall, and the header takes the top ~50px, so every phone is cut off above its bottom buttons. The close control is still under 44px and, on a notched landscape phone, sits in the side safe area (the 844-wide case ends the 22px control at x=829, 15px from the edge).

Screenshot: `iphone-390-land-open.png`.

### 5. Scroll works in this Chrome probe, and it scrolls thumbnails

Severity: do not ship a scroll rewrite for a stuck scroller we did not see. Do move the phone scroller out of the transform anyway.

On 390×844 a 280px upward touch moved `.card-scroll` from `scrollTop` 0 to 1041. The element’s layout `clientHeight` is 3284 and its visual height is 836, which is the 0.255 scale. Visual travel was about 265px, close to the finger. Wheel input after that did not move it further. `html` overflow was `hidden` and `window.scrollY` stayed put (1792 on that run, which is how far the single column sits before the signer).

The known Safari failure mode is `overflow: auto` on a descendant of a CSS `transform`. This probe cannot clear that. Keyboard paging inside the shell scrolls 96 or 520 stage pixels (`src/components/board/presentations/shell.tsx` lines 161–167), which is 24 or 132 visual pixels at phone scale.

Screenshot: `iphone-390x844-after-scroll.png`. Closing with a precise tap returned to the same board position: `iphone-390x844-after-close-tap.png`.

### 6. The card lab cannot be opened on a phone

Severity: blocks anyone using the lab as the mobile test rig. The homepage bug is the stage math above, which the lab shares.

At 390×844 the single-stage canvas transform is `scale(0.241)`. The closed shell measured 109×133. The tune sheet is open over it (`touch-action: none`), and a tap at the shell’s center left `aria-expanded="false"`. Masonry mode would hit the same `ExpandLoop` scale as the homepage.

Screenshots: `lab-390-closed.png`, `lab-390-open.png`.

## Mobile interaction model

Keep the desktop mosaic. From `(min-width: 720px)` upward, with a fine pointer, `ExpandLoop` keeps today’s scale, stagger, and stage coordinates. Phone.ts does not grow a second set of x/y positions for desktop.

On a phone, open a sheet that is not a scaled stage. The query:

```css
(max-width: 719px), (pointer: coarse) and (max-height: 500px)
```

`719px` is the breakpoint already used by the homepage (`src/app/home-board.css` around line 1560). The second clause catches landscape phones whose width is 800–932. A short desktop window with a mouse stays on the mosaic. An iPad at 768×1024 stays on the mosaic too; at that width the collapse control is still about 20px, so a later pass can extend the sheet. This pass does not.

Sheet behavior:

- Full viewport, `position: fixed; inset: 0`, padding from `env(safe-area-inset-*)` on all four sides. Size with `100dvh` and `visualViewport`, and listen for `visualViewport` resize. The page already uses `100svh` for the board; the open overlay currently uses `window.innerHeight` only.
- Header is a sibling of the scroller, in CSS pixels, not a child of the scaled canvas. Title at 20px in the existing Geist stack. Chips wrap. Collapse control is at least 44×44, with the icon visually centered. No Instrument Serif and no Instrument Sans.
- Scroller is a plain overflow element with no transformed ancestor, `overscroll-behavior: contain`, and `-webkit-overflow-scrolling` left at the default. `touch-action: pan-y` in portrait and `pan-x` in landscape.
- Portrait: one column. Each screen is `width: min(100% - 32px, 390px)` and `height: auto`, centered. The caption (the tile `label` and `description` that already exist in `phone.ts`) sits under the image as real text, at least 16px, always visible. Scroll-snap on the vertical axis, `proximity`, so a flick settles on a screen without trapping the gesture.
- Landscape: one screen at a time in a horizontal snap scroller. The image’s height is the sheet height minus the header and the safe areas, width automatic, caption beside it. A 852px-tall screenshot cannot sit at 1:1 in a 360–430px-tall viewport.
- Gestures. Pan scrolls the sheet. The header does not scroll away. A downward swipe that starts on the header closes; a swipe that starts on a screen scrolls. Do not make dismiss depend on that swipe. Tap does not toggle a 12px caption anymore, because the caption is always there.
- Back. On open, `pushState` a single entry. `popstate` closes without pushing again. The collapse control and the header swipe call `history.back()` when this sheet pushed, and call the local close when it did not (the user landed with the sheet somehow already open). Escape still closes, for keyboards attached to a tablet.
- Motion. The resting screen can FLIP from the card into the first cell, then the sheet fades in (about 200ms, ease already used by the board). The other 35 images do not ride that FLIP, and nothing animates `width` or `height`. `prefers-reduced-motion: reduce` skips the FLIP and shows the sheet on the next frame. The kit already short-circuits durations when `useReducedMotion()` is true; the sheet uses that same flag.
- Images. The resting image can load with the closed card. The other 35 use `loading="lazy"` (or an intersection observer) and a `sizes` of about `390px`. Opening must not transfer 11MB before the first screen is on screen.
- Body lock stays: `overflow: hidden` on `html` while the sheet is open, including during the close FLIP, then release back to the saved `scrollY`. That part already works.

The card lab single stage can stay a desktop artboard. The tune sheet is a dev tool. Once `ExpandLoop` grows the sheet branch, lab masonry on a phone gets the same sheet, which is the right shared fix. Do not restyle the lab’s 1621×949 stage as part of this.

## Ordered work

Effort is the size of the edit, not a schedule. Small is a local change in one module. Medium is a new layout branch across the kit.

1. **Add the sheet query and a layout prop.** Medium. A `matchMedia` hook in `src/components/board/expand-loop.tsx`. When it matches, skip `masonryOpenFrame` and the scale variants. Pass `layout="sheet"` into `PresentationShell`. Desktop keeps `layout="stage"`.
2. **Draw the sheet in CSS pixels.** Medium. In `src/components/board/presentations/shell.tsx`, the sheet branch renders a header plus a flow list instead of absolutely positioned stage tiles. New rules live in `src/components/board/board.css` next to `.card-masonry-loop`. Portrait column and landscape snap as above. Safe-area padding on the header and the scroller.
3. **Make the close control 44px and keep it out of the inset.** Small. Part of the sheet header. Do not change `.card-open-header` sizing for the stage layout.
4. **Show captions as text under each screen.** Small. Reuse `tile.label` and `tile.description`. Drop the sheet’s dependence on `.card-image-label` hover and `data-described`.
5. **Push one history entry.** Small. Local to `ExpandLoop` (or a 30-line helper if `board-stage.tsx` should share it). Guard so close does not push, and `popstate` does not call `history.back()`.
6. **Stop animating layout, and honor reduced motion.** Small. Sheet open is opacity plus an optional FLIP of the resting image only. Reduced motion is opacity 0 duration.
7. **Lazy-load the non-resting screens.** Small. `loading="lazy"` and `sizes` on the sheet images in `src/components/board/presentations/tile-face.tsx` (sheet path only, so the desktop mosaic can keep its current load behavior).
8. **Leave the desktop stage, the closed card, hover-grow, and phone.ts coordinates alone.** No effort. Confirm with a desktop screenshot rather than a code edit.
9. **Leave the portrait shader and the jelly flag alone.** No effort, unless a scroll that starts on the portrait is taken into the same pass. That is `touch-action: pan-y` on `.board-portrait` for coarse pointers, and it is a separate change.

Out of scope: deploying, changing the closed tile’s 453×551 crop, redesigning filters (they are 30px with a 7px hit slop and are not what fails), and restyling the lab tune sheet.

## Tradeoffs

The sheet and the stage are two open layouts. The stage stays the desktop look people already have, including the stagger and the scaled header. Pulling the header out of the scale at every width would also fix a slightly small close control on a 1280px window (about 33px), and it would visibly change the desktop mosaic. That is a worse trade than a phone-only branch.

A vertical list of 36 full phones is a long scroll, on the order of 30 viewport heights. That matches the material: each asset is a phone screen, and the mosaic exists so someone can move through the set. Snap keeps it from feeling like an accident. A single horizontal pager in portrait would be shorter and would hide the set; use that gesture only in landscape, where one screen already fills the height.

iPad portrait stays on the stage for this pass. The close control there is still small. Extending the sheet query to `(pointer: coarse) and (max-width: 1024px)` is the follow-up if a tablet pass happens. It should not ride along silently, because a 1024px-wide iPad landscape is where the five-column mosaic starts to look like the desktop piece.

`pushState` on the project dialog is the same back-button bug. Shipping it only for the signer is enough for this report. Sharing a helper is better the moment that dialog is edited, and it does not require a visual change on desktop.

## How to verify

Run `npm run dev` (port 43127). Drive it with touch emulation, not a shrunken desktop window. Repeat in portrait and landscape.

Viewports:

- 390×844 and 844×390
- 430×932 and 932×430
- 360×800 and 800×360
- Desktop controls: 1280×800 and 1440×900, fine pointer, no touch

Success on the phone viewports:

- The open surface fills the visual viewport. The header clears a 59px top inset in portrait and a 47px side inset in landscape. Content is not under the status bar.
- The close control’s box is at least 44×44 CSS pixels. A tap on its center closes. A tap 24px outside it does not hit a zero-size edge.
- The first screen’s label is at least 16px and is visible without hovering. Body copy in the screenshot is legible at arm’s length, because the image is about 390px wide in portrait and height-constrained in landscape.
- A vertical swipe in portrait moves the sheet roughly with the finger (visual delta within about 20% of the finger travel) and does not scroll the board underneath. A horizontal swipe in landscape moves to the next screen. The scrollport has no ancestor with a CSS transform.
- `history.length` increases by 1 on open. The system back control closes the sheet and leaves the URL on `/`. A second back does not fire. After close, the board is at the same scroll offset and the Welcome tile is visible.
- The network log during open shows the resting image plus images near the viewport, not all 36 PNGs (11MB) at once.
- With `prefers-reduced-motion: reduce`, the sheet appears without a travel animation. Escape still closes.
- Open, scroll, close, and back still work after rotating from portrait to landscape while the sheet is open.

Success on the desktop controls:

- The open mosaic is still the five-column stage, scaled to the window, with the staggered fade. The header is still inside the stage. A screenshot at 1440×900 matches the current open mosaic.
- Hover-grow on the board columns still runs at 1100px and above, and still does not run below that.

Lab check, optional: `/lab/card` masonry at 390×844 opens the same sheet. Single-stage mode can stay the tiny artboard; do not treat that as a homepage failure.

Probe gap to close on a device before calling it done: repeat the portrait scroll and the status-bar check in iOS Safari. Chrome scrolled the transformed stage at roughly 1:1, and it does not draw safe-area insets. The sheet removes both dependencies, and Safari is still the confirmation.
