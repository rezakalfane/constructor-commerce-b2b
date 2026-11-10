// Demo customer segments for Constructor merchandising and personalization. The visitor's segments are sent to Search, Browse and Autocomplete
// as the `us` parameter (user segments); a rule or campaign targeting a segment of the same name in the Constructor dashboard then applies.
// The choice is kept in the `cio_segments` cookie (set by `?segment=<id>` on any URL, or by the Segments tab of the debug panel).
// Edge-safe: used by the proxy as well as by server and client components.

export const SEGMENT_COOKIE = "cio_segments";

export type Segment = { id: string; label: string; hint: string };

export const SEGMENTS: Segment[] = [
  { id: "garage", label: "Trade garages", hint: "workshops buying car batteries and chargers" },
  { id: "fleet", label: "Fleet buyers", hint: "trucks, agricultural and commercial batteries" },
  { id: "leisure", label: "Leisure and marine", hint: "motorhomes, boats, deep-cycle and lithium" },
  { id: "industrial", label: "Industrial and standby", hint: "alarm, standby and power tool batteries" },
  { id: "retail", label: "Retail and household", hint: "consumer cells, coin cells and chargers" },
];

/** A segment id: lowercase letters, digits, `-` and `_` (the five above, or any custom one such as `vip`). */
const VALID = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const MAX_SEGMENTS = 10;

/** Turns what someone typed ("Audience:VIP Gold") into a segment id ("vip-gold"), or null when it is not usable. */
export function normalizeSegment(input: string): string | null {
  const id = input.trim().toLowerCase().replace(/^audience:/, "").replace(/\s+/g, "-");
  return VALID.test(id) && id !== "none" ? id : null;
}

/** Reads a cookie value ("garage,fleet,vip") into segment ids; anything that is not a valid id is dropped. */
export function parseSegments(value: string | undefined | null): string[] {
  return [...new Set((value ?? "").split(",").map((s) => s.trim()).filter((s) => VALID.test(s) && s !== "none"))].slice(0, MAX_SEGMENTS);
}

/** Reads `segment=audience:garage` parameters; returns the ids, or `null` when the URL has no segment parameter. `segment=none` clears. */
export function segmentsFromParams(values: string[]): string[] | null {
  if (!values.length) return null;
  const ids = values.flatMap((v) => v.split(",")).map((v) => v.replace(/^audience:/, "").trim());
  return ids.includes("none") ? [] : parseSegments(ids.join(","));
}

// ---- A/B test run by the storefront (Constructor has no experiment UI or API here) -------------------------------------------------------
// With `CIO_AB_TEST=battery`, half of the visitors (chosen from their client id, so it never changes) also get the segment `ab-battery-b`.
// A campaign targeted at that segment (scripts/constructor/configure-segment-campaigns.mjs) ranks differently for group B only; group A is the control.
// The segment is sent to Search, Browse and Autocomplete AND to the tracking events, so Constructor's reports can be sliced by it.
export const AB_SEGMENT = "ab-battery-b";

/** Stable 50/50 split from the visitor's client id (FNV-1a). */
export function abBucket(clientId: string): "a" | "b" {
  let h = 0x811c9dc5;
  for (let i = 0; i < clientId.length; i++) h = Math.imul(h ^ clientId.charCodeAt(i), 0x01000193);
  return (h >>> 0) % 2 === 0 ? "a" : "b";
}

/** Cookie that forces this browser into group "a" or "b" (debug panel), instead of the group its client id gives. */
export const AB_COOKIE = "cio_ab";
export type AbGroup = "a" | "b";
export const parseAbGroup = (value: string | undefined | null): AbGroup | undefined => (value === "a" || value === "b" ? value : undefined);

/** The group a visitor is in: the forced one, else the one their client id gives; none when there is no id yet. */
export const abGroup = (clientId: string, forced?: AbGroup): AbGroup | undefined => forced ?? (clientId ? abBucket(clientId) : undefined);

/** The visitor's segments plus the experiment segment, when the experiment is on and the visitor is in group B. */
export function withExperiment(segments: string[], clientId: string, on: boolean, forced?: AbGroup): string[] {
  return on && abGroup(clientId, forced) === "b" && !segments.includes(AB_SEGMENT) ? [...segments, AB_SEGMENT] : segments;
}

export const abTestOn = () => process.env.CIO_AB_TEST === "battery";
