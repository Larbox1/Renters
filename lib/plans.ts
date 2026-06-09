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
