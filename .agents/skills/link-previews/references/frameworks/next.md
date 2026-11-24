# Link Previews: Next.js

Keeping the tool dev-only, and wiring metadata. Capture, the endpoints and the helper are in [../adapters.md](../adapters.md).

## Dev-only

Give the tool's files their own extension (`page.dev.tsx`, `route.dev.ts`) and let only the development server see it, which makes the config a function of the build phase:

```ts
// next.config.ts
import type { NextConfig } from "next"
import { PHASE_DEVELOPMENT_SERVER } from "next/constants"

const nextConfig: NextConfig = { /* the existing config, unchanged */ }

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER
        ? ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"]
        : ["tsx", "ts", "jsx", "js"],
  }
}
```

- Keep every extension the project already uses in both lists (`md`, `mdx` if it has them), or existing pages disappear.
- If the existing config is wrapped (`withMDX(config)`, a plugin), apply the wrapper to the object the function returns.
- Name every tool file with the extension: the page, each `route` file, and any `layout` beside them. Shared code the tool imports (components, the registry, capture) keeps normal names; it's only bundled when a dev page imports it.
- The tool stays under the root layout. Don't restructure the app to escape it; load only fonts there if you can and rely on the reset in [tool.md § Structure](../tool.md#1-structure). If the layout puts a global overlay or dev widget over the tool, tell the person.
- The endpoints still check `NODE_ENV === "development"` as a second guard.
- Check with the dev server stopped, since `next build` overwrites its `.next` output: the tool's URL and its endpoints return 404 from `next start`. Then restart the dev server.

## Per-route image files

If the site already uses the `opengraph-image` file convention, the save endpoint writes `opengraph-image.png` and `opengraph-image.alt.txt` (the alt text, as the helper builds it) into the route's folder instead of `<served>/og/`. Map rewritten paths to their folders in the manifest. Omit `images` from the metadata so the files are used.

## Metadata

### App Router

Return Next's shape from the helper (`openGraph` with `images: [{ url, width, height, alt, type: "image/png" }]`, `twitter` with `card` and `images`, and `openGraph.videos: [{ url, type, width, height }]` when the entry has a video), exported from a server `page` or `layout`.

**Gotcha:** metadata from layout and page segments merges shallowly. A page that sets `openGraph` or `twitter` replaces the parent's whole object, so a page adding its own `openGraph.title` loses the image. Spread the helper's object first: `openGraph: { ...p.openGraph, title }`, `twitter: { ...p.twitter, title }`. An explicit `openGraph.images` also overrides any `opengraph-image` file for that segment.

### Pages Router

Render the tags inside `next/head` in each page, giving each `meta` a `key` so a later `Head` replaces it rather than duplicating it: `<meta property="og:image" content={p.image.url} key="og:image" />`.
