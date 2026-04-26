"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";

export type TenantState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

export async function createTenantAction(
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  // Admins can pick any owner; everyone else owns the tenant they create.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId =
    session.role === "admin" && requestedOwnerId
      ? requestedOwnerId
      : session.user.id;

  const { error } = await session.supabase.from("tenants").insert({
    owner_id: ownerId,
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants`);
}

export async function updateTenantAction(
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const updates: Record<string, unknown> = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  // Only admins can reassign ownership.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  if (session.role === "admin" && requestedOwnerId) {
    updates.owner_id = requestedOwnerId;
  }

  const { error } = await session.supabase
    .from("tenants")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants/${id}`);
}

export async function deleteTenantAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  await session.supabase.from("tenants").delete().eq("id", id);

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants`);
}
