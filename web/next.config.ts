import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets a production test build live next to the dev server without breaking it.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
