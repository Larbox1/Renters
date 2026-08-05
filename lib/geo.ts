// Display-currency default for anonymous visitors (landing / pricing pages).
// Vercel stamps every production request with the visitor's country; US
// visitors default to USD, everyone else to EUR. This only seeds the pricing
// display — the currency actually billed is decided by the profile's
// operation_country at checkout (see lib/stripe.ts).

import { headers } from "next/headers";
import type { Locale } from "@/i18n/config";
import type { CurrencyCode } from "./currency";

export async function visitorDisplayCurrency(
  locale: Locale,
): Promise<CurrencyCode> {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  if (country) return country === "US" ? "USD" : "EUR";
  // Outside Vercel (local dev) the header is absent — fall back to the old
  // locale heuristic.
  return locale === "fr" ? "EUR" : "USD";
}
