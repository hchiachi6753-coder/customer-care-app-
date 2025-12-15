import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Empty turbopack config to silence the warning
  turbopack: {},
  // Exclude functions directory from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
