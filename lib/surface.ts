// Surface display helpers. Like money (lib/currency.ts), the stored number in
// properties.surface_sqm is in the property's local unit: m² for FR, sq ft for
// US. The property's country decides the label; values are never converted.

export type SurfaceUnit = "sqm" | "sqft";

export function surfaceUnitFor(country: string | null | undefined): SurfaceUnit {
  return country === "US" ? "sqft" : "sqm";
}

export function surfaceUnitLabel(unit: SurfaceUnit): string {
  return unit === "sqft" ? "sq ft" : "m²";
}

export function formatSurface(value: number, unit: SurfaceUnit): string {
  return `${value} ${surfaceUnitLabel(unit)}`;
}

/**
 * Dictionary labels embed "m²" (e.g. "Surface (m²)"). Swap the unit for US
 * properties instead of duplicating every label per country.
 */
export function localizeSurfaceLabel(label: string, unit: SurfaceUnit): string {
  return unit === "sqft" ? label.replace(/m²/g, "sq ft") : label;
}
