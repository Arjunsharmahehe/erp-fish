// Shared base for every workspace's eslint.config.mjs.
// Each app imports this and passes its own directory as tsconfigRootDir so
// type-aware rules resolve that app's tsconfig (projectService discovers the
// nearest tsconfig per file automatically).
import llmCore from "eslint-plugin-llm-core";
import tseslint from "typescript-eslint";

// Block name typescript-eslint uses for its parser/plugin setup. Web's config
// receives an equivalent block from eslint-config-next/typescript (a separate
// plugin instance), and flat config forbids defining the same plugin key
// twice — so web filters these blocks out (see apps/web/eslint.config.mjs).
// Filtering removes no rules: the plugin/parser setup is identical.
export const TSESLINT_BASE_BLOCK = "typescript-eslint/base";
const TS_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const JS_FILES = ["**/*.js", "**/*.mjs", "**/*.cjs"];

// Type-aware sets ship without `files` scoping, which makes their rules run
// (and crash) on the plain-JS config files ESLint also lints. Scope them to
// TS inputs; TS files see the identical rule set as before.
function scopedTo(configs, files) {
  const list = Array.isArray(configs) ? configs : [configs];
  return list.map((config) => ({ ...config, files: config.files ?? files }));
}

// Minimum prose required when `ts-expect-error` is used as an escape hatch.
const MIN_TSEXPECT_DESCRIPTION_LENGTH = 10;

export function baseTypeScript(tsconfigRootDir) {
  return [
    ...scopedTo(tseslint.configs.strictTypeChecked, TS_FILES),
    ...scopedTo(tseslint.configs.stylisticTypeChecked, TS_FILES),
    ...scopedTo(tseslint.configs.disableTypeChecked, JS_FILES),
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        "@typescript-eslint/consistent-type-assertions": [
          "error",
          { assertionStyle: "never" },
        ],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-member-access": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "@typescript-eslint/no-unsafe-argument": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
            minimumDescriptionLength: MIN_TSEXPECT_DESCRIPTION_LENGTH,
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "TSAsExpression > TSAsExpression.expression[typeAnnotation.type='TSUnknownKeyword']",
            message:
              "Do not use `as unknown as`. Parse untrusted data with a zod schema at the boundary, or fix the underlying type.",
          },
        ],
      },
    },
  ];
}

export const llmCorePreset = [
  ...llmCore.configs.recommended,
  {
    rules: {
      // The project allows reasoned targeted eslint-disable-next-line comments
      // as the escape hatch, and this rule bans every inline disable outright.
      "llm-core/no-inline-disable": "off",
      // Subsumed by @typescript-eslint/consistent-type-assertions: never,
      // which bans every assertion instead of only the chained ones.
      "llm-core/no-chained-type-assertions": "off",
      "llm-core/no-type-assertion-any": "off",
      "llm-core/no-type-system-bypass": "off",
      "llm-core/no-known-value-widening": "off",
      "llm-core/no-widen-then-assert": "off",
      // Duplicate of the type-aware @typescript-eslint/no-floating-promises.
      "llm-core/no-floating-promise": "off",
      // Duplicate of @typescript-eslint/explicit-function-return-type
      // (enabled via strictTypeChecked).
      "llm-core/explicit-export-types": "off",
      // Redundant: catch params are unknown at the compiler level via
      // useUnknownInCatchVariables (on under strict in every tsconfig).
      "llm-core/prefer-unknown-in-catch": "off",
    },
  },
];
