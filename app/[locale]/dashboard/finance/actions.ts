"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";

export type TransactionState = { error?: string; ok?: boolean };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function eurosToCents(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

const KINDS = ["income", "expense"] as const;

const CATEGORIES: Record<(typeof KINDS)[number], readonly string[]> = {
  income: [
    "rent",
    "security_deposit",
    "charges_adjustment",
    "charges_refund_syndic",
  ],
  expense: [
    "charges",
    "insurance",
    "credit",
    "taxes",
    "charges_refund_tenant",
  ],
};

export async function createTransactionAction(
  _prev: TransactionState,
  formData: FormData,
): Promise<TransactionState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return { error: "forbidden" };

  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!(KINDS as readonly string[]).includes(kindRaw)) {
    return { error: "kind_required" };
  }

  const propertyId = String(formData.get("property_id") ?? "").trim();
  if (!propertyId) return { error: "property_required" };

  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  if (!occurredOn) return { error: "date_required" };

  const amountCents = eurosToCents(String(formData.get("amount_cents") ?? ""));
  if (amountCents <= 0) return { error: "amount_required" };

  // Confirm the caller owns the property before inserting (RLS would also
  // catch a mismatch, but failing fast yields a clearer message).
  const { data: prop } = await session.supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (!prop) return { error: "property_not_found" };

  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = CATEGORIES[kindRaw as (typeof KINDS)[number]].includes(
    categoryRaw,
  )
    ? categoryRaw
    : null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await session.supabase
    .from("finance_transactions")
    .insert({
      owner_id: session.user.id,
      property_id: propertyId,
      kind: kindRaw,
      category,
      amount_cents: amountCents,
      occurred_on: occurredOn,
      note,
    });

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/finance`);
  return { ok: true };
}

export async function deleteTransactionAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  await session.supabase.from("finance_transactions").delete().eq("id", id);

  revalidatePath(`/${locale}/dashboard/finance`);
}
