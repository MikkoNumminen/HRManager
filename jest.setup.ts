import "@testing-library/jest-dom";
import en from "./messages/en.json";

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
