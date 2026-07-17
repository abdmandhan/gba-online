import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile lives in the parent dir).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
