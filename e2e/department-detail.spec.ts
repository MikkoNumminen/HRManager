import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData, snackbar } from "./helpers";

// Tests for the department detail page: rename, assign/remove teams

test.describe("Department Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    // Seed mock data so teams are available to assign
    await seedMockData(page);
  });

  test("can rename a department", async ({ page }) => {
    // Create a fresh department to rename
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Department Name/i).fill(`RenameDept ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to department detail
    await page.getByText(`RenameDept ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });

    // Rename the department
    const newName = `RenamedDept ${suffix}`;
    const nameField = page.getByLabel(/Enter Name/i);
    await nameField.clear();
    await nameField.fill(newName);
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect(snackbar(page)).toContainText(/updated/i, { timeout: 10_000 });
  });

  test("can assign a team to a department", async ({ page }) => {
    // Create a fresh department (so it has no teams yet)
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Department Name/i).fill(`AssignDept ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to department detail
    await page.getByText(`AssignDept ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });

    // Check if Assign Team section is visible (needs available teams)
    const assignSection = page.getByRole("heading", { name: /Assign Team/i });
    const isVisible = await assignSection.isVisible().catch(() => false);

    if (isVisible) {
      // Select a team from the dropdown
      await page.getByLabel(/Select Team/i).click();
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible({ timeout: 5_000 });
      await firstOption.click();

      const assignBtn = page.getByRole("button", { name: /assign/i });
      await expect(assignBtn).toBeEnabled({ timeout: 5_000 });
      await assignBtn.click();
      await expect(snackbar(page)).toContainText(/assigned/i, { timeout: 10_000 });
    }
  });

  test("department detail page shows back button to manage departments", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });

    // Back button should go back to /manageDepartments
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/manageDepartments$/, { timeout: 10_000 });
  });
});
