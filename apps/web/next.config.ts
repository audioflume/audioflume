import type { NextConfig } from "next";

const R2_CDN_ORIGIN = "https://pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev";

const nextConfig: NextConfig = {
  transpilePackages: ["@filmwave/shared"],
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
        source: "/api/desktop/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "http://localhost:1420",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Link",
            value: `<${R2_CDN_ORIGIN}>; rel=preconnect; crossorigin`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
