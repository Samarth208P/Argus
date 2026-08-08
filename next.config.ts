import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Netlify deployment
  output: "standalone",

  // Allow cross-origin images from Simple Icons CDN (trust logo strip)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  // Supabase and viem use Node APIs — keep on server only
  serverExternalPackages: ["viem"],
};

export default nextConfig;
