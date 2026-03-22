import { Page, expect } from "@playwright/test";

/**
 * Sign in via the demo credentials provider.
 * After calling this the page is on "/" and the user menu is available.
 */
export async function loginAsDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Try Demo/i }).click();
  // Wait for redirect back to home after demo login
  await expect(page.getByRole("button", { name: /user menu/i })).toBeVisible({ timeout: 15_000 });
}

/**
 * Seed mock data via the TopBar menu (requires demo/superuser login).
 * Replaces all existing data.
 */
export async function seedMockData(page: Page) {
  await page.getByRole("button", { name: /user menu/i }).click();
  await page.getByRole("menuitem", { name: /Load Mock Data/i }).click();
  // Dialog opens — click "Replace All"
  await page.getByRole("button", { name: /Replace All/i }).click();
  // Wait for snackbar confirmation
  await expect(page.getByRole("alert")).toContainText(/mock data/i, { timeout: 15_000 });
  // Wait for page to settle after data reload
  await page.waitForLoadState("networkidle");
}

/**
 * Reset all data via the TopBar menu (requires demo/superuser login).
 */
export async function resetAllData(page: Page) {
  await page.getByRole("button", { name: /user menu/i }).click();
  await page.getByRole("menuitem", { name: /Reset All Data/i }).click();
  // Confirm dialog
  await page.getByRole("button", { name: /Reset/i }).click();
  await expect(page.getByRole("alert")).toContainText(/reset/i, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/** Navigate to a page and wait for it to load */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
