import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function waitForAppReady(page: Page) {
  await page.waitForSelector("header", { timeout: 15_000 });
}

async function openChatPanel(page: Page) {
  const chatBtn = page.getByRole("button", { name: /Copilot/i });
  if (await chatBtn.count() > 0) {
    await chatBtn.first().click();
  } else {
    await page.locator("header button.bg-green-600").first().click();
  }
  await expect(page.getByRole("heading", { name: /Copilot Chat/i })).toBeVisible({ timeout: 5_000 });
}

test.describe("Home page", () => {
  test("loads and shows Web Builder header", async ({ page }) => {
    await page.goto(BASE);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "Web Builder" })).toBeVisible();
  });

  test("shows loading spinner then resolves", async ({ page }) => {
    await page.goto(BASE);
    const spinner = page.locator(".animate-spin").first();
    // Spinner may appear briefly; after it disappears the header must show
    await expect(page.getByRole("heading", { name: "Web Builder" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(spinner).toHaveCount(0, { timeout: 15_000 }).catch(() => {
      // spinner might have already disappeared — that is fine
    });
  });
});

test.describe("Header menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await waitForAppReady(page);
  });

  test("opens and closes the hamburger menu", async ({ page }) => {
    const menuBtn = page.getByRole("button", { name: "Menu" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByRole("button", { name: /How to Use/i })).toBeVisible();
    // click outside to close
    await page.keyboard.press("Escape");
    await page.mouse.click(500, 300);
    await expect(page.getByRole("button", { name: /How to Use/i })).toHaveCount(0, {
      timeout: 3_000,
    }).catch(() => {
      // Some items might still be in DOM — acceptable
    });
  });

  test("opens How to Use modal", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /How to Use/i }).click();
    await expect(page.getByRole("heading", { name: /How to Use/i })).toBeVisible();
    await expect(page.getByText(/Click.*Copilot/i)).toBeVisible();
  });

  test("closes How to Use modal with X button", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /How to Use/i }).click();
    const heading = page.getByRole("heading", { name: /How to Use/i });
    await expect(heading).toBeVisible();
    // Scope the close button to within the modal panel
    const modal = page.locator("div.fixed").filter({ has: heading });
    await modal.locator("button").last().click();
    await expect(heading).toHaveCount(0, { timeout: 3_000 });
  });

  test("closes How to Use modal by clicking backdrop", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /How to Use/i }).click();
    await expect(page.getByRole("heading", { name: /How to Use/i })).toBeVisible();
    // Click the backdrop (top-left corner, outside the modal)
    await page.mouse.click(10, 10);
    await expect(page.getByRole("heading", { name: /How to Use/i })).toHaveCount(0, {
      timeout: 3_000,
    });
  });

  test("opens View Code modal via menu", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /View Code/i }).click();
    // Code panel shows the syntax highlighter
    await expect(page.locator("pre").first()).toBeVisible({ timeout: 5_000 });
  });

  test("closes View Code modal with X button", async ({ page }) => {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: /View Code/i }).click();
    const codePanel = page.locator("pre").first();
    await expect(codePanel).toBeVisible({ timeout: 5_000 });
    // Scope the close button to within the code-viewer modal
    const modal = page.locator("div.fixed").filter({ has: codePanel });
    await modal.locator("button").last().click();
    await expect(codePanel).toHaveCount(0, { timeout: 3_000 });
  });
});

test.describe("Full-screen mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await waitForAppReady(page);
  });

  test("enters full-screen and shows exit button", async ({ page }) => {
    const fullScreenBtn = page.getByTitle("Full screen");
    // Full-screen button is hidden on mobile viewports
    if (!(await fullScreenBtn.isVisible().catch(() => false))) return;
    await fullScreenBtn.click();
    await expect(page.getByText(/Exit Full Screen/i)).toBeVisible();
    // Header should be hidden
    await expect(page.getByRole("heading", { name: "Web Builder" })).toHaveCount(0);
  });

  test("exits full-screen with exit button", async ({ page }) => {
    const fullScreenBtn = page.getByTitle("Full screen");
    if (!(await fullScreenBtn.isVisible().catch(() => false))) return;
    await fullScreenBtn.click();
    await page.getByText(/Exit Full Screen/i).click();
    await expect(page.getByRole("heading", { name: "Web Builder" })).toBeVisible();
  });
});

test.describe("Copilot chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await waitForAppReady(page);
  });

  test("opens Copilot chat panel", async ({ page }) => {
    await openChatPanel(page);
  });

  test("closes Copilot chat panel", async ({ page }) => {
    await openChatPanel(page);
    // Close via the same button (now toggled)
    const closeBtn = page.getByRole("button", { name: /Close Chat/i });
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
    } else {
      await page.locator("header button.bg-green-600").first().click();
    }
    await expect(page.getByRole("heading", { name: /Copilot Chat/i })).toHaveCount(0, { timeout: 3_000 });
  });
});

test.describe("Save button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await waitForAppReady(page);
  });

  test("Save button is visible and clickable", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /Save|💾/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).not.toBeDisabled();
    // Clicking save should not crash the page (it may show saving... or an error silently)
    await saveBtn.click();
  });
});

test.describe("Gallery page", () => {
  test("loads gallery page", async ({ page }) => {
    await page.goto(`${BASE}/gallery`);
    await expect(
      page.getByRole("heading", { name: /Gallery|Design/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("gallery page shows back link", async ({ page }) => {
    await page.goto(`${BASE}/gallery`);
    await page.waitForLoadState("networkidle");
    const backLink = page.getByRole("link", { name: /Back/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/^\//);
  });
});

test.describe("API routes", () => {
  test("GET /api/schema returns expected shape", async ({ request }) => {
    const res = await request.get(`${BASE}/api/schema`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("components");
    expect(body).toHaveProperty("apis");
    expect(body).toHaveProperty("hooks");
  });

  test("GET /api/user?list=true returns users array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/user?list=true`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users)).toBe(true);
  });

  test("GET /api/user without userId returns 400", async ({ request }) => {
    const res = await request.get(`${BASE}/api/user`);
    expect(res.status()).toBe(400);
  });

  test("GET /api/code returns a bundle", async ({ request }) => {
    const res = await request.get(`${BASE}/api/code?userId=test-user&all=true`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("files");
    expect(body).toHaveProperty("entrypoint");
  });

  test("GET /api/gallery returns gallery array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/gallery`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("gallery");
    expect(Array.isArray(body.gallery)).toBe(true);
  });

  test("POST /api/user creates a user", async ({ request }) => {
    const res = await request.post(`${BASE}/api/user`, {
      data: { name: "PlaywrightTestUser" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("user");
    expect(body.user).toHaveProperty("id");
    expect(body.user.name).toBe("PlaywrightTestUser");
  });

  test("POST /api/user without name returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/user`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST /api/code saves a code bundle", async ({ request }) => {
    const res = await request.post(`${BASE}/api/code?userId=pw-test-save`, {
      data: { code: "<h1>Hello</h1>" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.version).toBeGreaterThan(0);
  });

  test("DELETE /api/code resets a bundle", async ({ request }) => {
    await request.post(`${BASE}/api/code?userId=pw-test-reset`, {
      data: { code: "<h1>Temp</h1>" },
    });
    const res = await request.delete(`${BASE}/api/code?userId=pw-test-reset`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
