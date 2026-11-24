# Link Previews: first-time setup

Building the manifest, the templates, the tool, the endpoints and the wiring for a site that has none of them. Read in this order: this file, then [tool.md](tool.md) and [adapters.md](adapters.md) in full, then exactly one framework file. The decision trees, the rules and the entry fields are in [../SKILL.md](../SKILL.md); exact values are in [tool.md](tool.md), [adapters.md](adapters.md) and the one file in [frameworks/](frameworks/) that matches the project.

Build it in the project's own framework with no new dependencies. Code in these files is illustration, not something to paste.

## 1. Where things live

- **Saved images** go in the site's **served folder** (`public/` in most frameworks, `static/` in some, the project root on a plain HTML site), at `<served>/og/<id>.png`. Nothing else is deployed.
- **The manifest and the sources folder** sit at fixed paths outside the served folder, such as `og-images.json` beside the site's config and `og/sources/`. On a site whose root is served, they go in the tool's folder (part 4).
- **Code** goes where the project's code goes.

## 2. Manifest

The single source of truth and **the list of pages**: the tool shows its entries, the save endpoint writes them, the metadata helper reads them. Status is never stored; the tool derives it.

```json
{
  "system": {
    "template": "plate",
    "color": "#000000",
    "domain": "example.com",
    "font": { "family": "Site Display", "titleWeight": 600, "labelWeight": 500 },
    "colors": {
      "light": { "background": "#ffffff", "ink": "#111111", "label": "#8a8a8a" },
      "dark":  { "background": "#0a0a0a", "ink": "#fafafa", "label": "#8a8a8a" },
      "panel": "#ffffff"
    },
    "margin": 56, "textBottom": 80, "panelGap": 48, "panelWidth": 540,
    "labelSize": 24, "labelLineHeight": 1.3, "labelGap": 48,
    "lineHeight": 0.9, "titleSize": { "min": 40, "max": 150 }, "maxLines": 4
  },
  "entries": [
    {
      "id": "field-notes",
      "path": "/field-notes",
      "title": "Field Notes",
      "group": "Writing",
      "theme": "light",
      "image": { "src": "og/sources/field-notes-hero.jpg", "focus": { "x": 0.5, "y": 0.5 } },
      "version": null,
      "savedHash": null
    }
  ]
}
```

**`system`**, set once from the site's real CSS:
- `template`: the template every page uses, a registry name (part 3). `plate` to start.
- `color`: `#rrggbb`, used only by templates that declare it (Poster). `#000000` (see the Rules in SKILL.md).
- `domain`: the label on every image, the bare domain with any leading `www.` dropped.
- `font`: the display family, used for both the title and the domain label. `titleWeight` is the weight the site's own headings use, even when the family has lighter ones, because the title has to read at thumbnail size. `labelWeight` is the weight the site uses for small text in that family, or 500 when it uses none. `family` is one web font name, or for installed fonts the site's full stack as written in its CSS (`"Avenir Next", Avenir, system-ui, sans-serif`).
- `colors`: `background`, `ink` and `label` for light and dark, plus `panel`, one color for both themes that shows only behind an image's transparent parts. Use the color the site's images sit on, so a transparent image looks as it does on the page.
- The geometry numbers stay exactly as shown, `textBottom` included ([why](tool.md#14-templates)): every template's boxes and the title fitting in [tool.md § Templates](tool.md#14-templates) are derived from them. Replace the example font and colors with the site's.

**`entries`**: the fields are defined in [SKILL.md § Entries](../SKILL.md#entries). The save endpoint validates every key and writes `version` and `savedHash` ([adapters § Save endpoint](adapters.md#save-endpoint)); `savedHash` is defined in [adapters § Definition hash](adapters.md#definition-hash).

The tool shows groups in the order they first occur and pages in manifest order, so order entries the way the site presents its pages.

## 3. Frame and templates

Every template draws one frame: **1200×630** CSS pixels, captured at 2× as a **2400×1260** PNG ([except some Image only pages](tool.md#11-saving)). The tool's previews, the All grid, the Template gallery and the capture all render that same frame; there's no second renderer. It uses inline styles only, because the capture serializes its DOM, and a plain `<img>`, because the capture needs the real source URL. If the project requires its own image component everywhere, the frame and the tool's own thumbnails and picker are the one place to break that rule, for the same reason: use a scoped exception (a per-line lint disable with the reason, a note in the registry's top comment) and tell the person, because a silent exception reads as a mistake in review.

**Fonts.** The frame uses the site's real display family, and titles are fitted by measuring with it in the browser.
- **Web fonts** (the family has `@font-face` rules): the capture inlines them, so the image matches on any machine.
- **Installed fonts** (no `@font-face`): there's nothing to inline. Keep the site's full stack, and tell the person that images are drawn with whatever fonts the capturing machine has, so they have to save from a machine with the site's fonts installed.
- Use a variable font as is. Cut fixed weights only if the capture can't render it.

**The registry is one file** (for example `src/lib/link-previews/templates.<ext>`) holding the shared frame parts, every template and a registry object ([tool.md § Templates](tool.md#14-templates)). Put a comment at its top explaining how to add a template and the rules every template keeps, because the tool's "Make your own" prompt sends the person's agent there. Template names and each one's `uses` go in a separate plain module with no framework or DOM code, imported by both the registry and the save endpoint, because the endpoint validates the name and needs `uses.color` for the hash.

- **Plate** is the default. It is Josh's design, so build it exactly: the domain small and gray at the top left, the title as large as fits at the bottom left, and the image bleeding off the right edge, 540 of 1200 wide and full height. Nothing else: no subtitle, description, date or logo. With no image it's type only, the title across the full width.
- **Poster** is one solid site color (`system.color`) with Plate's type-only layout and no theme.
- **Inset** is Plate with the image as a rounded card inside the margin.

Each page also has a layout: Type only, Type and image, or Image only ([tool.md § Layouts](tool.md#layouts)).

## 4. Dev-only

The tool page, the save and upload endpoints and the source route exist only in development, because the endpoints write files into the repo. The endpoints also refuse non-local callers ([adapters § Who may call](adapters.md#who-may-call)). The tool page is `noindex`, never linked and never in the sitemap. Use what the project already runs locally:

- **A framework with a production build**: the endpoints are the dev server's own server routes (or a dev-only plugin). Exclude the tool and endpoints from the build so production returns 404, and have each also refuse outside development mode.
- **A static site with a small local server** (no build step): the tool, its endpoints, the manifest and the sources go in one folder, such as `tools/link-previews/`, that the server loads only in development. With no build to exclude it, the real guard is a **deploy rule**: the folder is never uploaded. Write it in the agents file and README, and tell the person.
- **Nothing to run locally** (files opened directly, a hosted editor): say so in a line and fall back. The tool downloads each PNG with a JSON snippet, and you move them into place and merge the manifest.

## 5. The tool

A dev-only page inside the person's app, for example at `/link-previews`, running on their dev server so the frame uses their real fonts and images. It has an **All** grid of every page; a **page view** where the person edits the title in place, drags the image to crop, and picks theme and source; and a **Template** gallery with a "Make your own" prompt. Its page list is read-only, because pages change in the manifest, alongside the site's own code. Build it from [tool.md](tool.md), which has every value, string, state and key.

## 6. Capture and save

The tool makes each PNG in the browser, with no library, and posts it to the save endpoint, which writes exactly two things: the PNG and the manifest. An upload endpoint puts the person's own images into the sources folder, and a video endpoint adds or removes a page's optional MP4 at `<served>/og/<id>.mp4` ([adapters](adapters.md)). Messages needs the video tags in the served HTML, since it runs no JavaScript.

The PNG goes to `<served>/og/<id>.png`. If the site already serves per-route image files by framework convention (Next's `opengraph-image.png`), write there instead, because replacing a working convention breaks the pages that rely on it.

A type-only image is around 0.1 MB and a photo-heavy one up to 1.6 MB, and each save takes under a second, so Save all on a small site takes seconds and writes a few megabytes. Whether to export JPEG for photo-heavy frames isn't settled; keep PNG unless the person asks.

## 7. Wiring

One metadata helper per site returns everything a page needs for a path: the absolute, versioned image URL (`https://example.com/og/field-notes.png?v=3f9a1c0b2d4e`) with its size, type and alt text, the `og:*` tags, and `twitter:card` `summary_large_image`. Pages pass their own title and description. Plain HTML has no imports, so a wire script writes the tags into each page instead. Shape and rules: [adapters § Wiring](adapters.md#wiring).

**If the site already has a metadata helper** (per page, or a layout the home page inherits from), don't add a second system, because two sources for the same tags drift apart. Add one small function that returns just the image part, and call it everywhere the site sets Open Graph or Twitter data, including the layout or home page ([adapters § Extending an existing helper](adapters.md#extending-an-existing-helper)).

A page with no saved file uses the site's existing default share image, or gets no image tags, because a tag pointing at a missing file shows a broken preview.

## 8. Agents-file rule

The tool doesn't create or rename pages, so keeping the manifest in step falls to whoever changes the site. Add a section to the project's agents file (`AGENTS.md`, `CLAUDE.md`, or whatever it already uses), creating `AGENTS.md` only if there's none. If one file includes or points to another (`CLAUDE.md` importing `AGENTS.md`, or saying "see AGENTS.md"), add it once, to the included one. If they're maintained separately, add it to each.

Fill in the real paths:

```md
## Share images

Every public page has a share image, made in the Link Previews tool and saved as a static file.

- When you add, rename or remove a public page, update `<manifest path>` in the same change: add an entry for a new page (a stable `id` made from its path, its path, real title and group, and an image from the page's own material copied into `<sources folder>`), change only `path` when a page moves, remove the entry when a page is deleted.
- Then open `<tool URL>` on the dev server, check the image, and save it. Re-save when a page's title or main image changes.
- Wire new pages with `<helper name>(path)` so they get the Open Graph and Twitter tags.
- Never report a share image as done until its file exists.
```

`<tool URL>` uses the project's own dev port: `http://localhost:<port>/link-previews`. Add these lines when they apply:

```md
- After saving images, run `<wire command>` so every page's tags carry the new image versions.   (sites wired by a script)
- `<tool folder>` is a local development tool: never deploy it.   (sites with no build step to exclude it)
```

Show the person exactly what you added and where.

## 9. A new site, step by step

1. **Follow the project's own instructions** for the work, such as reading the framework's bundled docs first. Then **detect** the framework and router (or none), the served folder and how the site deploys, what runs locally (a dev server, a small static server, nothing), the project's checks (type-check, lint, build, tests), the host's interface font ([tool.md § Tokens](tool.md#2-tokens)), the site's display font (family, weights, whether it has `@font-face` rules and where, or is installed), its background, ink and muted colors in light and dark, the domain, the sitemap's address if any, and the agents file.
2. **List the pages** with the pages tree in SKILL.md, and choose groups. Confirm the pages, groups and exclusions with the person before generating anything, because every later step multiplies by the page count.
3. **Gather** each page's image with the image tree in SKILL.md.
4. **Write the manifest**: template `plate`, and an entry per page.
5. **Build** the frame, the registry with Plate, Poster and Inset, title fitting, capture, the endpoints, the source route and the tool.
6. **Check every frame** in the All view: nothing overflows and every crop fills its panel. Fix what you can in the manifest.
7. **Hold it to the project's bar.** With a type-check and linter, the tool adds no errors. Meet a strict linter by restructuring the code, never by disabling a rule; the scoped `<img>` exception is the only one. With a production build, stop the dev server first (a build overwrites its output), build and start production, confirm 404 for the tool page, every endpoint and the source route, then restart the dev server. If the dev server must stay up, build into a separate output folder; if that isn't possible either, say the check wasn't run. With neither, check each new script's syntax (for example `node --check`), confirm the tool's folder isn't served in production mode, and say which checks the project didn't have.
8. **Use every control once** in the running tool: select pages, edit a title and add a line break, drag a crop and nudge it with the arrows, switch theme and image, choose a source, upload an image and drop one on the frame, switch template and change the color under Poster (then undo both, so nothing is saved with a template the site doesn't use), undo and redo, and save one page. Upload only real candidates for real pages, never a throwaway test file, because uploads stay in the sources folder and nothing removes them. With no real new image, skip upload and drop, and report them as untested. Fix what breaks.
9. **Hand it over** with the tool's URL and a one-line guide: pick a page, edit the title in the image, drag to crop, choose or upload an image, try templates, then Save or Save all.
10. **Save.** The person presses Save all, or you do in a browser if you're allowed to drive one. Confirm each file exists.
11. **Wire** every page (part 7), running the wire script on a script-wired site, and **add** the agents-file rule (part 8).
12. **Verify**: every page's HTML has `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:card` and `twitter:image` with absolute URLs; every saved image returns 200 as `image/png`, at the size its tags state, and is under 5 MB; the sitemap, if any, lists the same pages as the manifest. Report what you checked and what you couldn't.

## 10. A site with existing share images

1. **Inventory** static files, build-time generators (Next `opengraph-image.tsx`, a Satori script, a hosted image service) and per-page metadata, and tell the person what you found before changing anything.
2. **Hand-made images** become Image only pages (image case 1), saved with the rest; at the frame's shape the save writes the file as made. Leave the old tags until then.
3. **Generated images** (one template for every page) are what this replaces. Draft entries for those pages, and leave the old generator wired until the person has saved the new images and agreed to switch, so the site never goes without images. Then point the metadata at the helper and tell them the old generator can go; don't remove it yourself.
4. **Keep their conventions**: per-route files where the site uses them, and the existing metadata helper, extended.
5. Continue from step 3 of a new site.
