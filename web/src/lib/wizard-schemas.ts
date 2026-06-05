// Zod schemas for the host wizard steps.
//
// Plan 05.3 will fill in the remaining 7 step schemas. For now we only ship
// the Location step as a proof that `useWizardForm` + zod resolves cleanly
// against the existing `Listing` shape in `./listings.ts`.

import { REGIONS } from "./listings";
import { z } from "./wizard-form";

// Mauritius is roughly 19.97S..20.53S, 57.30E..57.80E. We accept a generous
// box so we don't reject coastline pin-drops that round just outside the
// strict bounding box. Actual region/address validation is the user's job.
const MU_LAT_MIN = -21.5;
const MU_LAT_MAX = -19.5;
const MU_LNG_MIN = 56.5;
const MU_LNG_MAX = 58.5;

const REGION_SLUGS = REGIONS.map((r) => r.slug) as [string, ...string[]];

/**
 * Step 02 — "Location".
 *
 * Field names mirror `Listing` from `./listings.ts` so a step's form values
 * can be merged straight back onto the listing draft without renaming:
 *   region       — slug from `REGIONS` (e.g. "flic-en-flac")
 *   addressLine  — free-text street/area, min 5 chars
 *   latitude     — decimal degrees, must fall inside Mauritius bounding box
 *   longitude    — decimal degrees, must fall inside Mauritius bounding box
 */
export const LocationStepSchema = z.object({
  region: z.enum(REGION_SLUGS, { error: "Pick a region" }),
  addressLine: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters"),
  latitude: z
    .number({ error: "Latitude is required" })
    .finite("Latitude is required")
    .min(MU_LAT_MIN, "Latitude is outside Mauritius")
    .max(MU_LAT_MAX, "Latitude is outside Mauritius"),
  longitude: z
    .number({ error: "Longitude is required" })
    .finite("Longitude is required")
    .min(MU_LNG_MIN, "Longitude is outside Mauritius")
    .max(MU_LNG_MAX, "Longitude is outside Mauritius"),
});

export type LocationStepValues = z.infer<typeof LocationStepSchema>;
