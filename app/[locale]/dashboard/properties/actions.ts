"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;

  const { error } = await supabase.from("properties").insert({
    owner_id: user.id,
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;

  const { error } = await supabase
    .from("properties")
    .update({
      label: String(formData.get("label") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      postal_code: String(formData.get("postal_code") ?? "").trim() || null,
      country: String(formData.get("country") ?? "FR").trim() || "FR",
      monthly_rent_cents: rentCents,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties/${id}`);
}

export async function deletePropertyAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties`);
}
