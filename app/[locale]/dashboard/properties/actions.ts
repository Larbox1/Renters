"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import {
  uploadPhotos,
  deletePhotos,
  MAX_PHOTOS,
  MAX_TOTAL_BYTES,
  type PropertyPhoto,
} from "@/lib/properties/photos";

export type PropertyState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function eurosToCents(raw: string): number | null {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parsePositiveInt(raw: string): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return null;
  return n;
}

function parseBool(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

const ALLOWED_TYPES = [
  "apartment",
  "house",
  "studio",
  "commercial",
  "land",
  "other",
] as const;

function parseType(raw: string): string | null {
  return (ALLOWED_TYPES as readonly string[]).includes(raw) ? raw : null;
}

function readExtendedFields(formData: FormData) {
  return {
    description:
      String(formData.get("description") ?? "").trim() || null,
    type: parseType(String(formData.get("type") ?? "").trim()),
    surface_sqm: parsePositiveInt(
      String(formData.get("surface_sqm") ?? "").trim(),
    ),
    rooms: parsePositiveInt(String(formData.get("rooms") ?? "").trim()),
    bedrooms: parsePositiveInt(String(formData.get("bedrooms") ?? "").trim()),
    parking: parseBool(formData, "parking"),
    basement: parseBool(formData, "basement"),
    to_rent: parseBool(formData, "to_rent"),
    to_sell: parseBool(formData, "to_sell"),
  };
}

function readNewPhotos(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

function readKeepPaths(formData: FormData): Set<string> {
  return new Set(formData.getAll("keep_paths").map(String));
}

function totalBytes(kept: PropertyPhoto[], files: File[]): number {
  return (
    kept.reduce((s, p) => s + p.size, 0) + files.reduce((s, f) => s + f.size, 0)
  );
}

export async function createPropertyAction(
  _prev: PropertyState,
  formData: FormData,
): Promise<PropertyState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;
  const valueRaw = String(formData.get("value_cents") ?? "").trim();
  const valueCents = valueRaw ? eurosToCents(valueRaw) : null;
  const sellPriceRaw = String(formData.get("sell_price_cents") ?? "").trim();
  const sellPriceCents = sellPriceRaw ? eurosToCents(sellPriceRaw) : null;

  // Admins can pick any owner; everyone else owns the property they create.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId =
    session.role === "admin" && requestedOwnerId
      ? requestedOwnerId
      : session.user.id;

  // Photos: pre-allocate the property id so storage paths are scoped to it.
  const newFiles = readNewPhotos(formData);
  if (newFiles.length > MAX_PHOTOS) {
    return { error: "too_many_photos" };
  }
  if (totalBytes([], newFiles) > MAX_TOTAL_BYTES) {
    return { error: "photos_too_large" };
  }
  const propertyId = crypto.randomUUID();
  let uploaded: PropertyPhoto[] = [];
  if (newFiles.length > 0) {
    try {
      uploaded = await uploadPhotos(newFiles, propertyId);
    } catch (err) {
      console.error("[properties.create] photo upload failed:", err);
      return {
        error: err instanceof Error ? err.message : "upload_failed",
      };
    }
  }

  const { error } = await session.supabase.from("properties").insert({
    id: propertyId,
    owner_id: ownerId,
    label: String(formData.get("label") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    country: String(formData.get("country") ?? "FR").trim() || "FR",
    monthly_rent_cents: rentCents,
    value_cents: valueCents,
    sell_price_cents: sellPriceCents,
    photos: uploaded,
    ...readExtendedFields(formData),
  });

  if (error) {
    // Roll back uploaded files so we don't leave orphans.
    if (uploaded.length > 0) {
      await deletePhotos(uploaded.map((p) => p.path));
    }
    return { error: error.message };
  }

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties`);
}

export async function updatePropertyAction(
  _prev: PropertyState,
  formData: FormData,
): Promise<PropertyState> {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const rentRaw = String(formData.get("monthly_rent_cents") ?? "").trim();
  const rentCents = rentRaw ? eurosToCents(rentRaw) : null;
  const valueRaw = String(formData.get("value_cents") ?? "").trim();
  const valueCents = valueRaw ? eurosToCents(valueRaw) : null;
  const sellPriceRaw = String(formData.get("sell_price_cents") ?? "").trim();
  const sellPriceCents = sellPriceRaw ? eurosToCents(sellPriceRaw) : null;

  // Photos: reconcile keep_paths + new files against the existing array.
  const newFiles = readNewPhotos(formData);
  const keepPaths = readKeepPaths(formData);

  const { data: current } = await session.supabase
    .from("properties")
    .select("photos")
    .eq("id", id)
    .maybeSingle();
  const existingPhotos = (current?.photos ?? []) as PropertyPhoto[];

  const kept = existingPhotos.filter((p) => keepPaths.has(p.path));
  const removed = existingPhotos.filter((p) => !keepPaths.has(p.path));

  if (kept.length + newFiles.length > MAX_PHOTOS) {
    return { error: "too_many_photos" };
  }
  if (totalBytes(kept, newFiles) > MAX_TOTAL_BYTES) {
    return { error: "photos_too_large" };
  }

  let uploaded: PropertyPhoto[] = [];
  if (newFiles.length > 0) {
    try {
      uploaded = await uploadPhotos(newFiles, id);
    } catch (err) {
      console.error("[properties.update] photo upload failed:", err);
      return {
        error: err instanceof Error ? err.message : "upload_failed",
      };
    }
  }

  const updates: Record<string, unknown> = {
    label: String(formData.get("label") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    country: String(formData.get("country") ?? "FR").trim() || "FR",
    monthly_rent_cents: rentCents,
    value_cents: valueCents,
    sell_price_cents: sellPriceCents,
    photos: [...kept, ...uploaded],
    ...readExtendedFields(formData),
  };

  // Only admins can reassign ownership.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  if (session.role === "admin" && requestedOwnerId) {
    updates.owner_id = requestedOwnerId;
  }

  const { error } = await session.supabase
    .from("properties")
    .update(updates)
    .eq("id", id);

  if (error) {
    // Roll back the just-uploaded files since the row didn't change.
    if (uploaded.length > 0) {
      await deletePhotos(uploaded.map((p) => p.path));
    }
    return { error: error.message };
  }

  // Best-effort: drop files that the user removed.
  if (removed.length > 0) {
    await deletePhotos(removed.map((p) => p.path));
  }

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties/${id}`);
}

export async function deletePropertyAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  // Grab photo paths first so we can clean up storage after the row is gone.
  const { data: current } = await session.supabase
    .from("properties")
    .select("photos")
    .eq("id", id)
    .maybeSingle();
  const photos = (current?.photos ?? []) as PropertyPhoto[];

  const { error } = await session.supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (!error && photos.length > 0) {
    await deletePhotos(photos.map((p) => p.path));
  }

  revalidatePath(`/${locale}/dashboard/properties`);
  redirect(`/${locale}/dashboard/properties`);
}
