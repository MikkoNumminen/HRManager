import { test, expect } from "@playwright/test";
import { loginAsDemo, snackbar } from "./helpers";

// Tests for the person detail page: editing name, position, and email fields

test.describe("Person Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can update a person's name", async ({ page }) => {
    // Create a person to edit
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Name/i).fill(`EditName ${suffix}`);
    await page.getByLabel(/Enter Email/i).fill(`editname-${suffix}@example.com`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to detail page
    await page.getByText(`EditName ${suffix}`).click();
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });

    // Update name
    const newName = `Renamed ${suffix}`;
    await page.getByLabel(/Enter New Name/i).clear();
    await page.getByLabel(/Enter New Name/i).fill(newName);
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect(snackbar(page)).toContainText(/updated|changed/i, { timeout: 10_000 });
  });

  test("can update a person's position", async ({ page }) => {
    // Create a person to edit
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Name/i).fill(`PosTest ${suffix}`);
    await page.getByLabel(/Enter Email/i).fill(`postest-${suffix}@example.com`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to detail page
    await page.getByText(`PosTest ${suffix}`).click();
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });

    // Update position
    await page.getByLabel(/Enter New Position/i).fill("Software Engineer");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(snackbar(page)).toContainText(/updated|changed/i, { timeout: 10_000 });
  });

  test("can update a person's email", async ({ page }) => {
    // Create a person to edit
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Name/i).fill(`EmailTest ${suffix}`);
    await page.getByLabel(/Enter Email/i).fill(`emailtest-${suffix}@example.com`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to detail page
    await page.getByText(`EmailTest ${suffix}`).click();
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });

    // Update email
    const newEmail = `newemail-${suffix}@example.com`;
    await page.getByLabel(/Enter New Email/i).clear();
    await page.getByLabel(/Enter New Email/i).fill(newEmail);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(snackbar(page)).toContainText(/updated|changed/i, { timeout: 10_000 });
  });

  test("back button navigates to manage persons list", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/managePersons\//, { timeout: 10_000 });

    // Click back button in TopBar
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/managePersons$/, { timeout: 10_000 });
  });
});
