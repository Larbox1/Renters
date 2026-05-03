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

function optionalCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function optionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : n;
}

function optionalString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed || null;
}

function optionalEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
): T | null {
  const trimmed = raw.trim();
  return (allowed as readonly string[]).includes(trimmed)
    ? (trimmed as T)
    : null;
}

const DURATION_VALUES = ["3_years", "6_years", "reduced"] as const;
const CHARGES_METHODS = ["provisions", "periodic", "flat_rate"] as const;
const PAYMENT_TIMINGS = ["in_advance", "arrears"] as const;
const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;

function buildBailVidePayload(formData: FormData, isBailVide: boolean) {
  if (!isBailVide) {
    // Clear bail-vide-only fields when the lease isn't a bail vide.
    return {
      duration: null,
      reduced_duration_months: null,
      reduced_duration_reason: null,
      irl_reference: null,
      revision_date: null,
      rent_supplement_cents: null,
      is_zone_tendue: false,
      reference_rent_cents_per_sqm: null,
      reference_rent_capped_cents_per_sqm: null,
      charges_method: null,
      charges_amount_cents: null,
      payment_day_of_month: null,
      payment_timing: null,
      dpe_class: null,
      annual_energy_cost_cents: null,
      tenant_fees_cents: null,
      tenant_inventory_fees_cents: null,
    };
  }
  const duration = optionalEnum(
    String(formData.get("duration") ?? ""),
    DURATION_VALUES,
  );
  return {
    duration,
    reduced_duration_months:
      duration === "reduced"
        ? optionalInt(String(formData.get("reduced_duration_months") ?? ""))
        : null,
    reduced_duration_reason:
      duration === "reduced"
        ? optionalString(String(formData.get("reduced_duration_reason") ?? ""))
        : null,
    irl_reference: optionalString(String(formData.get("irl_reference") ?? "")),
    revision_date: optionalString(String(formData.get("revision_date") ?? "")),
    rent_supplement_cents: optionalCents(
      String(formData.get("rent_supplement_cents") ?? ""),
    ),
    is_zone_tendue: formData.get("is_zone_tendue") === "on",
    reference_rent_cents_per_sqm: optionalCents(
      String(formData.get("reference_rent_cents_per_sqm") ?? ""),
    ),
    reference_rent_capped_cents_per_sqm: optionalCents(
      String(formData.get("reference_rent_capped_cents_per_sqm") ?? ""),
    ),
    charges_method: optionalEnum(
      String(formData.get("charges_method") ?? ""),
      CHARGES_METHODS,
    ),
    charges_amount_cents: optionalCents(
      String(formData.get("charges_amount_cents") ?? ""),
    ),
    payment_day_of_month: optionalInt(
      String(formData.get("payment_day_of_month") ?? ""),
    ),
    payment_timing: optionalEnum(
      String(formData.get("payment_timing") ?? ""),
      PAYMENT_TIMINGS,
    ),
    dpe_class: optionalEnum(
      String(formData.get("dpe_class") ?? ""),
      DPE_CLASSES,
    ),
    annual_energy_cost_cents: optionalCents(
      String(formData.get("annual_energy_cost_cents") ?? ""),
    ),
    tenant_fees_cents: optionalCents(
      String(formData.get("tenant_fees_cents") ?? ""),
    ),
    tenant_inventory_fees_cents: optionalCents(
      String(formData.get("tenant_inventory_fees_cents") ?? ""),
    ),
  };
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
  const typeRaw = String(formData.get("type") ?? "").trim();

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
      type: typeRaw || null,
      ...buildBailVidePayload(formData, typeRaw === "bail_vide"),
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
  const typeRaw = String(formData.get("type") ?? "").trim();

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
      type: typeRaw || null,
      ...buildBailVidePayload(formData, typeRaw === "bail_vide"),
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
