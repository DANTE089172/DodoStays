import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try { reachable = (await request.get(`${apiBase}/health/live`)).ok(); } catch { reachable = false; }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("host can add and remove an external calendar feed", async ({ page }) => {
  const hostEmail = `host-ical-${Date.now()}@test.dodostays.local`;
  const password = "Aa1!aaaaaa";

  // Sign up host via API
  const signup = await page.request.post(`${apiBase}/api/identity/signup`, {
    data: { email: hostEmail, password, displayName: "Host iCal", preferredLanguage: "en", intendedRole: "Host" },
  });
  expect(signup.ok()).toBeTruthy();
  const auth = await signup.json();

  // Create listing via API
  const create = await page.request.post(`${apiBase}/api/listings`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      title: `iCal Test Villa ${Date.now()}`,
      description: "A villa.",
      propertyType: "Villa",
      region: "tamarin",
      addressLine: "1 Test Lane",
      latitude: -20.32, longitude: 57.37,
      bedrooms: 2, beds: 2, bathrooms: 1, maxGuests: 4,
      nightlyRateMur: 4000, cleaningFeeMur: 500, minStayNights: 1,
      amenities: ["Wifi"],
    },
  });
  expect(create.ok()).toBeTruthy();
  const listing = await create.json();

  // Sign in as host in browser
  await page.goto("/signin");
  await page.getByPlaceholder("Email").fill(hostEmail);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // Open edit page
  await page.goto(`/host/listings/${listing.id}/edit`);

  // Find the Channels section heading
  await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();

  // Add a feed
  await page.getByPlaceholder(/airbnb\.com\/calendar\/ical/i).fill("https://example.com/airbnb.ics");
  await page.getByRole("button", { name: /^add$/i }).click();

  // Feed appears
  await expect(page.getByText("https://example.com/airbnb.ics")).toBeVisible({ timeout: 5000 });

  // Remove (handle native confirm dialog)
  page.once("dialog", (d) => d.accept());
  // The remove button is an IconButton with aria-label="remove"
  await page.getByLabel("remove").first().click();
  await expect(page.getByText("https://example.com/airbnb.ics")).not.toBeVisible({ timeout: 5000 });
});
