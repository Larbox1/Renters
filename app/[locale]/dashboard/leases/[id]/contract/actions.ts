"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { uploadDocumentBlob } from "@/lib/documents/storage";

// The PDF renderer (and react-pdf) are heavy and bring react-dom-server-like
// internals. We import them dynamically so they never enter the page's
// static module graph (which would trigger Next 16's
// "you're importing a component that imports react-dom/server" check).

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

export async function saveLeaseContractAction(formData: FormData) {
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

  const SUPPORTED_TYPES = [
    "bail_vide",
    "bail_meuble",
    "bail_civil",
    "bail_commercial",
  ];
  if (leaseError || !lease || !SUPPORTED_TYPES.includes(lease.type)) return;

  const property = Array.isArray(lease.properties)
    ? lease.properties[0]
    : lease.properties;
  const tenant = Array.isArray(lease.tenants)
    ? lease.tenants[0]
    : lease.tenants;

  // Landlord details via the SECURITY DEFINER RPC — profiles are private
  // (RLS), so a direct read returns nothing when the viewer didn't create
  // this property. See migration 0043_owner_contact_for_contract.sql.
  type OwnerContact = {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    phone: string | null;
  };
  let ownerProfile: OwnerContact | null = null;
  if (property?.owner_id) {
    const { data: ownerRows } = await session.supabase.rpc(
      "get_owner_contact",
      { p_owner_id: property.owner_id },
    );
    ownerProfile = (ownerRows as OwnerContact[] | null)?.[0] ?? null;
  }

  // Render the PDF buffer via dynamic import. Bail civil uses its own
  // renderer; bail vide / meublé share the loi Alur renderer.
  let pdfBuffer: Buffer;
  try {
    if (lease.type === "bail_civil") {
      const { renderCivilContractPdf } = await import("./contract-civil-pdf");
      pdfBuffer = await renderCivilContractPdf({
        lease,
        property,
        tenant,
        ownerProfile,
      });
    } else if (lease.type === "bail_commercial") {
      const { renderCommercialContractPdf } = await import(
        "./contract-commercial-pdf"
      );
      pdfBuffer = await renderCommercialContractPdf({
        lease,
        property,
        tenant,
        ownerProfile,
      });
    } else {
      const { renderContractPdf } = await import("./contract-pdf");
      pdfBuffer = await renderContractPdf({
        lease,
        property,
        tenant,
        ownerProfile,
      });
    }
  } catch (err) {
    console.error("[contract.save] PDF render failed:", err);
    return;
  }

  const tenantName = (tenant?.full_name as string | null) ?? "tenant";
  const startDate = (lease.start_date as string | null) ?? "";
  const filenameBase = `${tenantName}_${startDate}`
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
    console.error("[contract.save] upload failed:", err);
    return;
  }

  const { error: insertError } = await session.supabase
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
    });

  if (insertError) {
    console.error("[contract.save] insert failed:", insertError);
    return;
  }

  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(`/${locale}/dashboard/leases/${leaseId}/contract?saved=1`);
}
