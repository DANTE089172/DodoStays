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

test("host can create + publish a listing and a guest finds it on browse", async ({ page }) => {
  const email = `host-e2e-${Date.now()}@test.dodostays.local`;
  const password = "Aa1!aaaaaa";

  // Sign up as host
  await page.goto("/signup");
  await page.getByText("I'm a host").click();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("E2E Host");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // Go to host listings, create a new one
  await page.getByRole("link", { name: /manage my listings/i }).click();
  await expect(page).toHaveURL(/\/host\/listings$/);
  await page.getByRole("link", { name: /add listing/i }).click();
  await expect(page).toHaveURL(/\/host\/listings\/new$/);

  const title = `E2E Test Villa ${Date.now()}`;
  // Form fields: title and description are <input>/<textarea> with text labels via <label className=...>Title</label>
  // Use label-based selection with locator filters since the labels and inputs aren't htmlFor-linked.
  // The form has: Title input (first textbox), Description textarea, and various number/select fields.
  // We fill the first textbox (title) and the textarea (description).
  // Title is the first input (text); Description is the textarea.
  // Address is also required — it's a text input following the property type/region selects.
  // We locate it as the second visible text-type input (first is title).
  await page.locator('input').first().fill(title);
  await page.locator('textarea').first().fill("A lovely 3-bed test villa.");
  await page.locator('input[type="text"], input:not([type])').nth(1).fill("123 Test Lane, Flic en Flac");
  await page.getByRole("button", { name: /save as draft/i }).click();

  // We land on the edit page
  await expect(page).toHaveURL(/\/host\/listings\/.+\/edit$/);

  // Publish — there are two buttons (toggle button + form submit "Save changes"); pick the toggle which says "Publish"
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText(/^Published$/)).toBeVisible({ timeout: 5000 });

  // Open public browse
  await page.goto("/listings");
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 10000 });

  // Open detail
  await page.getByRole("heading", { name: title }).click();
  await expect(page).toHaveURL(/\/listings\/.+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
