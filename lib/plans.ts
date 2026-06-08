// The four public subscription tiers, mirrored from the marketing pricing
// section. Prices are the source of truth here; user-facing names and scope
// labels are translated in the dictionaries (settings.plan).

export type PlanId = "free" | "plus" | "pro" | "unlimited";

export const PLAN_IDS = ["free", "plus", "pro", "unlimited"] as const;

export const PLANS: { id: PlanId; priceCents: number }[] = [
  { id: "free", priceCents: 0 },
  { id: "plus", priceCents: 990 },
  { id: "pro", priceCents: 1490 },
  { id: "unlimited", priceCents: 3990 },
];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function planPriceCents(id: PlanId): number {
  return PLANS.find((p) => p.id === id)?.priceCents ?? 0;
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
