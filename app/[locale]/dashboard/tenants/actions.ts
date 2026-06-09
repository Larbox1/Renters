"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  uploadTenantDocument,
  deleteTenantDocument,
  MAX_DOC_BYTES,
} from "@/lib/tenants/documents";
import { checkStorageQuota } from "@/lib/storage/quota";

export type TenantState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function eurosToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function nullableString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed || null;
}

const TENANT_TYPES = ["particulier", "societe"] as const;
const CIVILITES = ["mr", "mrs"] as const;
const ID_DOC_TYPES = [
  "id_card",
  "passport",
  "driver_license",
  "residence_permit",
] as const;

function nullableEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
): T | null {
  const trimmed = raw.trim();
  return (allowed as readonly string[]).includes(trimmed)
    ? (trimmed as T)
    : null;
}

/**
 * Reads tenant_type plus the branch-specific fields. The four shared
 * person columns (civilite, date_of_birth, place_of_birth, nationality)
 * describe the tenant when type=particulier and the legal representative
 * when type=societe. Branch-exclusive columns are nulled when the type
 * doesn't match, so switching type cleans up stale data.
 */
function readExtendedFields(formData: FormData) {
  const tenantType = nullableEnum(
    String(formData.get("tenant_type") ?? ""),
    TENANT_TYPES,
  );

  // Read the four shared person fields once. They describe the tenant for
  // particulier, the legal representative for societe.
  const sharedPerson = {
    civilite: nullableEnum(String(formData.get("civilite") ?? ""), CIVILITES),
    date_of_birth: nullableString(String(formData.get("date_of_birth") ?? "")),
    place_of_birth: nullableString(
      String(formData.get("place_of_birth") ?? ""),
    ),
    nationality: nullableString(String(formData.get("nationality") ?? "")),
  };

  // ID document fields are now shared too: they describe either the tenant
  // (particulier) or the legal representative (societe). The uploaded file
  // path/name is handled separately in the create/update actions.
  const sharedIdDocument = {
    id_document_type: nullableEnum(
      String(formData.get("id_document_type") ?? ""),
      ID_DOC_TYPES,
    ),
    id_document_number: nullableString(
      String(formData.get("id_document_number") ?? ""),
    ),
    id_document_expiration: nullableString(
      String(formData.get("id_document_expiration") ?? ""),
    ),
  };

  const nullParticulierOnly = {
    profession: null,
    income_cents: null,
    previous_address: null,
    previous_city: null,
    previous_postal_code: null,
    previous_country: null,
  };
  const nullSocieteOnly = {
    siren: null,
    vat_number: null,
    capital_cents: null,
    business_sector: null,
    legal_rep_first_name: null,
    legal_rep_last_name: null,
  };

  if (tenantType === "particulier") {
    return {
      tenant_type: tenantType,
      ...sharedPerson,
      ...sharedIdDocument,
      profession: nullableString(String(formData.get("profession") ?? "")),
      income_cents: eurosToCents(String(formData.get("income_cents") ?? "")),
      previous_address: nullableString(
        String(formData.get("previous_address") ?? ""),
      ),
      previous_city: nullableString(
        String(formData.get("previous_city") ?? ""),
      ),
      previous_postal_code: nullableString(
        String(formData.get("previous_postal_code") ?? ""),
      ),
      previous_country: nullableString(
        String(formData.get("previous_country") ?? ""),
      ),
      ...nullSocieteOnly,
    };
  }

  if (tenantType === "societe") {
    return {
      tenant_type: tenantType,
      ...sharedPerson,
      ...sharedIdDocument,
      ...nullParticulierOnly,
      siren: nullableString(String(formData.get("siren") ?? "")),
      vat_number: nullableString(String(formData.get("vat_number") ?? "")),
      capital_cents: eurosToCents(String(formData.get("capital_cents") ?? "")),
      business_sector: nullableString(
        String(formData.get("business_sector") ?? ""),
      ),
      legal_rep_first_name: nullableString(
        String(formData.get("legal_rep_first_name") ?? ""),
      ),
      legal_rep_last_name: nullableString(
        String(formData.get("legal_rep_last_name") ?? ""),
      ),
    };
  }

  // No type selected — clear everything that isn't the basic contact info.
  return {
    tenant_type: tenantType,
    civilite: null,
    date_of_birth: null,
    place_of_birth: null,
    nationality: null,
    id_document_type: null,
    id_document_number: null,
    id_document_expiration: null,
    ...nullParticulierOnly,
    ...nullSocieteOnly,
  };
}

function readUploadedFile(formData: FormData): File | null {
  const v = formData.get("id_document_file");
  if (v instanceof File && v.size > 0) return v;
  return null;
}

/**
 * Sends a Supabase invitation email so the tenant can set a password and
 * activate their account. Returns the new auth.users id, or null when the
 * invite couldn't be sent (no service-role key, duplicate email, etc.).
 */
async function inviteTenant(
  email: string,
  fullName: string,
  locale: string,
): Promise<string | null> {
  if (!hasServiceRoleKey()) {
    console.warn(
      "[tenants.invite] SUPABASE_SERVICE_ROLE_KEY not set; skipping invitation",
    );
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: "tenant" },
    redirectTo: `${getSiteUrl()}/auth/callback?next=/${locale}/reset-password`,
  });

  if (error) {
    console.error("[tenants.invite] failed:", error);
    return null;
  }

  return data.user?.id ?? null;
}

export async function createTenantAction(
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId =
    session.role === "admin" && requestedOwnerId
      ? requestedOwnerId
      : session.user.id;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;

  const file = readUploadedFile(formData);
  if (file && file.size > MAX_DOC_BYTES) {
    return { error: "document_too_large" };
  }
  if (file) {
    const quotaError = await checkStorageQuota(session, file.size);
    if (quotaError) return { error: quotaError };
  }

  // Pre-allocate the tenant id so the storage path can include it before
  // the row exists (matches the property-photos pattern).
  const tenantId = crypto.randomUUID();
  let uploaded: { path: string; name: string } | null = null;
  if (file) {
    try {
      uploaded = await uploadTenantDocument(file, tenantId);
    } catch (err) {
      console.error("[tenants.create] document upload failed:", err);
      return {
        error: err instanceof Error ? err.message : "upload_failed",
      };
    }
  }

  let auth_user_id: string | null = null;
  if (email) {
    auth_user_id = await inviteTenant(email, fullName, locale);
  }

  const { error } = await session.supabase.from("tenants").insert({
    id: tenantId,
    owner_id: ownerId,
    full_name: fullName,
    email,
    phone: nullableString(String(formData.get("phone") ?? "")),
    notes: nullableString(String(formData.get("notes") ?? "")),
    auth_user_id,
    ...readExtendedFields(formData),
    id_document_path: uploaded?.path ?? null,
    id_document_name: uploaded?.name ?? null,
  });

  if (error) {
    if (uploaded) await deleteTenantDocument(uploaded.path);
    return { error: error.message };
  }

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants`);
}

export async function updateTenantAction(
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const file = readUploadedFile(formData);
  if (file && file.size > MAX_DOC_BYTES) {
    return { error: "document_too_large" };
  }
  if (file) {
    const quotaError = await checkStorageQuota(session, file.size);
    if (quotaError) return { error: quotaError };
  }

  // Look up the existing path so we can replace it cleanly.
  const { data: current } = await session.supabase
    .from("tenants")
    .select("id_document_path")
    .eq("id", id)
    .maybeSingle();
  const previousPath = (current?.id_document_path ?? null) as string | null;

  let uploaded: { path: string; name: string } | null = null;
  if (file) {
    try {
      uploaded = await uploadTenantDocument(file, id);
    } catch (err) {
      console.error("[tenants.update] document upload failed:", err);
      return {
        error: err instanceof Error ? err.message : "upload_failed",
      };
    }
  }

  const updates: Record<string, unknown> = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: nullableString(String(formData.get("email") ?? "")),
    phone: nullableString(String(formData.get("phone") ?? "")),
    notes: nullableString(String(formData.get("notes") ?? "")),
    ...readExtendedFields(formData),
  };

  // Only overwrite the document fields when a new file was actually picked.
  if (uploaded) {
    updates.id_document_path = uploaded.path;
    updates.id_document_name = uploaded.name;
  }

  // Only admins can reassign ownership.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  if (session.role === "admin" && requestedOwnerId) {
    updates.owner_id = requestedOwnerId;
  }

  const { error } = await session.supabase
    .from("tenants")
    .update(updates)
    .eq("id", id);

  if (error) {
    if (uploaded) await deleteTenantDocument(uploaded.path);
    return { error: error.message };
  }

  // Best-effort: drop the previous document now that the new one is referenced.
  if (uploaded && previousPath && previousPath !== uploaded.path) {
    await deleteTenantDocument(previousPath);
  }

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants/${id}`);
}

export async function deleteTenantAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  // A tenant linked to any lease cannot be deleted (leases.tenant_id is
  // ON DELETE RESTRICT). Guard here so the user gets a clear redirect instead
  // of a silent FK failure.
  const { count: leaseCount } = await session.supabase
    .from("leases")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", id);
  if ((leaseCount ?? 0) > 0) {
    redirect(`/${locale}/dashboard/tenants/${id}`);
  }

  // Grab the document path so we can clean up storage after the row is gone.
  const { data: current } = await session.supabase
    .from("tenants")
    .select("id_document_path")
    .eq("id", id)
    .maybeSingle();
  const path = (current?.id_document_path ?? null) as string | null;

  const { error } = await session.supabase.from("tenants").delete().eq("id", id);

  if (!error && path) {
    await deleteTenantDocument(path);
  }

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants`);
}

export async function resendTenantInviteAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  // RLS-gated read: confirms the caller can access this tenant before we
  // expose the email to any external API.
  const { data: tenant } = await session.supabase
    .from("tenants")
    .select("id, email, full_name, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!tenant?.email) return;
  if (!hasServiceRoleKey()) {
    console.warn("[tenants.resend] SUPABASE_SERVICE_ROLE_KEY not set");
    return;
  }

  // Fast path: never invited — send a fresh invite, store the new auth_user_id.
  if (!tenant.auth_user_id) {
    const newAuthUserId = await inviteTenant(
      tenant.email,
      tenant.full_name,
      locale,
    );
    if (newAuthUserId) {
      await session.supabase
        .from("tenants")
        .update({ auth_user_id: newAuthUserId })
        .eq("id", id);
    }
    revalidatePath(`/${locale}/dashboard/tenants/${id}`);
    return;
  }

  // Already invited — Supabase rejects a second invite to the same address.
  // Send a recovery email instead so the tenant can (re)set their password.
  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(tenant.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/${locale}/reset-password`,
  });
  if (error) {
    console.error("[tenants.resend] resetPasswordForEmail failed:", error);
  }

  revalidatePath(`/${locale}/dashboard/tenants/${id}`);
}
