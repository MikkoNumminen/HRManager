import { Locator, Page, expect } from "@playwright/test";

/**
 * Returns a locator for the MUI Snackbar alert, excluding the Next.js route announcer
 * which also has role="alert".
 */
export function snackbar(page: Page): Locator {
  return page.locator(".MuiAlert-root");
}

/**
 * Sign in via the demo credentials provider.
 * After calling this the page is on "/" and the user menu is available.
 */
export async function loginAsDemo(page: Page) {
  // Use Playwright's APIRequestContext which shares cookies with the browser context.
  const req = page.context().request;
  const baseURL = "http://localhost:3000";

  // Step 1: GET CSRF token (also sets the csrf cookie in the shared jar)
  const csrfRes = await req.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // Step 2: POST to the demo credentials callback (sets session cookie in the shared jar)
  await req.post(`${baseURL}/api/auth/callback/demo`, {
    form: { csrfToken },
  });

  // Step 3: Navigate to home — browser sends the session cookie from the shared jar
  await page.goto("/", { waitUntil: "networkidle" });

  // Mark all tutorial steps as complete to prevent overlays from blocking E2E interactions
  await page.evaluate(() => {
    const allSteps = [
      "view_employees",
      "add_person",
      "create_team",
      "add_member",
      "create_department",
      "assign_team_to_department",
      "manage_permissions",
      "view_audit_log",
    ];
    localStorage.setItem("hrm_tutorial_progress", JSON.stringify(allSteps));
  });

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
  await expect(snackbar(page)).toContainText(/mock data/i, { timeout: 15_000 });
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
  await expect(snackbar(page)).toContainText(/reset/i, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/** Navigate to a page and wait for it to load */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
