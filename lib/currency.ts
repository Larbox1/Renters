// Currency display helpers. The operator's country (profiles.operation_country)
// decides the display currency: FR → EUR, US → USD. Amounts are stored in cents
// either way. Stripe subscription billing stays EUR and does not use these.

import type { Locale } from "@/i18n/config";
import {
  US_LEASE_TYPES,
  type OperationCountry,
} from "./operation-country";

export type CurrencyCode = "EUR" | "USD";

export function currencyFor(country: OperationCountry): CurrencyCode {
  return country === "US" ? "USD" : "EUR";
}

/**
 * Lease-scoped surfaces (receipts, detail cards) derive the currency from the
 * lease type itself so a tenant viewing a US lease sees dollars regardless of
 * their own profile. Falls back to the viewer's country for untyped leases.
 */
export function currencyForLeaseType(
  type: string | null | undefined,
  fallbackCountry: OperationCountry,
): CurrencyCode {
  if (type && (US_LEASE_TYPES as readonly string[]).includes(type)) {
    return "USD";
  }
  if (type) return "EUR";
  return currencyFor(fallbackCountry);
}

export function formatCents(
  cents: number,
  locale: Locale,
  currency: CurrencyCode,
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function currencySymbol(currency: CurrencyCode): string {
  return currency === "USD" ? "$" : "€";
}

/**
 * Dictionary labels embed "€" (e.g. "Monthly rent (€)"). Swap the symbol for
 * US operators instead of duplicating every label per country.
 */
export function localizeCurrencyLabel(
  label: string,
  currency: CurrencyCode,
): string {
  return currency === "USD" ? label.replace(/€/g, "$") : label;
}
