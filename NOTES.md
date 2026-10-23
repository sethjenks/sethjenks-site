# Living monsters

A visitor selects ink on the home page wall and presses Bring to life. Those strokes peel off the canvas and walk the page as one creature. This is a prototype on `monsters-prototype`. It does not merge to `main`.

## Architecture

The synced wall document is not edited. Bring to life never creates, edits, or deletes records. On a licensed host the canvas is still tldraw, with the toolbar and style panel hidden. The pen is black and it is the only drawing tool. Select, in the bar under the wall, switches to the select tool so a visitor can drag around strokes. With nothing selected, Bring to life uses the strokes that visitor just drew.

Selected marks are hidden with a local stylesheet (`opacity: 0 !important`, because tldraw sets inline opacity). Local preview strokes use the same veil on `[data-ink-id]`. When the creature dies, that stylesheet is cleared and the strokes come back.

Trait math and the walker live in `src/lib/monsters`. The button sits under the wall. The creature is a `position: fixed` stage mounted from the root layout so it survives client navigations. `MonsterHost` listens for `monster:summon` and only then loads `MonsterStage` with `next/dynamic` and `ssr: false`. Until someone summons, the home page does not download the walker.

The editor is published through a tiny external store (`editor-bridge.ts`). Putting `setState` in the tldraw `onMount` callback remounts the editor in a loop and leaves the canvas on its loading screen. The mount callback stays a stable module function.

## Preview canvas

The blank preview was not a failed socket. The preview connects to `wss://sethjenks-wall.sethjenks.workers.dev` (handshake 101). About five seconds later tldraw hides the whole editor: the license key is not valid for `*.vercel.app` preview hosts, and `LicenseProvider` renders an invisible gate (`unlicensed-production`). The page then shows a white board and the bar, with no toolbar.

Preview hosts (any `*.vercel.app` host other than `sethjenks-site.vercel.app`) therefore skip tldraw and draw on a local pen canvas in the browser. That canvas does not open a socket and does not write wall records. If the shared socket is missing, errors, or is still loading after 8 seconds, the same local canvas is used and the bar says the shared wall did not connect. The production alias keeps the synced tldraw wall.

One creature at a time. A second press is disabled and the hint says one creature is already on the page.

### Why a custom solver

The page already has a small kinematic solver in `src/lib/playfield-physics.ts`. A monster is one character on moving DOM rectangles. It needs gravity, a floor, step-up, and a side bonk. It does not need a constraint solver, stacked rigid bodies, or fracture. Matter.js would add a second world and a larger lazy chunk for behavior the DOM rects do not require. Decay is a scripted burst of the original strokes, not a broken rigid body.

`simulate.ts` is an AABB kinematic controller:

- Gravity is about `1900 + mass * 180`.
- Feet land on the top of a collider, including the viewport floor.
- Side hits resolve to the nearer edge that still fits in the viewport, then the creature bonks.
- A step of up to 40px becomes a step-up instead of a wall.
- The wall (`.message-board`) and anything taller than 70vh are one-way lips, so the 50svh canvas does not cage the creature.
- Colliders are viewport rects from headings, work cards, logo cards, project rows, the header, the footer, and a few other page blocks. The list is cached and rescanned about every 450ms, capped at 36 (24 on a narrow screen). `.tl-container` descendants are skipped.
- Platforms keep a stable key, so a creature standing on a card rides that card when it moves.
- `dt` is clamped to 1/30s. A hidden tab pauses the clock, so a backgrounded life does not burn down in one frame.

## Trait mapping

Traits are pure functions of the stroke points in page space, with the drawing's own bounding box as the origin. Screen position and zoom do not change the name. Strokes are sorted by position before hashing, so selection order does not change the name either.

| Signal | Measure | Result |
| --- | --- | --- |
| Ink | `sum(path length * width)`, then a log curve from 280 to 18000 | Size word (small / medium / large), mass 0.85 to 2.6, speed 156 down to 54. More ink is slower. |
| Legs | A stroke that reaches the bottom band, rises out of it, and is taller than it is wide, while some other stroke stays above the bottom 80% | Those strokes swing about ±18°. None, and roundness under 0.58: hops. None, and roundness at least 0.58: rolls. |
| Mood | Length-weighted mean turn angle versus roundness (smoothness, aspect, loopiness, closed bonus) | `jaggedness - roundness > 0.04` is grumpy and rams. Otherwise friendly: faces the cursor, slows when close, hops toward a cursor above. |
| Looseness | Mean gap between stroke ends, over 22% of the diagonal. A single stroke is 0.12. | Lifespan lerps from 60s to 30s. |
| Name | FNV-1a of the quantized points, into a pool of 48 short names | Shown on the trait card with the size, mood, gait, and seconds left. |

Display height is about 88 to 200px on a wide screen and smaller under 720px, with a max width of 260px or 168px. Ink is resampled to 80 points. Colors follow tldraw's light theme. White ink is drawn as near-black so it stays visible on the page.

The card is paper, a 1px hairline, and a 2px radius. The button is a quiet ink control, 44px tall, with the 12px key radius and a paper face. It is not a second glass cap.

## What works

Checked in the browser against a local sync worker (not the production wall):

- On a licensed host the wall still connects. The only drawing tool is a black pen. Select is a separate control in the bar. Bring to life uses the current selection, or the strokes drawn in this visit when nothing is selected.
- Vercel preview hosts skip tldraw (the license hides that editor) and draw on a local canvas. The shared room is not written. A failed or slow sync uses that same canvas.
- The strokes fade off the canvas. The creature peels, lands, and walks. Legs swing. A friendly creature turns when the cursor crosses to the other side.
- The trait card and the screen-reader status follow the creature (`Pell is on the page. Small, friendly, 2 legs, about 54 seconds.`).
- A grumpy wide-card case is covered by a unit test: the creature leaves the card instead of pinning itself to the screen edge.
- After the lifespan the status becomes `{Name} fell apart.` and the wall strokes return.
- `prefers-reduced-motion: reduce` skips the peel and the walk. The creature sits on its landing spot and the life clock still runs. Death is a short opacity fade.
- A 390px viewport wraps the bar, keeps a 44px button, does not overflow horizontally, and uses the smaller creature size.
- `pnpm test:monsters` covers ink, legs, mood, looseness, names, landing, bonk, riding a moving platform, hop, decay, and reduced motion. Sixteen tests.

## What's rough

- Leg detection is a heuristic. A single closed loop is never a leg. A body stroke that also reaches the bottom suppresses legs, and the creature hops or rolls instead.
- A friendly creature that wants the cursor will press into a solid and stay there until the cursor moves to an open side. Grumpy creatures reverse. Neither one pathfinds.
- Standing inside a very wide solid is resolved by the nearer edge. A card wider than the viewport can still shove the creature to a side that immediately blocks it.
- Names can collide. The pool is 48 words.
- The creature is fixed to the viewport. Scrolling moves the page under it, and `rideSupport` carries it only while its feet still match the previous platform. A fast scroll can drop it onto a new surface.
- The button and the stage each carry a copy of the small trait helpers. The stage chunk is the one that stays off the home page until summon.
- Dev Strict Mode restarts the peel. The store is not released on that remount, or the creature would die immediately.
- Decay is a short scripted burst (about 1.15s, or 0.35s with reduced motion). It is easy to miss if you look away at the end of a 30 to 60 second life.
- The local demo in this environment needed real pointer events. Synthetic `pointermove` events do not reach tldraw's body-level listener, so programmatic clicks draw dots.

## Reduced motion and performance

Motion for the creature is a `requestAnimationFrame` loop, paused while `document.hidden`. Reduced motion is read at summon and tracked if the preference changes. CSS for the button only transitions `background-color`, and only under `prefers-reduced-motion: no-preference`. Hover styles sit under `(hover: hover) and (pointer: fine)`.

The home route does not import the stage. The synced tldraw chunk loads only when the host is allowed to use it. Preview and offline visits load the local pen instead. The walker, collider scan, and SVG stage load on the first summon.

## Multi-monster and shared creatures

Not built. A reasonable next sketch:

- Keep wall records immutable. A summoned creature is a separate short-lived sync record, not a deletion of the drawing. Payload: stroke points, colors, widths, derived traits, `bornAt`, and a client id. Every client runs the same deterministic walker from `bornAt`, so playback agrees without a physics server. Despawn when `bornAt + lifespan` passes.
- Multiple monsters need a separation force and a rule for who stands on a shared platform. Start with "ignore each other, then add a soft push when bounds overlap." Grumpy rams could exchange a bonk. Friendly creatures could bias toward the nearest cursor on that client only, which will not match across clients. Either share one cursor (the summoner's) or drop cursor following in the synced version.
- One live creature per client is the current guard. A shared room wants a small cap (three or so) so phones do not scan colliders for a crowd.

## Next steps

1. Playtest real drawings on the production wall and tune the leg and mood thresholds against those strokes.
2. Give grumpy and friendly creatures a short stuck-timer so pressing into a card for a second turns them around.
3. If shared creatures are worth it, add the short-lived sync record above and keep the wall document read-only.
4. Capture a decay that is easier to see: a slightly longer burst, or a status line that announces the last few seconds.
