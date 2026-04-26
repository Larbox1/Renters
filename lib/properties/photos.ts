import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const PHOTOS_BUCKET = "property-photos";
export const MAX_PHOTOS = 6;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // 15 MB
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type PropertyPhoto = {
  path: string;
  name: string;
  mime_type: string;
  size: number;
};

export type SignedPhoto = PropertyPhoto & {
  signedUrl: string | null;
};

export async function uploadPhotos(
  files: File[],
  propertyId: string,
): Promise<PropertyPhoto[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length === 0) return [];
  if (!hasServiceRoleKey()) {
    throw new Error("Photo uploads require SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createAdminClient();
  const out: PropertyPhoto[] = [];
  for (const file of real) {
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${propertyId}/${Date.now()}-${safeName}`;
    const { error } = await admin.storage
      .from(PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[photos.upload] failed:", error);
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

export async function deletePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0 || !hasServiceRoleKey()) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(PHOTOS_BUCKET).remove(paths);
  } catch (err) {
    console.error("[photos.delete] failed:", err);
  }
}

/**
 * Generates short-lived signed URLs for the given photos. Returns objects
 * with `signedUrl` filled in (null on failure for that file).
 */
export async function signPhotos(
  photos: PropertyPhoto[],
): Promise<SignedPhoto[]> {
  if (photos.length === 0) return [];
  if (!hasServiceRoleKey()) {
    return photos.map((p) => ({ ...p, signedUrl: null }));
  }
  const admin = createAdminClient();
  const out: SignedPhoto[] = [];
  for (const p of photos) {
    const { data, error } = await admin.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(p.path, SIGNED_URL_TTL_SECONDS);
    out.push({
      ...p,
      signedUrl: error ? null : (data?.signedUrl ?? null),
    });
  }
  return out;
}

/** Convenience: signs only the first photo (cheap when you only need a cover). */
export async function signFirstPhoto(
  photos: PropertyPhoto[],
): Promise<SignedPhoto | null> {
  if (photos.length === 0) return null;
  const [signed] = await signPhotos([photos[0]]);
  return signed ?? null;
}
