export function anchorPinElement(name: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.dataset.kind = "anchor-pin";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "4px";
  wrap.style.padding = "4px 12px";
  wrap.style.borderRadius = "999px";
  wrap.style.border = "1.5px solid #1E3A8A";
  wrap.style.background = "#1E3A8A";
  wrap.style.color = "#F5EFE6";
  wrap.style.fontFamily = "var(--font-plex), system-ui, sans-serif";
  wrap.style.fontSize = "12px";
  wrap.style.fontWeight = "600";
  wrap.style.boxShadow = "2px 2px 0 #1A1410";
  wrap.style.cursor = "grab";
  wrap.style.userSelect = "none";
  wrap.textContent = `⚓ ${name}`;
  return wrap;
}
