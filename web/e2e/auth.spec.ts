import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    const res = await request.get(`${apiBase}/health/live`);
    reachable = res.ok();
  } catch {
    reachable = false;
  }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("sign-up creates account and redirects to /account", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.dodostays.local`;
  await page.goto("/signup");

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("E2E User");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill("Aa1!aaaaaa");

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
