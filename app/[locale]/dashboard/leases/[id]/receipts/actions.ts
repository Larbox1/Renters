"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { uploadDocumentBlob, deleteDocument } from "@/lib/documents/storage";

// @react-pdf/renderer is heavy and pulls react-dom/server internals, so the
// renderer is imported dynamically (never in the page's static module graph).

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function generateRentReceiptAction(formData: FormData) {
  const locale = getLocale(formData);
  const leaseId = String(formData.get("lease_id") ?? "");
  if (!leaseId) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  const { data: lease, error: leaseError } = await session.supabase
    .from("leases")
    .select("*, properties(*), tenants(*)")
    .eq("id", leaseId)
    .maybeSingle();

  if (leaseError || !lease) return;

  const property = Array.isArray(lease.properties)
    ? lease.properties[0]
    : lease.properties;
  const tenant = Array.isArray(lease.tenants)
    ? lease.tenants[0]
    : lease.tenants;

  // The receipt covers the current calendar month. Period boundaries are
  // computed server-side; a custom period selector can layer on later.
  const now = new Date();
  const periodStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const periodEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  // Upcoming term, rendered as a payment notice (avis d'échéance).
  const nextPeriodStart = toISODate(
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  );
  const nextPeriodEnd = toISODate(
    new Date(now.getFullYear(), now.getMonth() + 2, 0),
  );

  const rentCents = (lease.monthly_rent_cents as number | null) ?? 0;
  const chargesCents = (lease.charges_amount_cents as number | null) ?? 0;
  const totalCents = rentCents + chargesCents;

  // Landlord details via the SECURITY DEFINER RPC — profiles are private (RLS),
  // so a direct read returns nothing when the viewer didn't create this
  // property. See migration 0043_owner_contact_for_contract.sql.
  type OwnerContact = {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    iban: string | null;
    bic: string | null;
  };
  let ownerProfile: OwnerContact | null = null;
  if (property?.owner_id) {
    const { data: ownerRows } = await session.supabase.rpc(
      "get_owner_contact",
      { p_owner_id: property.owner_id },
    );
    ownerProfile = (ownerRows as OwnerContact[] | null)?.[0] ?? null;
  }

  const ownerName =
    ownerProfile?.first_name && ownerProfile?.last_name
      ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
      : (ownerProfile?.full_name ?? null);
  const ownerAddress =
    [
      ownerProfile?.address,
      [ownerProfile?.postal_code, ownerProfile?.city].filter(Boolean).join(" "),
      ownerProfile?.country,
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  const propertyAddress =
    [
      property?.address as string | null,
      [property?.postal_code as string | null, property?.city as string | null]
        .filter(Boolean)
        .join(" "),
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  // Render the PDF buffer via dynamic import.
  let pdfBuffer: Buffer;
  try {
    const { renderReceiptPdf } = await import("./quittance-pdf");
    pdfBuffer = await renderReceiptPdf({
      ownerName,
      ownerEmail: ownerProfile?.email ?? null,
      ownerPhone: ownerProfile?.phone ?? null,
      ownerAddress,
      ownerIban: ownerProfile?.iban ?? null,
      ownerBic: ownerProfile?.bic ?? null,
      tenantName: (tenant?.full_name as string | null) ?? null,
      tenantAddress: null,
      propertyAddress,
      periodStart,
      periodEnd,
      rentCents,
      chargesCents,
      totalCents,
      nextPeriodStart,
      nextPeriodEnd,
      paymentDay: (lease.payment_day_of_month as number | null) ?? null,
      issuedOn: toISODate(now),
      issuedAt: (property?.city as string | null) ?? null,
    }, locale);
  } catch (err) {
    console.error("[receipt.generate] PDF render failed:", err);
    return;
  }

  const tenantName = (tenant?.full_name as string | null) ?? "locataire";
  const filenameBase = `quittance_${tenantName}_${periodStart}`
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  const filename = `${filenameBase}.pdf`;

  let stored;
  try {
    stored = await uploadDocumentBlob(
      session.user.id,
      new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }),
      filename,
      "application/pdf",
    );
  } catch (err) {
    console.error("[receipt.generate] upload failed:", err);
    return;
  }

  const { data: document, error: docError } = await session.supabase
    .from("documents")
    .insert({
      owner_id: session.user.id,
      property_id: property?.id ?? null,
      lease_id: leaseId,
      name: stored.name,
      path: stored.path,
      mime_type: stored.mime_type,
      size: stored.size,
      source: "generated",
    })
    .select("id")
    .single();

  if (docError) {
    console.error("[receipt.generate] document insert failed:", docError);
    return;
  }

  const { error: receiptError } = await session.supabase
    .from("rent_receipts")
    .insert({
      lease_id: leaseId,
      owner_id: session.user.id,
      document_id: document.id,
      period_start: periodStart,
      period_end: periodEnd,
      rent_cents: rentCents,
      charges_cents: chargesCents,
      total_cents: totalCents,
    });

  if (receiptError) {
    console.error("[receipt.generate] receipt insert failed:", receiptError);
    return;
  }

  revalidatePath(`/${locale}/dashboard/leases/${leaseId}`);
  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(`/${locale}/dashboard/leases/${leaseId}?receipt=1`);
}

export async function deleteRentReceiptAction(formData: FormData) {
  const locale = getLocale(formData);
  const leaseId = String(formData.get("lease_id") ?? "");
  const receiptId = String(formData.get("receipt_id") ?? "");
  if (!leaseId || !receiptId) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  // Look up the linked document (and its storage path) before removing the
  // receipt, so we can clean up the generated PDF too.
  const { data: receipt } = await session.supabase
    .from("rent_receipts")
    .select("id, document_id, documents(path)")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt) return;

  const { data: deleted, error } = await session.supabase
    .from("rent_receipts")
    .delete()
    .eq("id", receiptId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    if (error) console.error("[receipt.delete] failed:", error);
    return;
  }

  // Remove the generated PDF: its documents row, then the storage object.
  const doc = Array.isArray(receipt.documents)
    ? receipt.documents[0]
    : receipt.documents;
  const path = (doc as { path: string } | null)?.path ?? null;
  if (receipt.document_id) {
    await session.supabase
      .from("documents")
      .delete()
      .eq("id", receipt.document_id as string);
  }
  if (path) await deleteDocument(path);

  revalidatePath(`/${locale}/dashboard/leases/${leaseId}`);
  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(`/${locale}/dashboard/leases/${leaseId}`);
}
