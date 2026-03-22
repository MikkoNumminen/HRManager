import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test.describe("Authentication", () => {
  test("guest sees Try Demo and Sign in buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Try Demo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
  });

  test("guest sees read-only data tables on home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Persons/i)).toBeVisible();
    await expect(page.getByText(/Teams/i)).toBeVisible();
    await expect(page.getByText(/Departments/i)).toBeVisible();
  });

  test("demo login works and shows user menu", async ({ page }) => {
    await loginAsDemo(page);
    await expect(page.getByRole("button", { name: /user menu/i })).toBeVisible();
    // Try Demo button should be gone
    await expect(page.getByRole("button", { name: /Try Demo/i })).not.toBeVisible();
  });

  test("user menu shows expected items after login", async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("button", { name: /user menu/i }).click();
    await expect(page.getByRole("menuitem", { name: /User Management/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Audit Log/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Load Mock Data/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Reset All Data/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Sign out/i })).toBeVisible();
  });

  test("sign out returns to guest state", async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /Sign out/i }).click();
    // Should be back to guest state
    await expect(page.getByRole("button", { name: /Try Demo/i })).toBeVisible({ timeout: 15_000 });
  });
});
