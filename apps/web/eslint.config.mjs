import { defineConfig, globalIgnores } from "eslint/config";
import { plugin as shadcn } from "@shadcn/lint";
import reactHooks from "eslint-plugin-react-hooks";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { baseTypeScript, llmCorePreset, TSESLINT_BASE_BLOCK } from "../../eslint.base.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next/typescript already provides the tseslint parser/plugin
  // setup; our duplicate blocks are filtered (same plugin key twice is a
  // flat-config error). All rule blocks are kept.
  ...baseTypeScript(import.meta.dirname).filter(
    (block) => block.name !== TSESLINT_BASE_BLOCK,
  ),
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
    // Temporary: generated shadcn scaffold is cleaned up separately after
    // app sources are green (hooks/lib below are unused scaffold drops).
    "src/components/ui/**",
    "src/hooks/use-mobile.ts",
    "src/hooks/use-highlighted-code.ts",
    "src/lib/highlighter.tsx",
  ]),
]);
