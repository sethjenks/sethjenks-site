import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
  },
};

export default nextConfig;
