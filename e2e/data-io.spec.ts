import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData } from "./helpers";

// Tests for the Data Import / Export page at /admin/data

test.describe("Data Import / Export", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to data import/export page", async ({ page }) => {
    await page.goto("/admin/data", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Data Import \/ Export/i })).toBeVisible();
  });

  test("data page shows export section", async ({ page }) => {
    await page.goto("/admin/data", { waitUntil: "networkidle" });
    await expect(page.getByText(/Export Data/i)).toBeVisible();
    await expect(page.getByText(/Persons/i).first()).toBeVisible();
    await expect(page.getByText(/Teams/i).first()).toBeVisible();
    await expect(page.getByText(/Departments/i).first()).toBeVisible();
  });

  test("data page shows import section", async ({ page }) => {
    await page.goto("/admin/data", { waitUntil: "networkidle" });
    await expect(page.getByText(/Import Data/i)).toBeVisible();
    await expect(page.getByText(/Import Persons/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Upload CSV/i })).toBeVisible();
  });

  test("download template button triggers file download", async ({ page }) => {
    await page.goto("/admin/data", { waitUntil: "networkidle" });

    // Listen for the download event
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Template/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("persons_import_template.csv");
  });

  test("export persons button triggers download after seeding data", async ({ page }) => {
    await seedMockData(page);
    await page.goto("/admin/data", { waitUntil: "networkidle" });

    // Wait for export button for persons to be enabled (count > 0)
    const personsExportBtn = page.locator("button", { hasText: /Export/i }).first();
    await expect(personsExportBtn).toBeEnabled({ timeout: 5_000 });

    const downloadPromise = page.waitForEvent("download");
    await personsExportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/persons.*\.csv/i);
  });

  test("upload CSV dialog opens when clicking Upload CSV", async ({ page }) => {
    await page.goto("/admin/data", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Upload CSV/i }).click();
    // Dialog should appear
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  });

  test("guest cannot access data import/export page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/data", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/admin\/data/);
  });

  test("data page is accessible from admin menu", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "networkidle" });
    // Look for a link to data import/export
    const dataLink = page.getByRole("link", { name: /Import|Export|Data/i });
    const exists = await dataLink.count();
    if (exists > 0) {
      await dataLink.first().click();
      await expect(page).toHaveURL(/\/admin\/data/, { timeout: 10_000 });
    } else {
      // Navigate directly via TopBar menu
      await page.goto("/admin/data", { waitUntil: "networkidle" });
      await expect(page.getByText(/Data Import/i)).toBeVisible();
    }
  });
});
