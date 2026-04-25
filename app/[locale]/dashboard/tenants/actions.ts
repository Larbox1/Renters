"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { error } = await supabase.from("tenants").insert({
    owner_id: user.id,
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { error } = await supabase
    .from("tenants")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants/${id}`);
}

export async function deleteTenantAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  await supabase
    .from("tenants")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants`);
}
