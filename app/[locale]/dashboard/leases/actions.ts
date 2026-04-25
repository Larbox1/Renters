"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

export type LeaseState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function eurosToCents(raw: string): number {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export async function createLeaseAction(
  _prev: LeaseState,
  formData: FormData,
): Promise<LeaseState> {
  const locale = getLocale(formData);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const endDateRaw = String(formData.get("end_date") ?? "").trim();

  const { data: lease, error } = await supabase
    .from("leases")
    .insert({
      property_id: String(formData.get("property_id") ?? ""),
      tenant_id: String(formData.get("tenant_id") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: endDateRaw || null,
      monthly_rent_cents: eurosToCents(String(formData.get("monthly_rent_cents") ?? "")),
      deposit_cents: eurosToCents(String(formData.get("deposit_cents") ?? "0")),
      status: String(formData.get("status") ?? "pending"),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/leases`);
  redirect(`/${locale}/dashboard/leases/${lease.id}`);
}

export async function updateLeaseAction(
  _prev: LeaseState,
  formData: FormData,
): Promise<LeaseState> {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const endDateRaw = String(formData.get("end_date") ?? "").trim();

  const { error } = await supabase
    .from("leases")
    .update({
      property_id: String(formData.get("property_id") ?? ""),
      tenant_id: String(formData.get("tenant_id") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: endDateRaw || null,
      monthly_rent_cents: eurosToCents(String(formData.get("monthly_rent_cents") ?? "")),
      deposit_cents: eurosToCents(String(formData.get("deposit_cents") ?? "0")),
      status: String(formData.get("status") ?? "pending"),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/leases`);
  redirect(`/${locale}/dashboard/leases/${id}`);
}

export async function deleteLeaseAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  await supabase.from("leases").delete().eq("id", id);

  revalidatePath(`/${locale}/dashboard/leases`);
  redirect(`/${locale}/dashboard/leases`);
}
