// The four public subscription tiers, mirrored from the marketing pricing
// section. Prices are the source of truth here; user-facing names and scope
// labels are translated in the dictionaries (settings.plan).

export type PlanId = "free" | "plus" | "pro" | "unlimited";

export const PLAN_IDS = ["free", "plus", "pro", "unlimited"] as const;

// Billing cadence. Annual plans bill once a year at a discount; monthly bill
// every month at the headline price.
export type BillingInterval = "month" | "year";

// Discount applied to the 12-month total when paying annually.
export const ANNUAL_DISCOUNT = 0.15;

// `priceCents` is the monthly price. Annual pricing is derived from it (see
// planPriceCents) so the discount lives in exactly one place.
export const PLANS: { id: PlanId; priceCents: number }[] = [
  { id: "free", priceCents: 0 },
  { id: "plus", priceCents: 990 },
  { id: "pro", priceCents: 1490 },
  { id: "unlimited", priceCents: 3990 },
];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "month" || value === "year";
}

function monthlyCents(id: PlanId): number {
  return PLANS.find((p) => p.id === id)?.priceCents ?? 0;
}

/** Annual total (12 months minus the discount), rounded to whole cents. */
export function annualPriceCents(id: PlanId): number {
  return Math.round(monthlyCents(id) * 12 * (1 - ANNUAL_DISCOUNT));
}

/**
 * Charged amount for the given cadence: the monthly price for "month", the
 * (discounted) yearly total for "year".
 */
export function planPriceCents(
  id: PlanId,
  interval: BillingInterval = "month",
): number {
  return interval === "year" ? annualPriceCents(id) : monthlyCents(id);
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
