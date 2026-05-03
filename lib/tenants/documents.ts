import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const TENANT_DOCS_BUCKET = "tenant-documents";
export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type TenantDocument = {
  path: string;
  name: string;
};

export type SignedTenantDocument = TenantDocument & {
  signedUrl: string | null;
};

export async function uploadTenantDocument(
  file: File,
  tenantId: string,
): Promise<TenantDocument> {
  if (!hasServiceRoleKey()) {
    throw new Error(
      "Tenant document uploads require SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const admin = createAdminClient();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${tenantId}/${Date.now()}-${safeName}`;
  const { error } = await admin.storage
    .from(TENANT_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[tenants.document] upload failed:", error);
    throw error;
  }
  return { path, name: file.name };
}

export async function deleteTenantDocument(path: string): Promise<void> {
  if (!path || !hasServiceRoleKey()) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(TENANT_DOCS_BUCKET).remove([path]);
  } catch (err) {
    console.error("[tenants.document] delete failed:", err);
  }
}

export async function signTenantDocument(
  doc: TenantDocument | null,
): Promise<SignedTenantDocument | null> {
  if (!doc) return null;
  if (!hasServiceRoleKey()) return { ...doc, signedUrl: null };
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(TENANT_DOCS_BUCKET)
    .createSignedUrl(doc.path, SIGNED_URL_TTL_SECONDS);
  return { ...doc, signedUrl: error ? null : (data?.signedUrl ?? null) };
}
