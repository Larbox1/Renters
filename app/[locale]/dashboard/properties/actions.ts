"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";

export type PropertyState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function eurosToCents(raw: string): number | null {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function createPropertyAction(
  _prev: PropertyState,
  formData: FormData,
): Promise<PropertyState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;

  // Admins can pick any owner; everyone else owns the property they create.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId =
    session.role === "admin" && requestedOwnerId
      ? requestedOwnerId
      : session.user.id;

  const { error } = await session.supabase.from("properties").insert({
    owner_id: ownerId,
    label: String(formData.get("label") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    country: String(formData.get("country") ?? "FR").trim() || "FR",
    monthly_rent_cents: rentCents,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties`);
}

export async function updatePropertyAction(
  _prev: PropertyState,
  formData: FormData,
): Promise<PropertyState> {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;

  const updates: Record<string, unknown> = {
    label: String(formData.get("label") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    country: String(formData.get("country") ?? "FR").trim() || "FR",
    monthly_rent_cents: rentCents,
  };

  // Only admins can reassign ownership.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  if (session.role === "admin" && requestedOwnerId) {
    updates.owner_id = requestedOwnerId;
  }

  const { error } = await session.supabase
    .from("properties")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties/${id}`);
}

export async function deletePropertyAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  await session.supabase.from("properties").delete().eq("id", id);

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties`);
}
