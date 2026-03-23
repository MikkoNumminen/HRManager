import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers";

// Tests for form validation: create buttons disabled until valid input, error messages

test.describe("Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("create person button is disabled when name is empty", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    const createBtn = page.getByRole("button", { name: /create/i });
    // Button disabled on load (no name)
    await expect(createBtn).toBeDisabled();
  });

  test("create person button is disabled when only name is filled (email required)", async ({
    page,
  }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Name/i).fill("Some Person");
    const createBtn = page.getByRole("button", { name: /create/i });
    // Still disabled — email is required
    await expect(createBtn).toBeDisabled();
  });

  test("create person button enables with valid name and email", async ({ page }) => {
    await page.goto("/managePersons", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Name/i).fill("Valid Name");
    await page.getByLabel(/Enter Email/i).fill("valid@example.com");
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
  });

  test("create team button is disabled when team name is empty", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeDisabled();
  });

  test("create team button enables once name is filled", async ({ page }) => {
    await page.goto("/manageTeams", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Team Name/i).fill("My Team");
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
  });

  test("create department button is disabled when name is empty", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeDisabled();
  });

  test("create department button enables once name is filled", async ({ page }) => {
    await page.goto("/manageDepartments", { waitUntil: "networkidle" });
    await page.getByLabel(/Enter Department Name/i).fill("My Department");
    const createBtn = page.getByRole("button", { name: /create/i });
    await expect(createBtn).toBeEnabled({ timeout: 5_000 });
  });

  test("profile save button is disabled when name has not changed", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    const saveBtn = page.getByRole("button", { name: /save/i }).first();
    // Save is disabled when value matches current profile name
    await expect(saveBtn).toBeDisabled();
  });
});
