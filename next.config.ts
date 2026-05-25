import type { NextConfig } from "next";

const R2_CDN_ORIGIN = "https://pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "v5.airtableusercontent.com",
      },
      {
        protocol: "https",
        hostname: "music-library.filmwave.io",
      },
      {
        protocol: "https",
        hostname: "images.filmwave.io",
      },
      {
        protocol: "https",
        hostname: "pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev",
      },
    ],
  },
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  async headers() {
    return [
      {
        // Apply to all app pages
        source: "/(.*)",
        headers: [
          {
            // Instruct the browser (and Cloudflare) to preconnect to R2.
            // This is the HTTP header equivalent of <link rel="preconnect">.
            // Together they ensure both the HTML parser and the network stack
            // warm the connection as early as possible.
            key: "Link",
            value: `<${R2_CDN_ORIGIN}>; rel=preconnect; crossorigin`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
