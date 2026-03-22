import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData, snackbar } from "./helpers";

test.describe("Person Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to manage persons page", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Manage Persons/i })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a new person", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const suffix = Date.now();
    // Fill in both required fields — name and email
    await page.getByLabel(/Enter Name/i).click();
    await page.getByLabel(/Enter Name/i).fill(`Test Person ${suffix}`);
    await page.getByLabel(/Enter Email/i).click();
    await page.getByLabel(/Enter Email/i).fill(`test-${suffix}@example.com`);
    // Wait for the Create button to become enabled (validation passes)
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    // Wait for snackbar confirmation
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    // Verify the person appears in the table
    await expect(page.getByText(`Test Person ${suffix}`)).toBeVisible();
  });

  test("can navigate to person detail page", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    // Click on a person row (any existing person)
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    // Should navigate to person detail page
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });
  });

  test("can delete a person", async ({ page }) => {
    // First create a person to delete
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Name/i).click();
    await page.getByLabel(/Enter Name/i).fill(`DeleteMe ${suffix}`);
    await page.getByLabel(/Enter Email/i).click();
    await page.getByLabel(/Enter Email/i).fill(`del-${suffix}@example.com`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to the person's detail page
    await page.getByText(`DeleteMe ${suffix}`).click();
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });

    // Click the "Remove" button to open the confirm dialog
    await page.getByRole("button", { name: /^remove$/i }).click();

    // Confirm the deletion in the dialog
    await page
      .getByRole("button", { name: /^remove$/i })
      .last()
      .click();

    // Should show snackbar and redirect back
    await expect(snackbar(page)).toContainText(/removed|deleted/i, { timeout: 10_000 });
  });

  test("seed mock data and verify persons are loaded", async ({ page }) => {
    await seedMockData(page);
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    // Mock data should include multiple persons
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
