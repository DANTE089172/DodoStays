import { test, expect } from "@playwright/test";

test("homepage renders DodoStays brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DodoStays" })).toBeVisible();
});
