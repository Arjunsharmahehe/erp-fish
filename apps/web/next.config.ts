import type { NextConfig } from "next";
import path from "node:path";

const MONOREPO_ROOT = "../..";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, MONOREPO_ROOT),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// The framework fixes this filename, so the export keeps its descriptive name.
// eslint-disable-next-line llm-core/filename-match-export
export default nextConfig;
