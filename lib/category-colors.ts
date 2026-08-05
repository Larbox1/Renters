// Category color slots shared by the finance donuts, their legend and the
// transactions table. Lives outside any "use client" module: the finance page
// is a server component, and values imported across a client boundary become
// client-reference proxies there (PIE_SLOTS[i] → undefined → black SVG fills).
//
// Vivid categorical palette, validated on white with the dataviz palette
// script: lightness band, chroma, contrast (all five ≥ 3:1) and normal-vision
// floor pass; the one warn-band CVD pair (emerald↔amber ΔE 7.9) is covered by
// the 2px slice gaps and the always-visible legend values. Colors are
// assigned per category *entity*, never by rank, so a category keeps its hue
// whatever the filtered range shows.
export const PIE_SLOTS = [
  "#2563eb",
  "#ea580c",
  "#059669",
  "#d97706",
  "#db2777",
] as const;

export const PIE_UNCATEGORIZED = "#898781";

export type PieSlice = {
  key: string;
  label: string;
  cents: number;
  /** Amount preformatted server-side in the display currency. */
  formatted: string;
  color: string;
};
