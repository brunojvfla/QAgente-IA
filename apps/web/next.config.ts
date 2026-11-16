import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.QAGENT_NEXT_DIST_DIR || ".next",
  transpilePackages: ["@qagent/shared"],
};

export default nextConfig;
