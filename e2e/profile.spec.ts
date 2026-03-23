import { test, expect } from "@playwright/test";
import { loginAsDemo, snackbar } from "./helpers";

// Tests for the user profile page: view profile info, update name, update image URL

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to profile page", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Profile/i })).toBeVisible();
  });

  test("profile page shows user email", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    // Demo user email should be visible
    await expect(page.getByText("demo@hrmanager.app")).toBeVisible();
  });

  test("profile page shows role chip", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    // Superuser role chip should be visible for demo user
    await expect(page.getByText(/superuser/i)).toBeVisible();
  });

  test("can update display name", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });

    const newName = `Demo User ${Date.now()}`;
    const nameField = page.getByLabel(/Enter New Name/i);
    await nameField.clear();
    await nameField.fill(newName);

    // Save button should become enabled once name changes
    const saveBtn = page.getByRole("button", { name: /save/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();

    await expect(snackbar(page)).toContainText(/updated/i, { timeout: 10_000 });
  });

  test("profile page shows permissions section", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page.getByText(/Your Permissions/i)).toBeVisible();
    // Demo superuser should have permissions listed
    await expect(page.getByText(/person:/i).first()).toBeVisible();
  });

  test("profile is accessible from TopBar user menu", async ({ page }) => {
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /Profile/i }).click();
    await expect(page).toHaveURL("/profile", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Profile/i })).toBeVisible();
  });

  test("guest cannot access profile page", async ({ page }) => {
    // Without login, profile should redirect
    await page.context().clearCookies();
    await page.goto("/profile", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/profile/);
  });
});
