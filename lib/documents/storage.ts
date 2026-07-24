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

/**
 * Uploads a condition-report element photo under the report's dedicated
 * prefix: <ownerId>/edl/<reportId>/… Objects there are report internals —
 * referenced from the report's JSONB, never from a `documents` row — and are
 * removed wholesale via deleteDocumentsByPrefix when the report goes away.
 * Living in the documents bucket keeps them inside the owner's storage quota.
 */
export function reportPhotoPrefix(ownerId: string, reportId: string): string {
  return `${ownerId}/edl/${reportId}`;
}

export async function uploadReportPhoto(
  ownerId: string,
  reportId: string,
  body: Blob | File,
  filename: string,
  mimeType: string,
): Promise<StoredDocument> {
  if (!hasServiceRoleKey()) {
    throw new Error("Photo uploads require SUPABASE_SERVICE_ROLE_KEY");
  }
  const admin = createAdminClient();
  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const path = `${reportPhotoPrefix(ownerId, reportId)}/${Date.now()}-${safeName}`;
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, body, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("[documents.uploadReportPhoto] failed:", error);
    throw error;
  }
  return { path, name: filename, mime_type: mimeType, size: body.size };
}

/** Lists the storage paths of every object under a folder prefix. */
export async function listDocumentPaths(prefix: string): Promise<string[]> {
  if (!prefix || !hasServiceRoleKey()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) {
    console.error("[documents.list] failed:", error);
    return [];
  }
  return (data ?? [])
    .filter((entry) => entry.name && entry.id) // folders have no id
    .map((entry) => `${prefix}/${entry.name}`);
}

export async function deleteDocuments(paths: string[]): Promise<void> {
  if (paths.length === 0 || !hasServiceRoleKey()) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(DOCUMENTS_BUCKET).remove(paths);
  } catch (err) {
    console.error("[documents.deleteMany] failed:", err);
  }
}

export async function deleteDocumentsByPrefix(prefix: string): Promise<void> {
  const paths = await listDocumentPaths(prefix);
  await deleteDocuments(paths);
}

export async function downloadDocument(path: string): Promise<Buffer | null> {
  if (!path || !hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .download(path);
  if (error || !data) {
    if (error) console.error("[documents.download] failed:", error);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
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