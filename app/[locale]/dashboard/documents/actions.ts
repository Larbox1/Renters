"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import {
  uploadDocumentBlob,
  deleteDocument,
  MAX_DOC_BYTES,
} from "@/lib/documents/storage";

export type DocumentState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

export async function uploadDocumentAction(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) return { error: "forbidden" };

  const propertyId = String(formData.get("property_id") ?? "").trim();
  if (!propertyId) return { error: "property_required" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "file_required" };
  }
  if (file.size > MAX_DOC_BYTES) return { error: "file_too_large" };

  // Confirm caller owns the property (RLS would catch this on insert too,
  // but failing fast lets us produce a clearer error).
  const { data: prop } = await session.supabase
    .from("properties")
    .select("id, owner_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (!prop) return { error: "property_not_found" };

  const customName = String(formData.get("name") ?? "").trim();
  const filename = customName || file.name;

  let stored;
  try {
    stored = await uploadDocumentBlob(
      session.user.id,
      file,
      filename,
      file.type || "application/octet-stream",
    );
  } catch (err) {
    console.error("[documents.upload] failed:", err);
    return { error: err instanceof Error ? err.message : "upload_failed" };
  }

  const { error: insertError } = await session.supabase
    .from("documents")
    .insert({
      owner_id: session.user.id,
      property_id: propertyId,
      lease_id: null,
      name: stored.name,
      path: stored.path,
      mime_type: stored.mime_type,
      size: stored.size,
      source: "uploaded",
    });

  if (insertError) {
    await deleteDocument(stored.path);
    return { error: insertError.message };
  }

  revalidatePath(`/${locale}/dashboard/documents`);
  return {};
}

export async function deleteDocumentAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const { data: doc } = await session.supabase
    .from("documents")
    .select("id, path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return;

  const { error } = await session.supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (!error && doc.path) {
    await deleteDocument(doc.path as string);
  }

  revalidatePath(`/${locale}/dashboard/documents`);
}