import { defineConfig, globalIgnores } from "eslint/config";
import { baseTypeScript, llmCorePreset } from "./eslint.base.mjs";

export default defineConfig([
  globalIgnores(["**/node_modules/**", "apps/**", "packages/**"]),
  ...baseTypeScript(import.meta.dirname),
  ...llmCorePreset,
]);
