import { test, expect } from "@playwright/test";
import { loginAsDemo, snackbar } from "./helpers";

test.describe("UI Features", () => {
  test.describe("theme switching", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    test("can switch theme and persist across reload", async ({ page }) => {
      // Click the theme switcher (palette icon)
      await page.getByRole("button", { name: /theme/i }).click();
      // Select a non-default theme
      await page.getByRole("menuitem", { name: /ocean/i }).click();
      // Verify theme is stored in localStorage
      const theme = await page.evaluate(() => localStorage.getItem("hrm-theme"));
      expect(theme).toBe("ocean");
      // Reload and verify theme persists
      await page.reload({ waitUntil: "networkidle" });
      const themeAfterReload = await page.evaluate(() => localStorage.getItem("hrm-theme"));
      expect(themeAfterReload).toBe("ocean");
    });

    test("can cycle through multiple themes", async ({ page }) => {
      for (const themeName of ["light", "cyberpunk", "dark"]) {
        await page.getByRole("button", { name: /theme/i }).click();
        await page.getByRole("menuitem", { name: new RegExp(themeName, "i") }).click();
        const stored = await page.evaluate(() => localStorage.getItem("hrm-theme"));
        expect(stored).toBe(themeName);
      }
    });
  });

  test.describe("language switching", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    test("can switch language", async ({ page }) => {
      // Click the language switcher
      await page.getByRole("button", { name: /language/i }).click();
      // Select English (should be available)
      await page.getByRole("menuitem", { name: /English/i }).click();
      // Page reloads — wait for it to settle
      await page.waitForLoadState("networkidle");
      // After reload, page should be in English
      // Check that a known English string is visible
      await expect(page.getByRole("button", { name: /user menu/i })).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe("home page", () => {
    test("guest sees read-only data sections", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByText(/Persons/i)).toBeVisible();
      await expect(page.getByText(/Teams/i)).toBeVisible();
      await expect(page.getByText(/Departments/i)).toBeVisible();
    });

    test("authenticated user sees clickable section links", async ({ page }) => {
      await loginAsDemo(page);
      await page.goto("/", { waitUntil: "networkidle" });
      // Sections should link to manage pages
      const personsLink = page.locator('a[href="/managePersons"]');
      await expect(personsLink).toBeVisible();
      const teamsLink = page.locator('a[href="/manageTeams"]');
      await expect(teamsLink).toBeVisible();
      const deptsLink = page.locator('a[href="/manageDepartments"]');
      await expect(deptsLink).toBeVisible();
    });

    test("clicking section navigates to manage page", async ({ page }) => {
      await loginAsDemo(page);
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator('a[href="/managePersons"]').click();
      await expect(page).toHaveURL("/managePersons", { timeout: 10_000 });
    });
  });

  test.describe("snackbar notifications", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    test("snackbar appears on data operation and auto-dismisses", async ({ page }) => {
      // Create a person to trigger snackbar
      await page.goto("/managePersons", { waitUntil: "networkidle" });
      const suffix = Date.now();
      await page.getByLabel(/Enter Name/i).click();
      await page.getByLabel(/Enter Name/i).fill(`Snack ${suffix}`);
      await page.getByLabel(/Enter Email/i).click();
      await page.getByLabel(/Enter Email/i).fill(`snack-${suffix}@example.com`);
      const createBtn = page.getByRole("button", { name: /create/i });
      await expect(createBtn).toBeEnabled({ timeout: 5_000 });
      await createBtn.click();
      // Snackbar should appear
      await expect(snackbar(page)).toBeVisible({ timeout: 10_000 });
      await expect(snackbar(page)).toContainText(/created/i);
      // Snackbar should auto-dismiss after 4 seconds
      await expect(snackbar(page)).not.toBeVisible({ timeout: 10_000 });
    });
  });
});
