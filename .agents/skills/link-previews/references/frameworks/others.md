# Link Previews: other frameworks

Keeping the tool dev-only in Vite-based apps, SvelteKit and anything else, and the metadata pitfalls worth knowing. Capture, the endpoints, the helper and the tags to produce are in [../adapters.md](../adapters.md).

## Dev-only

**Vite-based apps** (Vue, Svelte, plain Vite): serve the endpoints from a small project plugin with `apply: 'serve'`, so it exists only under the dev server, adding a middleware in `configureServer` (`server.middlewares.use(...)`) that handles `/link-previews/*` requests. A single-page app has no server props, so the same middleware answers a `GET` state request with what the tool needs from the server ([tool.md § Structure](../tool.md#1-structure)). Put the tool page behind the same plugin (an HTML entry it serves) or a client route that only registers when `import.meta.env.DEV` is true, so the production bundle leaves it out.

**SvelteKit**: put the endpoints in `+server` routes and the tool in a `+page`, each returning a 404 (`error(404)`) unless the `dev` flag from `$app/environment` is true.

**Anything else**: exclude the tool's route and endpoints from the production build if the framework allows it; otherwise check the framework's dev flag in each and return 404.

## Metadata pitfalls

- **Remix / React Router**: a route `meta` export replaces its parents' array entirely, so each route's array includes every tag. React 19's `<meta>` elements rendered in the route component hoist to `<head>` and avoid this.
- **Astro**: set `site` in the Astro config, because absolute image URLs are built from it (`new URL(path, Astro.site)`).
