import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData, snackbar } from "./helpers";

test.describe("Team Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("can navigate to manage teams page", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Manage Teams/i })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a new team", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Team Name/i).click();
    await page.getByLabel(/Enter Team Name/i).fill(`Team ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    await expect(page.getByText(`Team ${suffix}`)).toBeVisible();
  });

  test("can navigate to team detail page", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });
  });

  test("can delete a team", async ({ page }) => {
    // First create a team to delete
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Team Name/i).click();
    await page.getByLabel(/Enter Team Name/i).fill(`DelTeam ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to the team's detail page
    await page.getByText(`DelTeam ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });

    // Click the "Remove" button to open the confirm dialog
    await page.getByRole("button", { name: /^remove$/i }).click();

    // Confirm the deletion in the dialog
    await page.getByRole("button", { name: /^remove$/i }).last().click();

    // Server action redirects back to /manageTeams
    await expect(page).toHaveURL(/\/manageTeams$/, { timeout: 10_000 });
    // Verify the deleted team is no longer in the list
    await expect(page.getByText(`DelTeam ${suffix}`)).not.toBeVisible();
  });

  test("seed mock data and verify teams are loaded", async ({ page }) => {
    await seedMockData(page);
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
