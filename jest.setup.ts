import "@testing-library/jest-dom";
import "jest-axe/extend-expect";
import en from "./messages/en.json";

// TextEncoder/TextDecoder polyfill is in jest.polyfills.ts (setupFiles),
// so it runs before module initialization.

// Polyfill Web fetch APIs (Request, Response, Headers, fetch) for Next.js internals.
// Node 18+ has these built-in but jsdom environment may not expose them globally.
if (typeof global.Request === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFetch = require("node-fetch");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Request = nodeFetch.Request;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Response = nodeFetch.Response;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Headers = nodeFetch.Headers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = nodeFetch.default;
}

// Mock SnackbarProvider globally so all components using useSnackbar work in tests.
const mockShowSnackbar = jest.fn();
jest.mock("./src/components/shared/SnackbarProvider", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

// Expose mockShowSnackbar globally for test assertions
(globalThis as Record<string, unknown>).mockShowSnackbar = mockShowSnackbar;

// Mock next-intl globally so all components using useTranslations work in tests.
// Returns English translations from messages/en.json with ICU parameter interpolation.
jest.mock("next-intl", () => {
  return {
    useTranslations: (namespace: string) => {
      const messages = (en as Record<string, Record<string, string>>)[namespace] || {};
      return (key: string, params?: Record<string, string>) => {
        let msg = messages[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            msg = msg.replace(`{${k}}`, v);
          });
        }
        return msg;
      };
    },
    useLocale: () => "en",
  };
});
