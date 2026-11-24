import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.2.2"],
  async redirects() {
    return [
      { source: "/work/offer-builder", destination: "/work/chia-wallet", permanent: true },
      { source: "/log", destination: "/journal", permanent: false },
      { source: "/log/:path*", destination: "/journal/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/soft-matter/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/": ["./content/entries/**/*", "./content/work.json"],
    "/work/[id]": ["./content/work.json"],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60 * 60 * 24,
    qualities: [75, 90],
  },
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER
        ? ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"]
        : ["tsx", "ts", "jsx", "js"],
  };
}
