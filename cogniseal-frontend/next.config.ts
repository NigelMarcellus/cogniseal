import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  // Note: headers() is not supported with static export
  // Headers should be configured at the hosting level (e.g., Vercel, Netlify)
};

export default nextConfig;

