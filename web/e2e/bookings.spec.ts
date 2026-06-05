import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    const res = await request.get(`${apiBase}/health/live`);
    reachable = res.ok();
  } catch { reachable = false; }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("guest can hold + confirm a booking and see it in /bookings", async ({ page }) => {
  // 1. Create a host + a published listing via API directly (faster than UI)
  const hostEmail = `host-bk-${Date.now()}@test.dodostays.local`;
  const guestEmail = `guest-bk-${Date.now()}@test.dodostays.local`;
  const password = "Aa1!aaaaaa";

  const hostSignup = await page.request.post(`${apiBase}/api/identity/signup`, {
    data: { email: hostEmail, password, displayName: "Host BK", preferredLanguage: "en", intendedRole: "Host" },
  });
  expect(hostSignup.ok()).toBeTruthy();
  const hostAuth = await hostSignup.json();
  const hostToken = hostAuth.accessToken;

  const createListing = await page.request.post(`${apiBase}/api/listings`, {
    headers: { Authorization: `Bearer ${hostToken}` },
    data: {
      title: `Booking Test Villa ${Date.now()}`,
      description: "A test villa for booking e2e.",
      propertyType: "Villa",
      region: "flic-en-flac",
      addressLine: "12 Coral Lane",
      latitude: -20.27,
      longitude: 57.36,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      maxGuests: 6,
      nightlyRateMur: 4500,
      cleaningFeeMur: 600,
      minStayNights: 2,
      amenities: ["Pool", "Wifi"],
    },
  });
  expect(createListing.ok()).toBeTruthy();
  const listing = await createListing.json();

  const publish = await page.request.post(`${apiBase}/api/listings/${listing.id}/publish`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  expect(publish.ok()).toBeTruthy();

  // 2. Sign up as a guest in the browser (not via API — we need the auth-cookie + app state)
  await page.goto("/signup");
  await page.getByText("I'm a guest").click();
  await page.getByPlaceholder("Email").fill(guestEmail);
  await page.getByPlaceholder("Display name").fill("Guest BK");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // 3. Open the listing detail page
  await page.goto(`/listings/${listing.id}`);

  // 4. Pick check-in (60 days out) and check-out (3 nights later)
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 60);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;

  // The MUI DatePicker text inputs accept MM/DD/YYYY in the default en-US locale
  const checkInInput = page.getByLabel("Check in");
  await checkInInput.click();
  await checkInInput.fill(fmt(checkIn));
  await page.keyboard.press("Escape");

  const checkOutInput = page.getByLabel("Check out");
  await checkOutInput.click();
  await checkOutInput.fill(fmt(checkOut));
  await page.keyboard.press("Escape");

  // 5. Hold dates
  await page.getByRole("button", { name: /^hold dates$/i }).click();

  // 6. Confirm
  await expect(page.getByRole("button", { name: /^confirm booking$/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /^confirm booking$/i }).click();

  // 7. Land on /bookings, see the new booking
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByRole("heading", { name: listing.title })).toBeVisible({ timeout: 10000 });
});
