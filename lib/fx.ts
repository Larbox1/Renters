// EUR↔USD conversion for portfolio totals. Per-row amounts always stay in the
// property's own currency; only cross-property aggregates convert, using the
// ECB daily reference rate fetched from the keyless frankfurter.dev API and
// cached for a day (same pattern as the IRL/INSEE route). A static fallback
// keeps totals rendering if the fetch ever fails.

import type { CurrencyCode } from "./currency";

// Last-resort rate only — close enough for a portfolio overview until the
// next successful daily refresh.
const FALLBACK_EUR_TO_USD = 1.1;

const FX_URL = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD";

/** EUR→USD ECB daily reference rate; falls back to a static rate on failure. */
export async function eurToUsdRate(): Promise<number> {
  try {
    const res = await fetch(FX_URL, { next: { revalidate: 86_400 } });
    if (!res.ok) return FALLBACK_EUR_TO_USD;
    const data = (await res.json()) as { rates?: { USD?: unknown } };
    const rate = data.rates?.USD;
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0
      ? rate
      : FALLBACK_EUR_TO_USD;
  } catch {
    return FALLBACK_EUR_TO_USD;
  }
}

/** Convert cents between EUR and USD at the given EUR→USD rate. */
export function convertCents(
  cents: number,
  from: CurrencyCode,
  to: CurrencyCode,
  eurToUsd: number,
): number {
  if (from === to) return cents;
  return Math.round(from === "EUR" ? cents * eurToUsd : cents / eurToUsd);
}
