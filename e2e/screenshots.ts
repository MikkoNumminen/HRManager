/**
 * Screenshot capture script for README.md
 *
 * Takes 3 screenshots with different themes:
 * - overview.png: Dashboard page (dark theme)
 * - permissions.png: Permission editor (cyberpunk theme)
 * - audit-log.png: Audit log (ocean theme) — rich activity history
 *
 * Usage: npx tsx e2e/screenshots.ts
 * Requires: production server running on localhost:3000
 */

import { chromium } from "@playwright/test";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "docs", "screenshots");
const VIEWPORT = { width: 1440, height: 900 };

/** Remove fixed overlays, skip links, tooltips, snackbars from DOM */
async function hideUIOverlays(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.position === "fixed") {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight * 0.5 && rect.right > window.innerWidth * 0.5) {
          (el as HTMLElement).remove();
        }
      }
    });
    document.querySelector('a[href="#main-content"]')?.remove();
    document.querySelectorAll('[role="tooltip"], .MuiTooltip-popper').forEach((el) => el.remove());
    document.querySelectorAll(".MuiAlert-root, .MuiSnackbar-root").forEach((el) => el.remove());
  });
  await page.waitForTimeout(200);
}

async function loginAsDemo(page: import("@playwright/test").Page) {
  const req = page.context().request;

  await page.addInitScript(() => {
    localStorage.setItem(
      "hrm_tutorial_progress",
      JSON.stringify([
        "view_employees",
        "add_person",
        "create_team",
        "add_member",
        "create_department",
        "assign_team_to_department",
        "manage_permissions",
        "view_audit_log",
      ]),
    );
  });

  const csrfRes = await req.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await req.post(`${BASE_URL}/api/auth/callback/demo`, { form: { csrfToken } });

  await page
    .context()
    .addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
}

async function setTheme(page: import("@playwright/test").Page, theme: string) {
  await page.evaluate((t) => localStorage.setItem("hrm-theme", t), theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await hideUIOverlays(page);
}

async function seedMockData(page: import("@playwright/test").Page) {
  const menuButton = page
    .locator('[aria-label*="user menu" i], [aria-label*="User menu" i]')
    .first();
  await menuButton.click();
  await page.waitForTimeout(500);
  await page.getByRole("menuitem", { name: /mock data|load mock/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /replace all/i }).click();
  await page.waitForSelector(".MuiAlert-root", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
}

/** Submit a create form */
async function createEntity(
  page: import("@playwright/test").Page,
  url: string,
  fields: Record<string, string>,
) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"]`).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill(value);
    }
  }

  const createBtn = page.getByRole("button", { name: /^create$/i });
  if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
  }
}

/** Navigate to a person detail and delete them */
async function deletePerson(page: import("@playwright/test").Page, personName: string) {
  await page.goto("/managePersons", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const row = page.locator("table tbody tr").filter({ hasText: personName }).first();
  if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
    await row.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const removeBtn = page.getByRole("button", { name: /remove|delete/i }).first();
    if (await removeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await removeBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole("button", { name: /confirm|remove|delete|yes/i }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  }
}

/** Generate lots of audit activity via CRUD operations */
async function generateRichAuditActivity(page: import("@playwright/test").Page) {
  await createEntity(page, "/managePersons", { name: "Sarah Connor", email: "sarah@skynet.com" });
  await createEntity(page, "/managePersons", { name: "John Smith", email: "john@company.org" });
  await createEntity(page, "/managePersons", { name: "Maria Garcia", email: "maria@startup.io" });

  await createEntity(page, "/manageTeams", { name: "Security Team" });
  await createEntity(page, "/manageTeams", { name: "Infrastructure" });

  await createEntity(page, "/manageDepartments", { name: "Operations" });
  await createEntity(page, "/manageDepartments", { name: "Research" });

  await deletePerson(page, "Sarah Connor");
}

/** Toggle some permission overrides for visual variety (keeps superuser role) */
async function togglePermissionOverrides(page: import("@playwright/test").Page) {
  // Go to admin page, click demo user
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const userRow = page.locator("table tbody tr").first();
  if (!(await userRow.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await userRow.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Toggle some permissions to Deny to create visual variety
  // The badges will show "Denied" even for superuser user-level overrides
  const permissionsToToggle = [
    { key: "person:delete", state: "deny" },
    { key: "person:update_position", state: "deny" },
    { key: "person:update_email", state: "deny" },
  ];

  for (const { key, state } of permissionsToToggle) {
    // Find the row with this permission key
    const permText = page.locator(`text=${key}`).first();
    if (!(await permText.isVisible({ timeout: 1000 }).catch(() => false))) continue;

    // Navigate up to the container that has the toggle buttons
    // The structure is: ListItem > Box > (Typography + Chip) + ToggleButtonGroup
    const listItem = permText.locator("xpath=ancestor::li[1]");
    const toggleBtn = listItem.locator(`button[value="${state}"]`).first();
    if (await toggleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // Scroll to top for the screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    baseURL: BASE_URL,
    locale: "en-US",
  });
  const page = await context.newPage();

  console.log("1/6 Logging in...");
  await loginAsDemo(page);

  console.log("2/6 Seeding mock data...");
  await seedMockData(page);

  console.log("3/6 Generating audit activity...");
  await generateRichAuditActivity(page);

  // --- Screenshot 1: Dashboard (dark theme) ---
  console.log("4/6 Dashboard screenshot (dark)...");
  await setTheme(page, "dark");
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await hideUIOverlays(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "overview.png"), fullPage: false });
  console.log("  ✓ overview.png");

  // --- Screenshot 2: Audit log (ocean theme) — BEFORE any role changes ---
  console.log("5/6 Audit log screenshot (ocean)...");
  await setTheme(page, "ocean");
  await page.goto("/admin/audit", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await hideUIOverlays(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "audit-log.png"), fullPage: false });
  console.log("  ✓ audit-log.png");

  // --- Screenshot 3: Permission editor (cyberpunk theme) with overrides ---
  console.log("6/6 Permissions screenshot (cyberpunk)...");
  await setTheme(page, "cyberpunk");
  await togglePermissionOverrides(page);
  await hideUIOverlays(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "permissions.png"), fullPage: false });
  console.log("  ✓ permissions.png");

  // Restore overrides back to default
  console.log("Restoring permission defaults...");
  const restoreKeys = ["person:delete", "person:update_position", "person:update_email"];
  for (const key of restoreKeys) {
    const permText = page.locator(`text=${key}`).first();
    if (!(await permText.isVisible({ timeout: 1000 }).catch(() => false))) continue;
    const listItem = permText.locator("xpath=ancestor::li[1]");
    const defaultBtn = listItem.locator('button[value="default"]').first();
    if (await defaultBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await defaultBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await browser.close();
  console.log("\n✓ All screenshots saved to docs/screenshots/");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
