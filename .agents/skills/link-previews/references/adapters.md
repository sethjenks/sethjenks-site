# Link Previews: capture, endpoints and wiring

Capture, the dev-only endpoints, the definition hash and the metadata helper, the same in every framework. Per-framework setup is in [frameworks/](frameworks/); the pattern is in [../SKILL.md](../SKILL.md). Paths such as `<tool path>/save` are placeholders to adapt to the app.

---

## Capture

In the browser, no library.

1. **Refuse early.** Except in Image only, which has no title, wait for fonts and fit the title in the current template's `titleBox` ([tool.md § Title fitting](tool.md#title-fitting)). If it overflows, stop with: "The title doesn’t fit, even at 40px. Shorten it or break it differently, then save."
2. **Render a clean frame offscreen.** The current template's plain frame, never the editable one: no contenteditable, no crop target, no focus rings. Mount it in a host that is `aria-hidden`, `inert`, `position: fixed; left: -20000px; top: 0; width: 1200px; height: 630px; pointer-events: none`, with the framework's own mount call (React `createRoot` + `flushSync`, Vue `createApp(...).mount`, Svelte `mount`; for plain DOM templates, call the frame function and append the element). Wait until its DOM exists. Remove the host and unmount when done, even on failure.
3. **Wait for images.** `await img.decode()` on every `<img>`; fail with "Could not load <src>." if one doesn't.
4. **Inline images.** Clone the frame. For each cloned `<img>`, fetch the original's `currentSrc || src` and set the clone's `src` to a data URL.
5. **Inline the font.** Walk `document.styleSheets`, skipping sheets whose `cssRules` throw. For each `@font-face` whose family is the frame's family and whose style is normal, pick the first `url()` in its `src` list in a format every browser reads (`woff2`, `woff`, `truetype`, `opentype`), skipping `local()`. Take the format from the rule's `format()`, ignoring a `-variations` suffix, or else from the file extension (`.woff2`, `.woff`, `.ttf`, `.otf`). Resolve it against the sheet's `href` or `document.baseURI`, fetch it, and write `@font-face{font-family:"<family>";src:url(<data URL>) format("<format>");font-weight:<rule's weight>;font-style:normal;}`. When `system.font.family` is a stack, look for rules for each named family. Then:
   - **Rules found and usable**: inline them.
   - **Rules found but none in a usable format**: fail with "Could not find the <family> font on this page."
   - **No `@font-face` rule for any of the names**: the site uses installed fonts. Inline nothing and carry on; the SVG uses the frame's own `font-family` stack, which the capturing machine resolves. Don't fail the save. (The person was told at setup.)

   Cache per family, and drop the cache on failure. This finds the font however the site loads it (a CSS file, a framework font loader, a font package), as long as the rule is in a readable stylesheet on the tool page ([tool.md § Structure](tool.md#1-structure)).
6. **Wrap in SVG.**
   ```html
   <svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1260" viewBox="0 0 1200 630">
     <foreignObject x="0" y="0" width="1200" height="630">
       <div xmlns="http://www.w3.org/1999/xhtml" style="width:1200px;height:630px;margin:0;padding:0;overflow:hidden">
         <style>…inlined @font-face…</style>…serialized frame (XMLSerializer)…
       </div>
     </foreignObject>
   </svg>
   ```
7. **Draw at 2×.** Load the SVG as `data:image/svg+xml;charset=utf-8,` + `encodeURIComponent(svg)`, `await decode()`, and draw onto a 2400×1260 canvas. Wait one animation frame, clear, and draw again, since Safari may paint a foreignObject's fonts and images only on a later draw.
8. **Export and check.** `canvas.toDataURL('image/png')`. Read the PNG header (bytes 12 to 15 are `IHDR`; width at 16, height at 20, big-endian) and fail unless it's exactly 2400×1260: "The capture came out <w>×<h>, not 2400×1260."

Pitfalls: every image must be same-origin (served by the dev server), or the canvas is tainted and export throws. With web fonts, only the inlined family exists inside the SVG, so the frame can't depend on any other web font.

---

## Who may call

Both write endpoints (save and upload) share one guard. Refuse with 403 and the sentence shown:
- [ ] The server isn't in development mode: "Development only."
- [ ] The method isn't `POST`: "POST only."
- [ ] `Host` isn't `localhost`, `127.0.0.1` or `[::1]` (optional port); or the request URL isn't `http:` on such a host; or a `Forwarded` header is present; or `X-Forwarded-Host` is present and differs from `Host`; or `X-Forwarded-For` / `X-Real-IP` list anything but `127.0.0.1`, `::1`, `::ffff:127.0.0.1`: "Local requests only."
- [ ] `Origin` isn't exactly `http://<Host>`; or `Sec-Fetch-Site` isn't `same-origin`; or the header `x-link-previews: 1` is missing: "Use the Link Previews tool."
- [ ] `Content-Type` isn't `application/json` (or `video/mp4` for a video upload): "Send JSON."

Read the body as a stream, counting bytes, and refuse with 413 as soon as it passes the endpoint's limit (or when `Content-Length` declares more). Replies are JSON with `Cache-Control: no-store`; failures are `{ error }`, a sentence the tool shows as is.

## Save endpoint

`POST <tool path>/save`. Body: `{ entry, png, template, color? }`, where `png` is a `data:image/png;base64,` string. Success: `{ entry, file, bytes }`. The tool adopts the returned entry.

**Accepts** (400 unless noted):
- [ ] Body at most 10 MiB (10 × 1024 × 1024 bytes): 413, "The image is too large to save." Base64 inside JSON caps the PNG itself at about 7.5 MB, well above what a 2400×1260 share image needs.
- [ ] `id` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, at most 64.
- [ ] `path` matches `^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$`, at most 200: "Use a path such as /notes, lowercase, without a query or hash."
- [ ] `title` a non-blank string, at most 200: "Add a title." `alt`, if present, a string of 1 to 420 characters after trimming: "The alt text must be 1 to 420 characters." `group` non-blank after trimming, at most 40.
- [ ] `theme` is `light` or `dark`.
- [ ] `layout` is `type-only`, `type-and-image` or `image-only`, defaulting to `type-and-image` with an image and `type-only` without: "Choose a layout: type-only, type-and-image, image-only." A layout other than Type only needs an image: "Choose an image for this layout."
- [ ] `image` is `null`; or a single source with `focus.x` and `focus.y` in 0 to 1 and optional `zoom` in 1 to 4 (store no `zoom` when it's 1); or a sheet of 1 to 12 sources with integer `columns` 1 to 6.
- [ ] Every source: a string of at most 300 characters, unchanged by path normalization, inside the sources folder or one of a fixed list of folders set at setup: the folders of images entries already used then, which the picker also shows, with a file name of `[A-Za-z0-9._-]` not starting with a dot and ending `.png`, `.jpg`, `.jpeg` or `.webp`, and the file exists: "Use an image from the picker."
- [ ] `template` is a name in the shared template-names module ([setup § Frame and templates](setup.md#3-frame-and-templates)): "Choose a template: <names>."
- [ ] `color`, if present, matches `^#[0-9a-f]{6}$` (any case; store lowercase): "The color must be a six-digit hex, such as #000000."
- [ ] `png` starts with `89 50 4E 47 0D 0A 1A 0A` and has `IHDR` at bytes 12 to 15. Its size: for an Image only entry with one source and zoom 1 or absent, it passes `fitsFrame` ([tool.md § Saving](tool.md#11-saving)), else "The PNG must have the frame’s shape (1200:630, within 1%) and be at most 2400×1260."; for every other entry, exactly 2400×1260, else "The PNG must be exactly 2400×1260."
- [ ] No other entry has the same `path`: 409, "Another page already uses <path>."
- [ ] Where the router makes it cheap to tell, `path` has a real page: 422, "<path> has no page yet. Create the page first, then save its image."

**Writes**, one manifest write at a time across the save and video endpoints (one shared promise queue), so writes never interleave:
- [ ] Set `system.template` to the sent template. The tool sends `color` only when the drafted template uses color or the manifest already has a `color`; set `system.color` only when it's sent, so a site that never used a color template keeps none.
- [ ] `version` = first 12 hex of the SHA-256 of the PNG; `savedHash` = the definition hash with the saved template's `uses.color`.
- [ ] Add the entry (new id) or replace it (same id), keeping the old entry's `video`, which only the video endpoint changes.
- [ ] Write the PNG to `<served>/og/<id>.png` (for example `public/og/<id>.png`; `og/<id>.png` on a root-served site), creating the folder if needed, then the manifest (2-space JSON, trailing newline), each to a temp file renamed into place.
- [ ] Nothing else. Unexpected errors: 500, "The image could not be saved. Your draft is still here; try again." Log the real error on the server.

## Upload endpoint

`POST <tool path>/upload`. Body: `{ name, data }`: the file's name (at most 200 characters) and a base64 data URL. Success: `{ source: { src, label, folder } }`.

- [ ] File at most 10 MiB (10 × 1024 × 1024 bytes), with a body limit of `ceil(10 MiB × 4 / 3) + 64 KiB` for the base64 and the JSON around it: 413, "Images can be up to 10 MB."
- [ ] Type judged by bytes, not by name or declared type: PNG `89 50 4E 47 0D 0A 1A 0A`; JPEG `FF D8 FF`; WebP `RIFF` at 0 and `WEBP` at 8. Anything else: 415, "Upload a PNG, JPEG or WebP image." The extension written is the detected one (`png`, `jpg`, `webp`).
- [ ] Name: drop the extension, Unicode-normalize (NFKD) and strip accents, lowercase, turn runs of anything but `a-z0-9` into `-`, trim dashes, at most 60 characters; empty becomes `image`.
- [ ] Write a temp file, then hard-link it to `<name>.<ext>`, then `<name>-2.<ext>`, … (a link fails if the name exists, so nothing is overwritten), and remove the temp file. After 999 tries: 409, "Too many files with this name."
- [ ] Write into the sources folder only.

## Video endpoint

`POST <tool path>/video`. One optional MP4 per page, which Messages downloads and plays from a direct `og:video` link (Apple's TN3156). Changes take effect at once, writing the file and the entry's `video` together, so a video never waits on an image save.

- **Add or replace**: the file's raw bytes (not base64) as `video/mp4`, to `?id=<id>&width=<px>&height=<px>` (the tool reads the size in the browser). Success: `{ video, bytes }`.
- **Remove**: JSON `{ id, remove: true }`, body at most 4 KiB. Clears the entry's `video` and leaves the file. Success: `{ kept }`, the file's path, or nothing if there was no video. Any other JSON: 400, "Send a video, or { id, remove: true }."

Checks:
- [ ] `id` matches the save endpoint's id rule: "Choose a page." An id with no entry: 404, "No page has the id <id>. Save the page's image first." ("No page has the id <id>." when removing).
- [ ] `width` and `height` integers from 1 to 8192: "Send the video's width in pixels." / "Send the video's height in pixels."
- [ ] At most 8 MiB (8 × 1024 × 1024 bytes), declared or counted: 413, "Videos can be up to 8.4 MB. This one is <size>." (the second sentence only when the size is known). That keeps the image plus the video inside the 10 MB Messages loads for everything one link uses.
- [ ] MP4 judged by bytes: `ftyp` at bytes 4 to 7 and a major brand at 8 to 11 of `isom`, `iso2` to `iso6`, `mp41`, `mp42`, `avc1`, `M4V `, `mmp4`, `MSNV` or `dash`. QuickTime, 3GPP and HEIF share the container and are refused: 415, "That isn’t an MP4 video."
- [ ] Empty body: 400, "Nothing was sent."
- [ ] Writes `<served>/og/<id>.mp4` (creating the folder) and then the manifest, each to a temp file renamed into place, in the shared queue. Refuse if another entry's `video.src` is that file: 409, "Another page already uses <src>."
- [ ] The entry's `video` is `{ src: "<served>/og/<id>.mp4", type: "video/mp4", width, height, version }`, with `version` the first 12 hex characters of the bytes' SHA-256, so a replaced clip gets a new URL. Unexpected errors: 500, "The video could not be saved. Try again."

## Source route

`GET <tool path>/source?file=<name>` serves one file from the sources folder, which the site doesn't otherwise serve. Local hosts only (403, "Local requests only"); `file` must match `^[a-z0-9-]+\.(png|jpe?g|webp)$` (404 otherwise). Reply with the image type, `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

## Definition hash

What a saved image was made from, so the tool can tell when it's stale. One function, shared by the tool and the save endpoint.

```
layout = the entry's layout (as in tool.md § Layouts)
drawn = layout == "image-only"
  ? { title, layout, image }
  : { title, theme, layout, image: layout == "type-only" ? null : image, system: template.uses.color ? system : system without color }
text = canonical(drawn)
hash = 32-bit FNV-1a over the UTF-16 code units of text (offset 0x811c9dc5, prime 0x01000193), as 8 hex digits
```

- `canonical` is JSON with object keys sorted and `undefined` values dropped.
- An entry's `alt`, when present, joins `drawn`, so changing it makes the page Stale until a save writes it where alt text is a file.
- Only what's drawn counts: a Type only page's kept image doesn't, and an Image only page depends on no template, color, theme or `system`, so changing them never makes it stale.
- `system` is the whole `system` block **as it's being saved**: `template` set to the current template (so changing the template makes every saved image stale), and `color` included only when that template uses color, removed otherwise.
- The browser and the server must hash **the same normalized object**, or every page reads as stale after a reload: no `zoom` key when it's 1, no `undefined` keys, the color lowercased. The simplest way to guarantee it is for the server to compute `savedHash` from the entry exactly as it writes it, and for the tool to adopt the entry the server returns.
- Put the function and `canonical` in one module that both import, free of DOM access (in a plain JavaScript project, a browser ES module that Node can import too).

---

## Wiring

### The helper

```ts
type LinkPreview = {
  title: string
  description: string
  url: string            // absolute canonical URL: SITE_URL + path, plus a trailing slash if the site's URLs end in one
  siteName: string
  type: "website" | "article"
  image?: { url: string; width: number; height: number; type: string; alt: string }   // image/png, width and height read from the saved PNG's header (2400 × 1260 for a capture)
  video?: { url: string; type: "video/mp4"; width: number; height: number }       // when the entry has a video
  twitterCard: "summary_large_image"
}

linkPreview(path: string, page: { title: string; description: string; type?: "website" | "article" }): LinkPreview
// image.url = `${SITE_URL}/og/${entry.id}.png?v=${entry.version}`
// alt = (entry.alt ?? entry.title).replace(/\s*\n\s*/g, " "), everywhere alt text is written
// no saved file → the site's default share image (with its real size), or no image
// video.url = absolute URL of entry.video.src's public path, plus `?v=${entry.video.version}` when set; the image tags stay
```

The helper reads the manifest like any other import, so a new save shows up on the next build or reload. It never renders an image. The tags it should produce:

```html
<meta property="og:title" content="…">        <meta property="og:description" content="…">
<meta property="og:url" content="https://…">  <meta property="og:site_name" content="…">
<meta property="og:type" content="website">
<meta property="og:image" content="https://example.com/og/field-notes.png?v=…">
<meta property="og:image:width" content="2400"> <meta property="og:image:height" content="1260">
<meta property="og:image:type" content="image/png"> <meta property="og:image:alt" content="…">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="…"> <meta name="twitter:description" content="…">
<meta name="twitter:image" content="https://…"> <meta name="twitter:image:alt" content="…">
<!-- only when the entry has a video -->
<meta property="og:video" content="https://example.com/og/field-notes.mp4?v=…">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1080"> <meta property="og:video:height" content="1350">
```

### Extending an existing helper

Keep the site's own helper, layout or `<Seo>` component, and add one function that returns only the image part for a path:

```ts
shareImage(path: string): { url: string; width: number; height: number; type: string; alt: string } | undefined
```

Call it at every place that sets a page's Open Graph or Twitter data, and put its result into both. Don't forget the home page: if `/` gets its metadata from a layout rather than its own page, call `shareImage("/")` there. Where layouts pass metadata down (Next), every page that sets its own `openGraph` or `twitter` must include the image itself or it loses the layout's ([next.md](frameworks/next.md#metadata)). A page that sets neither inherits the layout's image, which is right only for the home page's own route.
