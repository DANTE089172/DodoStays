import type { ListingVibe, PriceBand } from "@/lib/listings";

const FILL: Record<PriceBand, string> = {
  Budget: "#F5EFE6",  // sand
  Mid: "#D4A24C",     // ochre
  Premium: "#C73E1D", // flamboyant
};

const STROKE = "#1A1410";

const PATHS: Record<ListingVibe, string> = {
  Wave: "M2 12 C 5 8, 9 16, 12 12 S 19 8, 22 12 L 22 18 L 2 18 Z",
  Mountain: "M2 18 L 8 8 L 12 14 L 16 6 L 22 18 Z",
  Leaf: "M12 3 C 18 3, 21 9, 19 14 C 17 19, 11 21, 7 18 C 3 15, 5 7, 12 3 Z M12 3 V 18",
  Town: "M3 18 V 10 H 7 V 18 M 9 18 V 6 H 13 V 18 M 15 18 V 12 H 19 V 18 H 3",
  Mixed: "M4 12 a 8 8 0 1 1 16 0 a 8 8 0 1 1 -16 0",
};

interface Props {
  vibe: ListingVibe;
  priceBand: PriceBand;
  priceMur: number;
}

export function lifestylePinElement({ vibe, priceBand, priceMur }: Props): HTMLElement {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.dataset.kind = "listing-pin";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "4px";
  wrap.style.padding = "4px 8px";
  wrap.style.borderRadius = "2px";
  wrap.style.border = `1.5px solid ${STROKE}`;
  wrap.style.background = "#F5EFE6";
  wrap.style.color = STROKE;
  wrap.style.fontFamily = "var(--font-plex), system-ui, sans-serif";
  wrap.style.fontSize = "11px";
  wrap.style.fontWeight = "600";
  wrap.style.cursor = "pointer";
  wrap.style.boxShadow = "2px 2px 0 #1A1410";
  wrap.style.transition = "transform 200ms ease-out";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", PATHS[vibe]);
  path.setAttribute("fill", FILL[priceBand]);
  path.setAttribute("stroke", STROKE);
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  wrap.appendChild(svg);

  const label = document.createElement("span");
  label.textContent = `MUR ${priceMur.toLocaleString()}`;
  wrap.appendChild(label);

  return wrap;
}
