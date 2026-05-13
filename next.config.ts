import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v5.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'music-library.filmwave.io',
      },
      {
        protocol: 'https',
        hostname: 'pub-56e6a9dcaf364dd4bcde4a5fe65a5b9a.r2.dev',
      },
    ],
  },
  experimental: {
    proxyClientMaxBodySize: '250mb',
  },
}

export default nextConfig