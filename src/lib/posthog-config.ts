/** Browser events are rewritten to the ingestion host. See next.config.ts. */
export const POSTHOG_PROXY_PATH = "/ingest";

export const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

/** Pinned to the defaults date in the current PostHog Next.js docs. */
export const POSTHOG_DEFAULTS = "2026-08-30" as const;

const CLOUD_UI_HOSTS: Record<string, string> = {
  "us.i.posthog.com": "https://us.posthog.com",
  "eu.i.posthog.com": "https://eu.posthog.com",
};

export function posthogProjectKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return key ? key : undefined;
}

/** Ingestion API host. Falls back to US Cloud when the env var is unset. */
export function posthogIngestionHost(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/+$/, "");
  return host ? host : POSTHOG_DEFAULT_HOST;
}

export function posthogAssetsHost(ingestionHost: string): string {
  try {
    const url = new URL(ingestionHost);
    if (url.hostname.endsWith(".i.posthog.com")) {
      url.hostname = url.hostname.replace(".i.posthog.com", "-assets.i.posthog.com");
      return url.origin;
    }
  } catch {
    return ingestionHost;
  }

  return ingestionHost;
}

/** App host for toolbar links. Cloud regions map to us.posthog.com or eu.posthog.com. */
export function posthogUiHost(ingestionHost: string): string {
  try {
    const hostname = new URL(ingestionHost).hostname;
    return CLOUD_UI_HOSTS[hostname] ?? ingestionHost;
  } catch {
    return ingestionHost;
  }
}

export function posthogProxyRewrites(ingestionHost: string) {
  const assetsHost = posthogAssetsHost(ingestionHost);

  return [
    {
      source: `${POSTHOG_PROXY_PATH}/static/:path*`,
      destination: `${assetsHost}/static/:path*`,
    },
    {
      source: `${POSTHOG_PROXY_PATH}/array/:path*`,
      destination: `${assetsHost}/array/:path*`,
    },
    {
      source: `${POSTHOG_PROXY_PATH}/:path*`,
      destination: `${ingestionHost}/:path*`,
    },
  ];
}
