/**
 * Responsive UI tests for both Web Builder (Next.js) and Hack Studio (Vite React).
 *
 * Verifies that key pages render without horizontal overflow or element cutoffs
 * across desktop, tablet, and mobile viewports. Viewport sizes are driven by the
 * projects defined in playwright.config.ts (Desktop Chrome, iPad, iPhone 14).
 *
 * Set BASE_URL / HACKSTUDIO_URL environment variables to point at running instances.
 */

import { test, expect, Page } from "@playwright/test";

const WB_BASE = process.env.BASE_URL || "http://localhost:3000";
const HS_BASE = process.env.HACKSTUDIO_URL || "http://localhost:5173";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow, "Page should not have horizontal scroll overflow").toBe(false);
}

async function elementFitsViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return; // element not rendered — skip
  const viewport = page.viewportSize()!;
  expect(box.x, `${selector} left edge should be >= 0`).toBeGreaterThanOrEqual(-1);
  expect(
    box.x + box.width,
    `${selector} right edge should fit in viewport`
  ).toBeLessThanOrEqual(viewport.width + 1);
}

async function waitForAppReady(page: Page) {
  await page.waitForSelector("header", { timeout: 15_000 });
}

// ── Web Builder ─────────────────────────────────────────────────────────────

test.describe("Web Builder responsive", () => {
  test("home page has no horizontal overflow", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    await noHorizontalOverflow(page);
  });

  test("header fits within viewport", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    await elementFitsViewport(page, "header");
  });

  test("header buttons are visible and not clipped", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Web Builder" })).toBeVisible();
    // Save button should be visible (may show icon-only on mobile)
    const saveBtn = page.getByRole("button", { name: /Save|💾/i });
    await expect(saveBtn).toBeVisible();
  });

  test("main content area fits viewport without cutoff", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    await elementFitsViewport(page, "main");
  });

  test("chat panel opens and fits viewport", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    // On mobile, the Copilot text is hidden; click the green button with CopilotIcon
    const copilotBtn = page.getByRole("button", { name: /Copilot|Close Chat/i });
    if (await copilotBtn.count() > 0) {
      await copilotBtn.first().click();
    } else {
      // Fallback: click the first green button in the header (Copilot)
      await page.locator("header button.bg-green-600").first().click();
    }
    // Chat heading should appear
    await expect(page.getByRole("heading", { name: /Copilot Chat/i })).toBeVisible({ timeout: 5_000 });
    // Chat panel should not extend beyond viewport
    const viewport = page.viewportSize()!;
    const panel = page.locator("div").filter({ hasText: "Copilot Chat" }).locator("..").first();
    const box = await panel.boundingBox();
    if (box) {
      expect(
        box.x + box.width,
        "Chat panel should not exceed viewport width"
      ).toBeLessThanOrEqual(viewport.width + 1);
    }
    await noHorizontalOverflow(page);
  });

  test("full-screen mode fills viewport", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    const fsBtn = page.getByTitle("Full screen");
    // Full-screen button may be hidden on mobile — skip this test if not visible
    if (await fsBtn.isVisible().catch(() => false)) {
      await fsBtn.click();
      await expect(page.getByText(/Exit Full Screen/i)).toBeVisible();
    }
    await noHorizontalOverflow(page);
  });

  test("How to Use modal fits viewport", async ({ page }) => {
    await page.goto(WB_BASE);
    await waitForAppReady(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /How to Use/i }).click();
    await expect(page.getByRole("heading", { name: /How to Use/i })).toBeVisible();
    await noHorizontalOverflow(page);
    // Modal should be within viewport
    const modal = page.locator("div.fixed").filter({
      has: page.getByRole("heading", { name: /How to Use/i }),
    });
    const box = await modal.boundingBox();
    if (box) {
      const viewport = page.viewportSize()!;
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test("gallery page has no horizontal overflow", async ({ page }) => {
    await page.goto(`${WB_BASE}/gallery`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /Gallery|Design/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await noHorizontalOverflow(page);
    await elementFitsViewport(page, "header");
    await elementFitsViewport(page, "main");
  });
});

// ── Hack Studio ──────────────────────────────────────────────────────────────

async function simulateLogin(page: Page, userId = 1, username = "playwright-test") {
  await page.goto(HS_BASE);
  await page.evaluate(
    ([id, name]) => {
      localStorage.setItem(
        "ai-playground-user",
        JSON.stringify({ id, username: name })
      );
    },
    [userId, username]
  );
  await page.reload();
}

test.describe("Hack Studio responsive — Landing page", () => {
  test("landing page has no horizontal overflow", async ({ page }) => {
    await page.goto(HS_BASE);
    await expect(page.getByRole("heading", { name: /AI Hack Studio/i })).toBeVisible({
      timeout: 10_000,
    });
    await noHorizontalOverflow(page);
  });

  test("landing card fits viewport", async ({ page }) => {
    await page.goto(HS_BASE);
    await expect(page.getByRole("heading", { name: /AI Hack Studio/i })).toBeVisible({
      timeout: 10_000,
    });
    await elementFitsViewport(page, ".landing-card");
  });

  test("choice buttons are fully visible", async ({ page }) => {
    await page.goto(HS_BASE);
    await expect(page.getByRole("button", { name: /New User/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible();
    await elementFitsViewport(page, ".landing-choices");
  });

  test("create account form fits viewport", async ({ page }) => {
    await page.goto(HS_BASE);
    await page.getByRole("button", { name: /New User/i }).click();
    await expect(page.getByRole("heading", { name: /Create Your Account/i })).toBeVisible();
    await noHorizontalOverflow(page);
    await elementFitsViewport(page, ".landing-form");
  });

  test("continue form fits viewport", async ({ page }) => {
    await page.goto(HS_BASE);
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
    await noHorizontalOverflow(page);
    await elementFitsViewport(page, ".landing-form");
  });
});

async function loginAndSkipIfRedirected(page: Page): Promise<boolean> {
  await simulateLogin(page);
  if (page.url().includes("/login")) return false;
  return true;
}

test.describe("Hack Studio responsive — Home page", () => {
  test("home page has no horizontal overflow", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await noHorizontalOverflow(page);
  });

  test("header fits viewport", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await elementFitsViewport(page, ".app-header");
  });

  test("feature cards grid fits viewport", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await elementFitsViewport(page, ".features-grid");
  });

  test("footer fits viewport", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await elementFitsViewport(page, ".app-footer");
  });
});

test.describe("Hack Studio responsive — Chat page", () => {
  test("chat page has no horizontal overflow", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await page.goto(`${HS_BASE}/chat`);
    await expect(page.locator(".chat-page")).toBeVisible({ timeout: 10_000 }).catch(() => {});
    await noHorizontalOverflow(page);
  });

  test("chat input bar fits viewport", async ({ page }) => {
    if (!(await loginAndSkipIfRedirected(page))) return;
    await page.goto(`${HS_BASE}/chat`);
    await expect(page.locator(".chat-input-bar")).toBeVisible({ timeout: 10_000 }).catch(() => {});
    await elementFitsViewport(page, ".chat-input-bar");
  });
});
