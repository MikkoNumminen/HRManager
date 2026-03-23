import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData } from "./helpers";

// Tests for the dashboard analytics page: KPI cards and charts visibility

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to dashboard page", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });

  test("dashboard shows KPI cards for persons, teams, departments, users", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    // Each KPI card label should be visible
    await expect(page.getByText(/Persons/i).first()).toBeVisible();
    await expect(page.getByText(/Teams/i).first()).toBeVisible();
    await expect(page.getByText(/Departments/i).first()).toBeVisible();
    await expect(page.getByText(/Users/i).first()).toBeVisible();
  });

  test("dashboard shows chart sections", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText(/Members per Team/i)).toBeVisible();
    await expect(page.getByText(/Teams per Department/i)).toBeVisible();
    await expect(page.getByText(/Organization Growth/i)).toBeVisible();
    await expect(page.getByText(/Recent Activity/i)).toBeVisible();
  });

  test("dashboard shows numeric KPI values after seeding mock data", async ({ page }) => {
    await seedMockData(page);
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // After mock data, at least one numeric KPI value should be visible
    const numbers = page.locator("text=/^\\d+$/");
    await expect(numbers.first()).toBeVisible({ timeout: 5_000 });
  });

  test("dashboard is accessible from TopBar user menu", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /Dashboard/i }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });

  test("guest cannot access dashboard", async ({ page }) => {
    // Without login, dashboard should redirect
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
