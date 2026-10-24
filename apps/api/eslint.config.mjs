import { defineConfig, globalIgnores } from "eslint/config";
import { baseTypeScript, llmCorePreset } from "../../eslint.base.mjs";

export default defineConfig([
  globalIgnores(["node_modules/**"]),
  ...baseTypeScript(import.meta.dirname),
  ...llmCorePreset,
  // Push toward structured logging; the api owns a pino logger.
  { rules: { "no-console": "warn" } },
]);
