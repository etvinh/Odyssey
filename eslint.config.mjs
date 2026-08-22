import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import drizzle from "eslint-plugin-drizzle";

// Boundary rules from STRUCTURE.md. That document calls them "mechanically
// checkable"; this is the mechanism.
const NO_DEEP_GENERATED_IMPORT = {
  group: ["**/generated/*", "@odyssey/api-client/src/*"],
  message:
    "Import from the @odyssey/api-client entry point. Generated files are regenerated wholesale and their paths are not a contract.",
};

const NO_API_CLIENT = {
  group: ["@odyssey/api-client", "@odyssey/api-client/*"],
  message:
    "packages/ui is pure presentation and may not fetch. Data access belongs in apps/dashboard/src/features. See STRUCTURE.md.",
};

const NO_FRONTEND = {
  group: ["@odyssey/dashboard", "@odyssey/dashboard/*", "@odyssey/ui", "@odyssey/ui/*"],
  message: "The Worker must not import frontend packages. See STRUCTURE.md.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "**/.wrangler/**",
      "**/.turbo/**",
      "**/dist/**",
      "services/backend/drizzle/**",
      // Orval output. Regenerate it, never lint it.
      "packages/api-client/src/generated/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    rules: {
      // Drizzle's query builders are lazy thenables, not Promises, so the
      // rule's default (checkThenables: false) lets an unawaited mutation
      // through silently, which is exactly the mistake worth catching in an
      // order-action handler.
      "@typescript-eslint/no-floating-promises": ["error", { checkThenables: true }],
    },
  },

  {
    languageOptions: {
      parserOptions: {
        // The reason for the swap: type-aware rules need a program.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: restrict(NO_DEEP_GENERATED_IMPORT),
  },

  // Config files are plain JS and belong to no tsconfig.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Dashboard: the two rules that actually catch React Query bugs.
  {
    files: ["apps/dashboard/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
  },

  // Backend: a delete or update with no .where() is a table-wide write.
  // This is the class of bug oxlint had no equivalent for.
  {
    files: ["services/backend/**/*.ts"],
    plugins: { drizzle },
    rules: {
      ...restrict(NO_DEEP_GENERATED_IMPORT, NO_FRONTEND),
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
    },
  },

  // The design system may not reach for data.
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: restrict(NO_DEEP_GENERATED_IMPORT, NO_API_CLIENT),
  },

  // Test matchers are untyped by design: vitest's expect.any() returns `any`,
  // so asserting a row shape trips this on library typings rather than on
  // anything written here. Every other rule, no-floating-promises included,
  // still applies to tests.
  {
    files: ["**/tests/**/*.ts", "**/*.test.{ts,tsx}"],
    rules: { "@typescript-eslint/no-unsafe-assignment": "off" },
  },

  // The api-client entry is the one place allowed to touch generated paths.
  {
    files: ["packages/api-client/src/index.ts"],
    rules: { "no-restricted-imports": "off" },
  },
);
