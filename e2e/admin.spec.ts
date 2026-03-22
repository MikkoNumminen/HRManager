import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData } from "./helpers";

test.describe("Admin & RBAC", () => {
  test.describe("authenticated", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemo(page);
    });

    test("can access user management page", async ({ page }) => {
      await page.goto("/admin", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();
      await expect(page.locator("table")).toBeVisible();
      // Demo user should appear in the table
      await expect(page.getByText("demo@hrmanager.app")).toBeVisible();
    });

    test("can access audit log page", async ({ page }) => {
      await page.goto("/admin/audit", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: /Audit Log/i })).toBeVisible();
      await expect(page.locator("table")).toBeVisible();
    });

    test("audit log shows entries after data operations", async ({ page }) => {
      await seedMockData(page);
      await page.goto("/admin/audit", { waitUntil: "networkidle" });
      const rows = page.locator("table tbody tr");
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("admin menu items are accessible from TopBar", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /User Management/i }).click();
      await expect(page).toHaveURL("/admin", { timeout: 10_000 });
      await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();
    });

    test("audit log menu item navigates correctly", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /Audit Log/i }).click();
      await expect(page).toHaveURL("/admin/audit", { timeout: 10_000 });
      await expect(page.getByRole("heading", { name: /Audit Log/i })).toBeVisible();
    });
  });

  test.describe("guest access control", () => {
    test("guest cannot access admin pages", async ({ page }) => {
      await page.goto("/admin", { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/admin/);
    });

    test("guest cannot access manage pages", async ({ page }) => {
      await page.goto("/managePersons", { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/managePersons/);
      await page.goto("/manageTeams", { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/manageTeams/);
      await page.goto("/manageDepartments", { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/manageDepartments/);
    });
  });
});
