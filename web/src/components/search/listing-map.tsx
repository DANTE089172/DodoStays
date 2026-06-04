"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatBoundsLike, Map as MapboxMap } from "mapbox-gl";
import { Alert, Snackbar } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { MAURITIUS_BOUNDS, bboxToString } from "@/lib/geo";
import { anchorsToString, parseAnchors, MAX_ANCHORS, type Anchor } from "@/lib/anchors";
import { lifestylePinElement } from "./lifestyle-pin";
import { anchorPinElement } from "./anchor-pin";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  listings: ListingSummary[];
  highlightId?: string | null;
  onPinHover?: (id: string | null) => void;
}

interface ListingMarker {
  id: string;
  marker: mapboxgl.Marker;
  el: HTMLElement;
}

export function ListingMap({ listings, highlightId, onPinHover }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const listingMarkersRef = useRef<ListingMarker[]>([]);
  const anchorMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const liveSearch = sp.get("liveSearch") !== "off";
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // ---- Initialise the map exactly once ----
  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      bounds: MAURITIUS_BOUNDS,
      maxBounds: [[56.5, -20.9], [58.2, -19.5]],
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

    // Click empty area = drop an anchor
    map.on("click", (ev) => {
      const target = ev.originalEvent.target as HTMLElement | null;
      if (target?.closest(".mapboxgl-marker")) return;
      const current = parseAnchors(new URLSearchParams(window.location.search).get("anchors"));
      if (current.length >= MAX_ANCHORS) {
        setSnack(`You can drop up to ${MAX_ANCHORS} anchors`);
        return;
      }
      const next: Anchor = {
        lat: ev.lngLat.lat,
        lng: ev.lngLat.lng,
        name: `Anchor ${current.length + 1}`,
      };
      const params = new URLSearchParams(window.location.search);
      params.set("anchors", anchorsToString([...current, next]));
      router.push(`/listings?${params.toString()}`);
    });

    // Pan/zoom listener: live search or "Search this area" button
    map.on("moveend", () => {
      if (!liveSearch) {
        setShowSearchHere(true);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        if (!b) return;
        const bbox = bboxToString([b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]);
        const params = new URLSearchParams(window.location.search);
        params.set("bbox", bbox);
        router.replace(`/listings?${params.toString()}`);
      }, 400);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
    // intentionally omit `liveSearch` — re-reading inside the handler keeps the listener stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---- Re-render anchors when URL ?anchors= changes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    anchorMarkersRef.current.forEach((m) => m.remove());
    anchorMarkersRef.current = [];

    const anchors = parseAnchors(sp.get("anchors"));
    for (const a of anchors) {
      const el = anchorPinElement(a.name);
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([a.lng, a.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const newLngLat = marker.getLngLat();
        const current = parseAnchors(new URLSearchParams(window.location.search).get("anchors"));
        const updated = current.map((x) =>
          x.name === a.name ? { ...x, lat: newLngLat.lat, lng: newLngLat.lng } : x
        );
        const params = new URLSearchParams(window.location.search);
        params.set("anchors", anchorsToString(updated));
        router.replace(`/listings?${params.toString()}`);
      });
      anchorMarkersRef.current.push(marker);
    }
  }, [sp, router]);

  // ---- Render listing pins when listings prop changes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    listingMarkersRef.current.forEach((m) => m.marker.remove());
    listingMarkersRef.current = [];

    if (listings.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    for (const l of listings) {
      const el = lifestylePinElement({ vibe: l.vibe, priceBand: l.priceBand, priceMur: l.nightlyRateMur });
      el.addEventListener("click", () => router.push(`/listings/${l.id}`));
      el.addEventListener("mouseenter", () => onPinHover?.(l.id));
      el.addEventListener("mouseleave", () => onPinHover?.(null));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([l.longitude, l.latitude]).addTo(map);
      listingMarkersRef.current.push({ id: l.id, marker, el });
      bounds.extend([l.longitude, l.latitude]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 13, duration: 400 });
    }
  }, [listings, router, onPinHover]);

  // ---- Apply hover highlight to existing pin elements ----
  useEffect(() => {
    for (const { id, el } of listingMarkersRef.current) {
      // eslint-disable-next-line react-hooks/immutability
      el.style.transform = id === highlightId ? "scale(1.15)" : "";
      el.style.zIndex = id === highlightId ? "10" : "";
    }
  }, [highlightId]);

  function searchHere() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const bbox = bboxToString([b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]);
    const params = new URLSearchParams(window.location.search);
    params.set("bbox", bbox);
    router.push(`/listings?${params.toString()}`);
    setShowSearchHere(false);
  }

  if (!token) {
    return (
      <Alert
        severity="info"
        variant="outlined"
        sx={{
          height: "100%",
          minHeight: 384,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: "var(--font-plex)",
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-card)",
          borderRadius: "2px",
        }}
      >
        Map unavailable — set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>web/.env.local</code> and restart the dev server.
      </Alert>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 384 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {!liveSearch && showSearchHere && (
        <button
          type="button"
          onClick={searchHere}
          style={{
            position: "absolute",
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            zIndex: 10,
            padding: "6px 16px",
            fontFamily: "var(--font-plex)",
            fontWeight: 600,
            fontSize: "0.875rem",
            backgroundColor: "var(--color-card)",
            color: "var(--color-foreground)",
            border: "1.5px solid var(--color-foreground)",
            borderRadius: 2,
            boxShadow: "2px 2px 0 var(--color-foreground)",
            cursor: "pointer",
          }}
        >
          Search this area
        </button>
      )}
      <Snackbar
        open={snack !== null}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setSnack(null)} sx={{ fontFamily: "var(--font-plex)" }}>
          {snack}
        </Alert>
      </Snackbar>
    </div>
  );
}
