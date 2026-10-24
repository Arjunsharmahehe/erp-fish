import { defineConfig, globalIgnores } from "eslint/config";
import { plugin as shadcn } from "@shadcn/lint";
import reactHooks from "eslint-plugin-react-hooks";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { baseTypeScript, llmCorePreset } from "../../eslint.base.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...baseTypeScript(import.meta.dirname),
  ...llmCorePreset,
  reactHooks.configs.flat["recommended-latest"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
    // Recognition pointed at the shadcn ui directory (matches
    // components.json aliases.ui); theme discovery is automatic from
    // components.json (tailwind.css -> src/app/globals.css).
    settings: { shadcn: { ui: "@/components/ui" } },
    rules: {
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    },
  },
  {
    // Shared components define their own appearance; token rules stay on.
    files: ["src/components/ui/**/*.{js,jsx,ts,tsx}"],
    rules: { "shadcn/no-restyle": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
