<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Share images

Every public page has a share image, made in the Link Previews tool and saved as a static file.

- When you add, rename or remove a public page, update `og-images.json` in the same change: add an entry for a new page (a stable `id` made from its path, its path, real title and group, and an image from the page's own material copied into `og/sources`), change only `path` when a page moves, remove the entry when a page is deleted.
- Then open http://localhost:43127/link-previews on the dev server, check the image, and save it. Re-save when a page's title or main image changes.
- Wire new pages with `shareImage(path)` from `src/lib/link-previews/share-image.ts` so they get the Open Graph and Twitter tags. Spread that image into `openGraph` and `twitter` on any page that sets its own metadata, so the image is not dropped.
- Saved PNGs live in `public/og/<id>.png`. Sources live in `og/sources`.
- Never report a share image as done until its file exists.
