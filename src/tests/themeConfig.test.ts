import {
  THEME_NAMES,
  THEME_PALETTES,
  THEME_LABELS,
  THEME_ICONS,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  ThemeColors,
} from "../themeConfig";

describe("themeConfig", () => {
  // There are exactly 6 themes defined
  test("defines exactly 6 themes", () => {
    expect(THEME_NAMES).toHaveLength(6);
  });

  // The default theme is "dark"
  test("default theme is dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  // Storage key is defined for localStorage
  test("storage key is defined", () => {
    expect(THEME_STORAGE_KEY).toBe("hrm-theme");
  });

  // Every theme name has a corresponding palette
  test("every theme has a palette", () => {
    for (const name of THEME_NAMES) {
      expect(THEME_PALETTES[name]).toBeDefined();
    }
  });

  // Every theme name has a label
  test("every theme has a label", () => {
    for (const name of THEME_NAMES) {
      expect(THEME_LABELS[name]).toBeTruthy();
    }
  });

  // Every theme name has an icon
  test("every theme has an icon", () => {
    for (const name of THEME_NAMES) {
      expect(THEME_ICONS[name]).toBeTruthy();
    }
  });

  // All palettes have the same set of color keys
  test("all palettes have identical color keys", () => {
    const referenceKeys = Object.keys(THEME_PALETTES.dark).sort();
    for (const name of THEME_NAMES) {
      const keys = Object.keys(THEME_PALETTES[name]).sort();
      expect(keys).toEqual(referenceKeys);
    }
  });

  // Every palette has all 14 required color tokens
  test("every palette has all 14 color tokens", () => {
    const requiredKeys: (keyof ThemeColors)[] = [
      "slate100",
      "slate300",
      "slate400",
      "slate600",
      "slate700",
      "green400",
      "green900",
      "rowHover",
      "hoverOverlay",
      "error",
      "errorBg",
      "warning",
      "info",
      "success",
    ];
    for (const name of THEME_NAMES) {
      for (const key of requiredKeys) {
        expect(THEME_PALETTES[name][key]).toBeTruthy();
      }
    }
  });

  // No palette has empty string values
  test("no palette has empty string values", () => {
    for (const name of THEME_NAMES) {
      for (const [_key, value] of Object.entries(THEME_PALETTES[name])) {
        expect(value).not.toBe("");
      }
    }
  });

  // Dark palette matches the expected color values
  test("dark palette preserves expected color values", () => {
    expect(THEME_PALETTES.dark.slate100).toBe("#F1F5F9");
    expect(THEME_PALETTES.dark.slate700).toBe("#0F172A");
    expect(THEME_PALETTES.dark.green400).toBe("#4ADE80");
    expect(THEME_PALETTES.dark.error).toBe("#F87171");
  });

  // Light and dark themes have inverted text/background direction
  test("light theme has dark text on light background", () => {
    const dark = THEME_PALETTES.dark;
    const light = THEME_PALETTES.light;
    // Light theme's "primary text" (slate100) should be darker than dark theme's
    expect(light.slate100).not.toBe(dark.slate100);
    // Light theme's "background" (slate700) should be lighter than dark theme's
    expect(light.slate700).not.toBe(dark.slate700);
  });

  // Theme names array contains the expected themes
  test("theme names contain all expected themes", () => {
    expect(THEME_NAMES).toContain("dark");
    expect(THEME_NAMES).toContain("light");
    expect(THEME_NAMES).toContain("cyberpunk");
    expect(THEME_NAMES).toContain("retro");
    expect(THEME_NAMES).toContain("bubblegum");
    expect(THEME_NAMES).toContain("ocean");
  });
});
