import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.extends("plugin:jest-dom/recommended"),
  ...compat.extends("plugin:testing-library/react"),
  prettierConfig,
  {
    ignores: ["node_modules/", ".next/", "__mocks__/"],
  },
];

export default eslintConfig;
