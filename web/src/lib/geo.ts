export const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "grand-baie":      { lat: -20.0117, lng: 57.5800 },
  "flic-en-flac":    { lat: -20.2667, lng: 57.3667 },
  "tamarin":         { lat: -20.3220, lng: 57.3690 },
  "trou-aux-biches": { lat: -20.0394, lng: 57.5481 },
  "pereybere":       { lat: -19.9967, lng: 57.5878 },
  "belle-mare":      { lat: -20.1900, lng: 57.7700 },
  "le-morne":        { lat: -20.4500, lng: 57.3167 },
  "blue-bay":        { lat: -20.4456, lng: 57.7100 },
  "albion":          { lat: -20.2117, lng: 57.4039 },
};

// Mapbox uses [lng, lat] tuples
export const MAURITIUS_BOUNDS: [[number, number], [number, number]] = [
  [57.29, -20.55],
  [57.83, -19.94],
];

export function bboxToString(sw: [number, number], ne: [number, number]): string {
  // sw = [lng, lat], ne = [lng, lat] -> backend wants "swLat,swLng,neLat,neLng"
  return `${sw[1]},${sw[0]},${ne[1]},${ne[0]}`;
}
