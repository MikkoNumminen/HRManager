import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData, snackbar } from "./helpers";

test.describe("Department Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to manage departments page", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Manage Departments/i })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a new department", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Department Name/i).click();
    await page.getByLabel(/Enter Department Name/i).fill(`Dept ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    await expect(page.getByText(`Dept ${suffix}`)).toBeVisible();
  });

  test("can navigate to department detail page", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });
  });

  test("can delete a department", async ({ page }) => {
    // First create a department to delete
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Department Name/i).click();
    await page.getByLabel(/Enter Department Name/i).fill(`DelDept ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to the department's detail page
    await page.getByText(`DelDept ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });

    // Click the "Remove" button to open the confirm dialog
    await page.getByRole("button", { name: /^remove$/i }).click();

    // Confirm the deletion in the dialog
    await page.getByRole("button", { name: /^remove$/i }).last().click();

    // Server action redirects back to /manageDepartments
    await expect(page).toHaveURL(/\/manageDepartments$/, { timeout: 10_000 });
    // Verify the deleted department is no longer in the list
    await expect(page.getByText(`DelDept ${suffix}`)).not.toBeVisible();
  });

  test("seed mock data and verify departments are loaded", async ({ page }) => {
    await seedMockData(page);
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
