import type { NextConfig } from "next";

// On the iCloud-synced Desktop, .next/ atomic renames race iCloud's sync
// daemon and corrupt the build. Move artifacts to /tmp locally only —
// Render (and any other CI/host) keeps the default .next/ so build caching
// and SSR runtime work normally.
const isLocalDesktop =
  !process.env.RENDER &&
  !process.env.VERCEL &&
  !process.env.CI &&
  (process.cwd().includes("/Desktop/") ||
    process.env.HOME?.endsWith("/Desktop"));

const nextConfig: NextConfig = {
  ...(isLocalDesktop ? { distDir: "/tmp/alto-next" } : {}),
};

export default nextConfig;
