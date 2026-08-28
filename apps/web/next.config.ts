import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    resolveAlias: {
      "cloudflare:workers": "./src/lib/cloudflare-workers-build-stub.ts",
    },
  },
};

export default nextConfig;
