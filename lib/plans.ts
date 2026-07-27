// The four public subscription tiers, mirrored from the marketing pricing
// section. Prices are the source of truth here; user-facing names and scope
// labels are translated in the dictionaries (settings.plan).

import type { CurrencyCode } from "./currency";

export type PlanId = "free" | "plus" | "pro" | "unlimited";

export const PLAN_IDS = ["free", "plus", "pro", "unlimited"] as const;

// Billing cadence. Annual plans bill once a year at a discount; monthly bill
// every month at the headline price.
export type BillingInterval = "month" | "year";

// Discount applied to the 12-month total when paying annually.
export const ANNUAL_DISCOUNT = 0.15;

// `priceCents` is the monthly EUR price; `priceCentsUsd` its USD counterpart
// (set independently, not a conversion). EUR annual pricing is derived from
// the discount (see annualPriceCents); USD annual prices are pinned to .99
// price points rather than derived.
export const PLANS: {
  id: PlanId;
  priceCents: number;
  priceCentsUsd: number;
  annualPriceCentsUsd: number;
}[] = [
  { id: "free", priceCents: 0, priceCentsUsd: 0, annualPriceCentsUsd: 0 },
  { id: "plus", priceCents: 990, priceCentsUsd: 1199, annualPriceCentsUsd: 12299 },
  { id: "pro", priceCents: 1490, priceCentsUsd: 1699, annualPriceCentsUsd: 17399 },
  {
    id: "unlimited",
    priceCents: 3990,
    priceCentsUsd: 4599,
    annualPriceCentsUsd: 46999,
  },
];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "month" || value === "year";
}

function monthlyCents(id: PlanId, currency: CurrencyCode = "EUR"): number {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) return 0;
  return currency === "USD" ? plan.priceCentsUsd : plan.priceCents;
}

/**
 * Annual total. EUR: 12 months minus the discount, rounded to whole cents.
 * USD: the pinned .99 price point from PLANS.
 */
export function annualPriceCents(
  id: PlanId,
  currency: CurrencyCode = "EUR",
): number {
  if (currency === "USD") {
    return PLANS.find((p) => p.id === id)?.annualPriceCentsUsd ?? 0;
  }
  return Math.round(monthlyCents(id) * 12 * (1 - ANNUAL_DISCOUNT));
}

/**
 * Charged amount for the given cadence: the monthly price for "month", the
 * (discounted) yearly total for "year". Note: Stripe billing is EUR-only —
 * USD prices are display-only for now.
 */
export function planPriceCents(
  id: PlanId,
  interval: BillingInterval = "month",
  currency: CurrencyCode = "EUR",
): number {
  return interval === "year"
    ? annualPriceCents(id, currency)
    : monthlyCents(id, currency);
}

// Maximum number of properties an owner may hold on each tier. `null` means
// unlimited. Kept here so both the create-property guard and the UI agree.
const PROPERTY_LIMITS: Record<PlanId, number | null> = {
  free: 1,
  plus: 5,
  pro: 10,
  unlimited: null,
};

export function planPropertyLimit(id: PlanId): number | null {
  return PROPERTY_LIMITS[id];
}

// Maximum total storage (in bytes) an owner may use across all buckets on
// each tier. Enforced on upload (documents, property photos, attachments)
// and surfaced on the Settings storage panel.
const STORAGE_LIMITS: Record<PlanId, number> = {
  free: 50 * 1024 * 1024, // 50 MB
  plus: 500 * 1024 * 1024, // 500 MB
  pro: 2 * 1024 * 1024 * 1024, // 2 GB
  unlimited: 10 * 1024 * 1024 * 1024, // 10 GB
};

export function planStorageLimit(id: PlanId): number {
  return STORAGE_LIMITS[id];
}
