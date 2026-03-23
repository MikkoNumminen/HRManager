import { test, expect } from "@playwright/test";
import { loginAsDemo, seedMockData, snackbar } from "./helpers";

// Tests for the team detail page: rename team, add/remove members

test.describe("Team Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    // Seed mock data so persons and teams exist for member operations
    await seedMockData(page);
  });

  test("can rename a team", async ({ page }) => {
    // Create a fresh team to rename
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const suffix = Date.now();
    await page.getByLabel(/Enter Team Name/i).fill(`RenameMe ${suffix}`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate to team detail
    await page.getByText(`RenameMe ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });

    // Rename the team
    const newName = `Renamed ${suffix}`;
    await page.getByLabel(/Enter New Team Name/i).clear();
    await page.getByLabel(/Enter New Team Name/i).fill(newName);
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect(snackbar(page)).toContainText(/updated|renamed/i, { timeout: 10_000 });
  });

  test("can add a member to a team", async ({ page }) => {
    // Navigate to first team's detail page
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });

    // Look for the Add Member section and click on a person card
    await expect(page.getByRole("heading", { name: /Add Member/i })).toBeVisible({
      timeout: 10_000,
    });
    const personCards = page.locator(
      '[data-tutorial="add-member-form"] button, [data-tutorial="add-member-form"] [role="button"]',
    );
    const cardCount = await personCards.count();
    if (cardCount > 0) {
      await personCards.first().click();
      const addMemberBtn = page.getByRole("button", { name: /Add Member/i });
      await expect(addMemberBtn).toBeEnabled({ timeout: 5_000 });
      await addMemberBtn.click();
      await expect(snackbar(page)).toContainText(/added|member/i, { timeout: 10_000 });
    }
  });

  test("team detail page shows back button to manage teams", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });

    // Back button should go back to /manageTeams
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/manageTeams$/, { timeout: 10_000 });
  });
});
