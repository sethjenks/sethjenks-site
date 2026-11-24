---
name: link-previews
description: "Link Previews by Josh Puckett: give every public page of a site its own Open Graph / Twitter share image in the site's own look. Drafts one per page from the page's own imagery, builds a small dev-only tool in the app to adjust them and choose a template, saves static PNGs, wires og:image and twitter:card metadata, and adds an agents-file rule so new pages get one too. Works in React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Astro, Remix / React Router or plain HTML. Use for: OG image, Open Graph image, og:image, share image, social preview, social card, link preview, link unfurl, Twitter card, X card, summary_large_image, /link-previews."
---

# Link Previews

**By Josh Puckett**

Every public page of a site gets its own share image in the site's type and color, made from the page's own imagery. A manifest lists the pages, a dev-only tool in the app lets the person adjust each image and pick a template, and each save writes a static PNG the page's metadata points at.

## Which path

- **The project has a manifest and the tool** (its agents file has a "Share images" section naming them): do the upkeep below. You need only this file, the manifest and the agents file.
- **It doesn't**: build them with [references/setup.md](references/setup.md), which links the exact specs.

## Which pages get an image

Find pages in the sitemap (or whatever generates it), then the router, then links on the homepage and main navigation. For each page, the first matching case wins:

1. **Private, admin, auth, account or temp routes; API routes, feeds and redirects; dynamic route patterns with no content behind them**: exclude, and list each with its reason. A page a stranger can't open without signing in is excluded here, whatever else is true of it. Nobody lands on these from a shared link.
2. **Hidden from search or navigation but reached by link** (`noindex` pages, gated previews, campaign and landing pages, unlisted pages): list them separately and ask which get an image. They're often hidden because they're shared by hand, so they may be the links the owner shares most.
3. **A dynamic route with content** (a blog's `[slug]`): one entry per real page, from its content source. Over 20 pages, say how many and ask whether each gets its own, because every page adds a save and a file.
4. **Everything else**: include it.

## Which image a page gets

Look at the rendered page, not just the code, because the image that matters is often set in CSS, loaded by a component, or the result of an interaction. Copy every candidate into the sources folder as `<id>-<what-it-is>.<ext>` in lowercase kebab-case; copy, don't move, because the page still uses the original. An image that stands for the page elsewhere on the site (the card or thumbnail another page links to it with) counts as the page's own. If the page's image or description plainly belongs to another page (copied from it), ask before saving, because the share image would promise the wrong page. The first matching case wins:

1. **The page has its own hand-made share image**: copy it into the sources folder, point `image` at the copy, and set `layout` to `image-only`, which draws the image alone across the whole frame. Leave its `zoom` at 1 and don't crop or resize it yourself: at the frame's shape it saves as the file itself, and zoom over 1 or a changed shape sends it through the capture, so it stops being the file the person made. Copy its own alt text (an `og:image:alt` or `twitter:image:alt` tag, an alt text file, metadata) into `alt` word for word; it's the person's writing. A site-wide default (one `og:image` in the root layout) isn't hand-made, so skip this case for it; it stays the fallback for pages with no saved file. If that same file was clearly made for the home page (it shows the home page's title or hero), ask; if the person keeps it, the home page gets it this way and it stays the fallback too.
2. **The home or index page**: a sheet of 4 or 6 of the strongest images from the pages it links to, in 2 columns, dark theme. It stands for the whole site. Tiles have no focus and are center-cropped, so use images whose subject survives a center crop, or copy a tile-shaped crop into the sources folder first.
3. **A raster image of the page's own that fills a tall panel with one clear subject** (hero, lead image, product shot, screenshot, photograph, diagram): use the one with strong shapes and the least small text, because it's seen at thumbnail size. Set `focus` on the subject in the 540×630 panel. The panel is drawn at 2×, so a source under 1080×1260 pixels looks soft. Still use it when it's the page's real image, and tell the person which images are soft so they can supply larger files.
4. **SVG or canvas art**: once the tool runs, draw it onto a canvas of at least 1080×1260, export a PNG and send it through the tool's upload endpoint. Inline an `<svg>`'s styles first and serialize it to a data URL, because the page's stylesheet doesn't travel with it; a `<canvas>` exports directly. Say which panels you made.
5. **Only weak imagery** (a wide banner that won't crop to a tall panel, a mostly white screenshot, one small diagram): build a panel from the page's own artwork (its illustration exported at size, its demo rendered, its figures recomposed, a full-resolution screenshot of its most characteristic part) and say what you made. If you can't, go on to the next case.
6. **Art that is HTML and CSS you can't save at full resolution**: type only. Name these pages and tell the person they can capture the art and drop it on the frame or use Upload.
7. **Nothing visual**: type only. It's a finished design, not a fallback.

## Rules

- **Never use stock images, invented imagery or AI-generated images** unless the person asks. A share image promises what's behind the link, and only the page's own material keeps that promise.
- **Ask before switching a page that arrived with a hand-made image to a templated layout.** Someone made it on purpose for that page, so whether it goes is the person's call.
- **Keep `zoom` at 1, or at most 1.5 to cut past white margins, device chrome or dead space**, unless the person asks for more. The tool has no zoom control, so an over-zoom can only be undone in the manifest.
- **Leave `system.color` at `#000000`**, Josh's default, unless the person asks for another. Only Poster uses it, and the person picks it in the tool's Template view.
- **Never say an image exists until its file does.** Check the file on disk after every save and call anything unsaved a draft, because drafts live only in the tool's memory and a reload loses them.
- **Never commit, deploy or install dependencies unasked.** The pattern needs no dependencies, and committing and deploying are the person's call.
- **The tool never ships.** Its endpoints write files into the repo.
- **The image is always the default; a video is an extra.** Only Messages is confirmed to play `og:video` (it downloads and plays a direct MP4 link); every other app shows the image.
- **Tell the person that platforms cache previews**, so an old image where the page was already shared doesn't read as a failed save. The versioned URL helps once the page is fetched again, and most platforms offer a way to force a re-fetch.

## Entries

One manifest entry per public page:
- `id`: lowercase kebab-case, at most 64 characters, made from the path (`/` is `home`, `/blog/first-post` is `blog-first-post`). It names the image file and never changes, so a moved page keeps its image.
- `path`: `/` or lowercase `a-z0-9-` segments, with no query, hash or trailing slash, at most 200 characters, unique. If the site's URLs end in a slash, still store `/work/first-project`: compare paths without the slash, and add it back only when writing a URL.
- `title`: the page's real title as a reader would name it, at most 200 characters: its `og:title`, else its `<title>` without the site name ("Field Notes | Example Studio" becomes "Field Notes"), else its main heading. Leave the site name out, because the domain label already shows it. `\n` is a deliberate line break.
- `group`: a heading in the tool, at most 40 characters. With URL folders (`/blog/…`), the first folder title-cased ("Blog"), with top-level pages under "Pages"; otherwise the site's own sections from its navigation or homepage ("Writing"); otherwise one group named for what the pages are, or "Pages". A new page takes the group its siblings use.
- `theme`: `light` or `dark`. New entries start `light`; the home page's sheet is `dark`.
- `image`: `null` (type only), one source `{ src, focus, zoom? }`, or a sheet `{ sheet: [src, …], columns }` of 1 to 12 sources in 1 to 6 columns. Sources are paths from the project root; `focus` is 0 to 1 on each axis; `zoom` is 1 to 4, absent meaning 1.
- `alt` (optional): the image's alt text, 1 to 420 characters (X's limit); without it, the title. Take it only from a hand-made image or the person, never write it: the title is true of every image the tool draws, and your description would be a guess about someone else's picture.
- `layout`: `type-only`, `type-and-image` or `image-only`. The `image` stays whatever the layout, so Type only and back keeps it. With no `layout`, a page reads as Type only without an image and Type and image with one.
- `version` and `savedHash`: `null` in a new entry. The save fills them.
- `video` (optional): `{ src, type: "video/mp4", width, height, version }`, with `src` the path from the project root to `<served>/og/<id>.mp4` and `version` the first 12 hex characters of the file's SHA-256, added to its URL as `?v=` (an older `video` without one still works). Only the tool's video control writes it. It isn't in the definition hash, so it never makes an image stale.

## Upkeep

The manifest path, sources folder, tool URL, helper name and any wire command are in the agents file's "Share images" section.

- **A page was added**: run it through the pages tree. If it gets an image, add an entry with the fields above, placed beside its siblings, because the tool lists pages in manifest order. Pick its image with the image tree. In the tool on the dev server, select the page in the list, check the preview, press Save, then check the file; or ask the person to. Wire the page with the helper. On a script-wired site, run the wire command and confirm only the intended page's tags changed, because the script rewrites every page. Confirm the saved file exists before calling it done.
- **A page moved**: change only `path`. The `id`, and so the image file, stays.
- **A page was removed**: remove its entry. Leave its PNG and tell the person it's unused, because deleting files is their call.
- **A page's title, alt text or main image changed**: update `title`, `alt` or `image` and re-save. The tool marks it Stale until then.
- **The person wants a video for a page**: they supply it, a short MP4 (H.264) clip of the page's own subject, at most 8 MiB; never generate or invent one, for the same reason as images. In the tool's page view, press Add video or drop it on the frame; it saves at once once the page has a saved image. On a script-wired site, run the wire command. Asked for a video on every page, first say the cost (a file per page, each page's image and video inside the 10 MB Messages loads per link) and wait for a yes.
- **The person wants their own template** (or pastes the tool's "Make your own" prompt): read the comment at the top of the registry file, write a component from the shared parts, add its name and `uses` to the template-names module and one entry to the registry, and change no existing template, because every saved image is drawn by one of them. It appears in the Template view. If it needs a new site-wide value, add it to `system`, and to the definition hash only when the template uses it, as with `color`. Don't invent templates unasked. Specs: [tool.md § Templates](references/tool.md#14-templates).
