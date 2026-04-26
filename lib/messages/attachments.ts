import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const ATTACHMENTS_BUCKET = "message-attachments";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_MESSAGE = 5;
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type StoredAttachment = {
  path: string;
  name: string;
  mime_type: string;
  size: number;
};

export type SignedAttachment = StoredAttachment & {
  signedUrl: string | null;
};

/**
 * Uploads files to the attachments bucket under a folder named for the
 * message id. Returns the persisted attachment records (paths, names, sizes,
 * mime types). Throws on upload failure so the caller can roll back.
 */
export async function uploadAttachments(
  files: File[],
  messageId: string,
): Promise<StoredAttachment[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length === 0) return [];
  if (!hasServiceRoleKey()) {
    throw new Error("File uploads require SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createAdminClient();
  const out: StoredAttachment[] = [];
  for (const file of real) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("file_too_large");
    }
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${messageId}/${Date.now()}-${safeName}`;
    const { error } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[attachments.upload] failed:", error);
      throw error;
    }
    out.push({
      path,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
    });
  }
  return out;
}

/**
 * Generates a short-lived signed URL for each attachment (private bucket).
 * Returns objects with signedUrl filled in (null on failure for that file).
 */
export async function signAttachments(
  attachments: StoredAttachment[],
): Promise<SignedAttachment[]> {
  if (attachments.length === 0) return [];
  if (!hasServiceRoleKey()) {
    return attachments.map((a) => ({ ...a, signedUrl: null }));
  }
  const admin = createAdminClient();
  const out: SignedAttachment[] = [];
  for (const a of attachments) {
    const { data, error } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(a.path, SIGNED_URL_TTL_SECONDS);
    out.push({
      ...a,
      signedUrl: error ? null : (data?.signedUrl ?? null),
    });
  }
  return out;
}
