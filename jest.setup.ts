import "@testing-library/jest-dom";
import en from "./messages/en.json";

// Mock SnackbarProvider globally so all components using useSnackbar work in tests.
const mockShowSnackbar = jest.fn();
jest.mock("./src/components/SnackbarProvider", () => ({
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
