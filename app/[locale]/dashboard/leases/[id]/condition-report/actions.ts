"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import {
  uploadDocumentBlob,
  deleteDocument,
  uploadReportPhoto,
  reportPhotoPrefix,
  listDocumentPaths,
  deleteDocuments,
  deleteDocumentsByPrefix,
  downloadDocument,
  signDocument,
} from "@/lib/documents/storage";
import {
  buildDefaultRooms,
  buildMoveOutRooms,
  coerceKeys,
  coerceReportData,
  coerceRooms,
  collectPhotoPaths,
  defaultKeys,
  emptyMeters,
  MAX_PHOTOS_PER_REPORT,
  type ReportData,
  type ReportType,
} from "./report-shared";

// Post client-side compression a photo is a few hundred KB; this only guards
// against uncompressed originals slipping through.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

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

export async function createConditionReportAction(formData: FormData) {
  const locale = getLocale(formData);
  const leaseId = String(formData.get("lease_id") ?? "");
  const typeRaw = String(formData.get("report_type") ?? "");
  if (!leaseId || (typeRaw !== "move_in" && typeRaw !== "move_out")) return;
  const type = typeRaw as ReportType;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  const { data: lease } = await session.supabase
    .from("leases")
    .select("id, type, properties(id, bedrooms, bathrooms)")
    .eq("id", leaseId)
    .maybeSingle();
  if (!lease) return;

  // An open draft of the same type is resumed, not duplicated.
  const { data: existingDraft } = await session.supabase
    .from("condition_reports")
    .select("id")
    .eq("lease_id", leaseId)
    .eq("type", type)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingDraft) {
    redirect(
      `/${locale}/dashboard/leases/${leaseId}/condition-report/${existingDraft.id}`,
    );
  }

  const property = Array.isArray(lease.properties)
    ? lease.properties[0]
    : lease.properties;
  const labels = getDictionary(locale as Locale).leases.conditionReports
    .defaults;

  // Furnished leases get the mandatory furniture inventory as an extra
  // room-style section (décret n° 2015-981).
  const furnished = lease.type === "bail_meuble";
  let rooms = buildDefaultRooms(property ?? null, labels, furnished);
  let keys = defaultKeys(labels);

  if (type === "move_out") {
    // Seed from the latest completed move-in report so every element carries
    // its recorded entry state for the side-by-side comparison.
    const { data: moveIn } = await session.supabase
      .from("condition_reports")
      .select("rooms, keys")
      .eq("lease_id", leaseId)
      .eq("type", "move_in")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (moveIn) {
      rooms = buildMoveOutRooms(coerceRooms(moveIn.rooms, "move_in"));
      keys = coerceKeys(moveIn.keys);
    } else {
      rooms = buildMoveOutRooms(rooms);
    }
  }

  const { data: report, error } = await session.supabase
    .from("condition_reports")
    .insert({
      lease_id: leaseId,
      owner_id: session.user.id,
      type,
      report_date: toISODate(new Date()),
      meters: emptyMeters(),
      keys,
      rooms,
    })
    .select("id")
    .single();

  if (error || !report) {
    if (error) console.error("[condition-report.create] failed:", error);
    return;
  }

  revalidatePath(`/${locale}/dashboard/leases/${leaseId}`);
  redirect(
    `/${locale}/dashboard/leases/${leaseId}/condition-report/${report.id}`,
  );
}

export type SaveReportResult = { ok: boolean };

// Draft autosave — invoked directly from the editor (object payload, no form).
export async function saveConditionReport(input: {
  reportId: string;
  data: ReportData;
}): Promise<SaveReportResult> {
  const session = await getCurrentSession();
  if (!session || !isOwnerOrAdmin(session.role)) return { ok: false };

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("id, owner_id, type, status, report_date")
    .eq("id", input.reportId)
    .maybeSingle();
  if (!report || report.status !== "draft") return { ok: false };

  const data = coerceReportData(
    input.data,
    report.type as ReportType,
    report.report_date as string,
    `${reportPhotoPrefix(report.owner_id as string, report.id as string)}/`,
  );

  const { error } = await session.supabase
    .from("condition_reports")
    .update({
      report_date: data.report_date,
      meters: data.meters,
      keys: data.keys,
      rooms: data.rooms,
      notes: data.notes || null,
    })
    .eq("id", input.reportId)
    .eq("status", "draft");

  if (error) {
    console.error("[condition-report.save] failed:", error);
    return { ok: false };
  }
  return { ok: true };
}

export type UploadPhotoResult =
  | { ok: true; path: string; url: string | null; size: number }
  | { ok: false };

// Element photo upload — invoked directly from the editor with a FormData
// carrying the (client-compressed) image. The photo becomes durable once the
// draft referencing it is saved; unreferenced uploads are swept at finalize.
export async function uploadConditionReportPhoto(
  formData: FormData,
): Promise<UploadPhotoResult> {
  const reportId = String(formData.get("report_id") ?? "");
  const file = formData.get("file");
  if (
    !reportId ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_PHOTO_BYTES ||
    !file.type.startsWith("image/")
  ) {
    return { ok: false };
  }

  const session = await getCurrentSession();
  if (!session || !isOwnerOrAdmin(session.role)) return { ok: false };

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("id, owner_id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.status !== "draft") return { ok: false };

  const prefix = reportPhotoPrefix(
    report.owner_id as string,
    report.id as string,
  );
  const existing = await listDocumentPaths(prefix);
  if (existing.length >= MAX_PHOTOS_PER_REPORT) return { ok: false };

  try {
    const stored = await uploadReportPhoto(
      report.owner_id as string,
      report.id as string,
      file,
      file.name || "photo.jpg",
      file.type,
    );
    return {
      ok: true,
      path: stored.path,
      url: await signDocument(stored.path),
      size: stored.size,
    };
  } catch (err) {
    console.error("[condition-report.photo] upload failed:", err);
    return { ok: false };
  }
}

// Removes a photo's storage object; the editor drops it from its state and
// persists that on the next draft save.
export async function removeConditionReportPhoto(input: {
  reportId: string;
  path: string;
}): Promise<{ ok: boolean }> {
  const session = await getCurrentSession();
  if (!session || !isOwnerOrAdmin(session.role)) return { ok: false };

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("id, owner_id, status")
    .eq("id", input.reportId)
    .maybeSingle();
  if (!report || report.status !== "draft") return { ok: false };

  const prefix = reportPhotoPrefix(
    report.owner_id as string,
    report.id as string,
  );
  if (!input.path.startsWith(`${prefix}/`)) return { ok: false };

  await deleteDocuments([input.path]);
  return { ok: true };
}

export async function finalizeConditionReportAction(formData: FormData) {
  const locale = getLocale(formData);
  const reportId = String(formData.get("report_id") ?? "");
  if (!reportId) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("*, leases(*, properties(*), tenants(*))")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return;

  const lease = Array.isArray(report.leases) ? report.leases[0] : report.leases;
  if (!lease) return;
  const type = report.type as ReportType;
  const editorHref = `/${locale}/dashboard/leases/${lease.id}/condition-report/${reportId}`;

  if (report.status === "completed") redirect(editorHref);

  // The finalize form carries the editor's latest state so no draft-save race
  // can freeze stale content; fall back to the stored row if absent/corrupt.
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    payload = null;
  }
  const photoPrefix = reportPhotoPrefix(
    report.owner_id as string,
    report.id as string,
  );
  const data = coerceReportData(
    payload ?? {
      report_date: report.report_date,
      meters: report.meters,
      keys: report.keys,
      rooms: report.rooms,
      notes: report.notes ?? "",
    },
    type,
    report.report_date as string,
    `${photoPrefix}/`,
  );

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

  // Sweep photo objects no longer referenced by the report (uploaded then
  // removed from the form, or never saved), then download the referenced ones
  // for the PDF's photo annex.
  const referenced = new Set(collectPhotoPaths(data.rooms));
  const storedPaths = await listDocumentPaths(photoPrefix);
  const orphans = storedPaths.filter((p) => !referenced.has(p));
  if (orphans.length > 0) await deleteDocuments(orphans);

  const photoAnnex: Array<{
    room: string;
    element: string;
    images: Buffer[];
  }> = [];
  for (const room of data.rooms) {
    for (const element of room.elements) {
      const photos = element.photos ?? [];
      if (photos.length === 0) continue;
      const images = (
        await Promise.all(photos.map((photo) => downloadDocument(photo.path)))
      ).filter((buf): buf is Buffer => buf !== null);
      if (images.length > 0) {
        photoAnnex.push({ room: room.name, element: element.name, images });
      }
    }
  }

  let pdfBuffer: Buffer;
  try {
    const { renderConditionReportPdf } = await import("./report-pdf");
    pdfBuffer = await renderConditionReportPdf(
      { type, data, property, tenant, ownerProfile, photoAnnex },
      locale,
    );
  } catch (err) {
    console.error("[condition-report.finalize] PDF render failed:", err);
    return;
  }

  const tenantName = (tenant?.full_name as string | null) ?? "locataire";
  const kind = type === "move_in" ? "entree" : "sortie";
  const filenameBase = `etat_des_lieux_${kind}_${tenantName}_${data.report_date}`
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
    console.error("[condition-report.finalize] upload failed:", err);
    return;
  }

  const { data: document, error: docError } = await session.supabase
    .from("documents")
    .insert({
      owner_id: session.user.id,
      property_id: property?.id ?? null,
      lease_id: lease.id,
      name: stored.name,
      path: stored.path,
      mime_type: stored.mime_type,
      size: stored.size,
      source: "generated",
    })
    .select("id")
    .single();

  if (docError) {
    console.error("[condition-report.finalize] document insert failed:", docError);
    return;
  }

  const { error: updateError } = await session.supabase
    .from("condition_reports")
    .update({
      report_date: data.report_date,
      meters: data.meters,
      keys: data.keys,
      rooms: data.rooms,
      notes: data.notes || null,
      document_id: document.id,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("[condition-report.finalize] update failed:", updateError);
    return;
  }

  revalidatePath(`/${locale}/dashboard/leases/${lease.id}`);
  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(`${editorHref}?finalized=1`);
}

export async function reopenConditionReportAction(formData: FormData) {
  const locale = getLocale(formData);
  const reportId = String(formData.get("report_id") ?? "");
  if (!reportId) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("id, lease_id, status, document_id, documents(path)")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.status !== "completed") return;

  const { error } = await session.supabase
    .from("condition_reports")
    .update({ status: "draft", document_id: null, completed_at: null })
    .eq("id", reportId);
  if (error) {
    console.error("[condition-report.reopen] failed:", error);
    return;
  }

  // The frozen PDF no longer reflects an editable report — remove it.
  const doc = Array.isArray(report.documents)
    ? report.documents[0]
    : report.documents;
  const path = (doc as { path: string } | null)?.path ?? null;
  if (report.document_id) {
    await session.supabase
      .from("documents")
      .delete()
      .eq("id", report.document_id as string);
  }
  if (path) await deleteDocument(path);

  revalidatePath(`/${locale}/dashboard/leases/${report.lease_id}`);
  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(
    `/${locale}/dashboard/leases/${report.lease_id}/condition-report/${reportId}`,
  );
}

export async function deleteConditionReportAction(formData: FormData) {
  const locale = getLocale(formData);
  const reportId = String(formData.get("report_id") ?? "");
  const leaseId = String(formData.get("lease_id") ?? "");
  if (!reportId || !leaseId) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return;

  // Look up the linked document (and its storage path) before removing the
  // report, so we can clean up the generated PDF too.
  const { data: report } = await session.supabase
    .from("condition_reports")
    .select("id, owner_id, document_id, documents(path)")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return;

  const { data: deleted, error } = await session.supabase
    .from("condition_reports")
    .delete()
    .eq("id", reportId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    if (error) console.error("[condition-report.delete] failed:", error);
    return;
  }

  const doc = Array.isArray(report.documents)
    ? report.documents[0]
    : report.documents;
  const path = (doc as { path: string } | null)?.path ?? null;
  if (report.document_id) {
    await session.supabase
      .from("documents")
      .delete()
      .eq("id", report.document_id as string);
  }
  if (path) await deleteDocument(path);

  // Walkthrough photos live under the report's storage prefix — remove them
  // wholesale with the report.
  await deleteDocumentsByPrefix(
    reportPhotoPrefix(report.owner_id as string, report.id as string),
  );

  revalidatePath(`/${locale}/dashboard/leases/${leaseId}`);
  revalidatePath(`/${locale}/dashboard/documents`);
  redirect(`/${locale}/dashboard/leases/${leaseId}`);
}
