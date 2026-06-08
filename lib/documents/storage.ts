import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const DOCUMENTS_BUCKET = "documents";
export const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25 MB
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type StoredDocument = {
  path: string;
  name: string;
  mime_type: string;
  size: number;
};

/**
 * Uploads an arbitrary blob (or File) to the documents bucket scoped to the
 * given owner id. Returns the storage path + metadata to persist on the
 * `documents` row.
 */
export async function uploadDocumentBlob(
  ownerId: string,
  body: Blob | File,
  filename: string,
  mimeType: string,
): Promise<StoredDocument> {
  if (!hasServiceRoleKey()) {
    throw new Error(
      "Document uploads require SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const admin = createAdminClient();
  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const path = `${ownerId}/${Date.now()}-${safeName}`;
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, body, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("[documents.upload] failed:", error);
    throw error;
  }
  const size = body.size;
  return { path, name: filename, mime_type: mimeType, size };
}

export async function deleteDocument(path: string): Promise<void> {
  if (!path || !hasServiceRoleKey()) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(DOCUMENTS_BUCKET).remove([path]);
  } catch (err) {
    console.error("[documents.delete] failed:", err);
  }
}

export async function signDocument(
  path: string,
): Promise<string | null> {
  if (!path || !hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
}