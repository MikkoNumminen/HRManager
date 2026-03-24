import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import jestDom from "eslint-plugin-jest-dom";
import testingLibrary from "eslint-plugin-testing-library";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  ...tseslint.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  jestDom.configs["flat/recommended"],
  testingLibrary.configs["flat/react"],
  prettierConfig,
  {
    ignores: ["node_modules/", ".next/", "__mocks__/", "coverage/", ".claude/"],
  },
  {
    // Allow underscore-prefixed unused vars (convention for intentionally
    // unused parameters like event handler first args)
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // E2E tests: Playwright uses the same query names as Testing Library
    // (getByRole, getByText, etc.) but they are NOT Testing Library queries.
    // Disable testing-library and jest-dom rules for the e2e directory.
    files: ["e2e/**"],
    rules: {
      "testing-library/prefer-screen-queries": "off",
      "testing-library/no-node-access": "off",
      "testing-library/no-wait-for-multiple-assertions": "off",
      "testing-library/no-debugging-utils": "off",
      "testing-library/await-async-utils": "off",
      "jest-dom/prefer-enabled-disabled": "off",
    },
  },
  {
    // Test files: allow require() for Jest mocking and downgrade
    // test-style rules that were not enforced before the migration
    // from FlatCompat to native flat config
    files: ["src/tests/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "testing-library/no-node-access": "warn",
      "jest-dom/prefer-enabled-disabled": "warn",
      "jest-dom/prefer-to-have-text-content": "warn",
      "jest-dom/prefer-to-have-value": "warn",
    },
  },
];

export default eslintConfig;
