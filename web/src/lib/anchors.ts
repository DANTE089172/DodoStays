export interface Anchor {
  lat: number;
  lng: number;
  name: string;
}

export const MAX_ANCHORS = 3;

export function anchorsToString(anchors: Anchor[]): string {
  return anchors
    .slice(0, MAX_ANCHORS)
    .map((a) => `${a.lat},${a.lng},${encodeURIComponent(a.name)}`)
    .join("|");
}

export function parseAnchors(value: string | null): Anchor[] {
  if (!value) return [];
  return value
    .split("|")
    .filter(Boolean)
    .slice(0, MAX_ANCHORS)
    .map((token, i) => {
      const [lat, lng, ...rest] = token.split(",");
      return {
        lat: Number(lat),
        lng: Number(lng),
        name: rest.length ? decodeURIComponent(rest.join(",")) : `Anchor ${i + 1}`,
      };
    })
    .filter((a) => !isNaN(a.lat) && !isNaN(a.lng));
}
