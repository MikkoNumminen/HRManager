import type { StorybookConfig } from "@storybook/nextjs";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  webpackFinal: async (webpackConfig) => {
    // Alias next-intl to a stub so stories render without an IntlProvider.
    // The stub returns translation keys as-is for human-readable labels.
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      // Stub next-intl — returns translation keys as-is (no IntlProvider needed)
      "next-intl": path.resolve(__dirname, "../src/__mocks__/next-intl.tsx"),
      // Stub server actions — async no-ops so components render without a DB
      "@/serverActions": path.resolve(__dirname, "../src/__mocks__/serverActions.ts"),
    };

    // Also ensure @/ path alias works (mirrors tsconfig.json paths)
    webpackConfig.resolve.alias["@"] = path.resolve(__dirname, "../src");

    return webpackConfig;
  },
};

export default config;
