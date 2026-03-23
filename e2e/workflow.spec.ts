import { test, expect } from "@playwright/test";
import { loginAsDemo, resetAllData, snackbar } from "./helpers";

// End-to-end workflow tests: multi-step operations that span multiple pages

test.describe("End-to-End Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    // Start from a clean state for workflow tests
    await resetAllData(page);
  });

  test("full HR setup: create person → create team → add member → create department → assign team", async ({
    page,
  }) => {
    const suffix = Date.now();

    // Step 1: Create a person
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Name/i).fill(`Alice ${suffix}`);
    await page.getByLabel(/Enter Email/i).fill(`alice-${suffix}@example.com`);
    const createPersonBtn = page.getByRole("button", { name: /create/i });
    await expect(createPersonBtn).toBeEnabled({ timeout: 5_000 });
    await createPersonBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    await expect(page.getByText(`Alice ${suffix}`)).toBeVisible();

    // Step 2: Create a team
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Team Name/i).fill(`Alpha Team ${suffix}`);
    const createTeamBtn = page.getByRole("button", { name: /create/i });
    await expect(createTeamBtn).toBeEnabled({ timeout: 5_000 });
    await createTeamBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    await expect(page.getByText(`Alpha Team ${suffix}`)).toBeVisible();

    // Step 3: Navigate to team detail and add the person as a member
    await page.getByText(`Alpha Team ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageTeams\//, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Add Member/i })).toBeVisible({
      timeout: 10_000,
    });

    // Click the person card in the add member form
    const personCard = page
      .locator('[data-tutorial="add-member-form"]')
      .getByText(`Alice ${suffix}`);
    await expect(personCard).toBeVisible({ timeout: 10_000 });
    await personCard.click();

    const addMemberBtn = page.getByRole("button", { name: /Add Member/i });
    await expect(addMemberBtn).toBeEnabled({ timeout: 5_000 });
    await addMemberBtn.click();
    await expect(snackbar(page)).toContainText(/added|member/i, { timeout: 10_000 });

    // Step 4: Create a department
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Department Name/i).fill(`Engineering ${suffix}`);
    const createDeptBtn = page.getByRole("button", { name: /create/i });
    await expect(createDeptBtn).toBeEnabled({ timeout: 5_000 });
    await createDeptBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });
    await expect(page.getByText(`Engineering ${suffix}`)).toBeVisible();

    // Step 5: Navigate to department detail and assign the team
    await page.getByText(`Engineering ${suffix}`).click();
    await expect(page).toHaveURL(/\/manageDepartments\//, { timeout: 10_000 });

    const assignSection = page.getByRole("heading", { name: /Assign Team/i });
    await expect(assignSection).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/Select Team/i).click();
    const teamOption = page.locator('[role="option"]', { hasText: `Alpha Team ${suffix}` });
    await expect(teamOption).toBeVisible({ timeout: 5_000 });
    await teamOption.click();

    const assignBtn = page.getByRole("button", { name: /assign/i });
    await expect(assignBtn).toBeEnabled({ timeout: 5_000 });
    await assignBtn.click();
    await expect(snackbar(page)).toContainText(/assigned/i, { timeout: 10_000 });
  });

  test("data persists across navigation within a session", async ({ page }) => {
    const suffix = Date.now();

    // Create a person
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Name/i).fill(`Persist ${suffix}`);
    await page.getByLabel(/Enter Email/i).fill(`persist-${suffix}@example.com`);
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
    await createBtn.click();
    await expect(snackbar(page)).toContainText(/created|added/i, { timeout: 10_000 });

    // Navigate away and back
    await page.goto("/", { waitUntil: "networkidle" });
    await page.goto("/managePersons", { waitUntil: "networkidle" });

    // Person should still be there
    await expect(page.getByText(`Persist ${suffix}`)).toBeVisible();
  });
});
