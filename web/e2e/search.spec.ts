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

test("AI search bar on home navigates to /listings with parsed filters", async ({ page }) => {
  await page.goto("/");

  const input = page.getByPlaceholder(/Tell us where/i);
  await input.click();
  await input.fill("3 bedroom villa in flic en flac with pool");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/listings\?.+/);
  await expect(page).toHaveURL(/region=flic-en-flac/);
  await expect(page).toHaveURL(/propertyType=Villa/);
  await expect(page).toHaveURL(/minBedrooms=3/);
  await expect(page).toHaveURL(/amenities=Pool/);
});

test("Empty anchors message renders on /listings", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText(/Tap the map to drop an/i)).toBeVisible();
});
