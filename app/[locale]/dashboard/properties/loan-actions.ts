"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import { percentToRateBps } from "@/lib/loan";

export type LoanState = { error?: string; saved?: boolean };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function eurosToCents(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Parse + validate the loan fields shared by create and update. */
function readLoanFields(formData: FormData):
  | { error: string }
  | {
      label: string | null;
      principal_cents: number;
      annual_rate_bps: number;
      start_date: string;
      end_date: string;
    } {
  const principal = eurosToCents(
    String(formData.get("principal") ?? "").trim(),
  );
  if (principal == null) return { error: "invalid_amount" };

  const rateBps = percentToRateBps(String(formData.get("rate") ?? "").trim());
  if (rateBps == null) return { error: "invalid_rate" };

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  if (!startDate || !endDate || endDate <= startDate) {
    return { error: "invalid_dates" };
  }

  return {
    label: String(formData.get("label") ?? "").trim() || null,
    principal_cents: principal,
    annual_rate_bps: rateBps,
    start_date: startDate,
    end_date: endDate,
  };
}

export async function createLoanAction(
  _prev: LoanState,
  formData: FormData,
): Promise<LoanState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const propertyId = String(formData.get("property_id") ?? "");
  const fields = readLoanFields(formData);
  if ("error" in fields) return fields;

  // The loan belongs to the property's owner (RLS then restricts writes to
  // the owner themselves); a property the caller can't see yields not_found.
  const { data: property } = await session.supabase
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) return { error: "not_found" };

  const { error } = await session.supabase.from("property_loans").insert({
    property_id: propertyId,
    owner_id: property.owner_id,
    ...fields,
  });
  if (error) return { error: "generic" };

  revalidatePath(`/${locale}/dashboard/properties/${propertyId}`);
  return { saved: true };
}

export async function updateLoanAction(
  _prev: LoanState,
  formData: FormData,
): Promise<LoanState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const id = String(formData.get("id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");
  const fields = readLoanFields(formData);
  if ("error" in fields) return fields;

  const { error } = await session.supabase
    .from("property_loans")
    .update(fields)
    .eq("id", id);
  if (error) return { error: "generic" };

  revalidatePath(`/${locale}/dashboard/properties/${propertyId}`);
  return { saved: true };
}

export async function deleteLoanAction(formData: FormData) {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const id = String(formData.get("id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");

  await session.supabase.from("property_loans").delete().eq("id", id);

  revalidatePath(`/${locale}/dashboard/properties/${propertyId}`);
}
