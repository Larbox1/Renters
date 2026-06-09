import type { CurrentSession } from "@/lib/auth/current-user";
import { isPlanId, planStorageLimit, type PlanId } from "@/lib/plans";

export type StorageUsageRow = {
  bucket_id: string;
  file_count: number;
  total_bytes: number;
};

/**
 * Total bytes the caller "owns" across every bucket, from the
 * get_my_storage_usage RPC (the same aggregate shown on the Settings panel).
 * Returns 0 when the RPC is unavailable so a transient failure never blocks
 * an upload.
 */
export async function getStorageUsageBytes(
  session: CurrentSession,
): Promise<number> {
  const { data, error } = await session.supabase.rpc("get_my_storage_usage");
  if (error) {
    console.error("[storage.quota] usage RPC failed:", error);
    return 0;
  }
  const rows = (data ?? []) as StorageUsageRow[];
  return rows.reduce((sum, r) => sum + Number(r.total_bytes ?? 0), 0);
}

/** The owner's subscription tier, defaulting to "free" when unset. */
export async function getOwnerPlan(
  session: CurrentSession,
): Promise<PlanId> {
  const { data } = await session.supabase
    .from("profiles")
    .select("plan")
    .eq("id", session.user.id)
    .maybeSingle<{ plan: string }>();
  return isPlanId(data?.plan ?? "") ? (data!.plan as PlanId) : "free";
}

/**
 * Returns "storage_limit" when adding `additionalBytes` would push the owner
 * over their plan's storage cap, otherwise null. Only owners carry a plan —
 * other roles (admin, tenant, service provider) are not capped here.
 */
export async function checkStorageQuota(
  session: CurrentSession,
  additionalBytes: number,
): Promise<"storage_limit" | null> {
  if (session.role !== "owner") return null;
  if (additionalBytes <= 0) return null;

  const plan = await getOwnerPlan(session);
  const limit = planStorageLimit(plan);
  const used = await getStorageUsageBytes(session);
  return used + additionalBytes > limit ? "storage_limit" : null;
}
