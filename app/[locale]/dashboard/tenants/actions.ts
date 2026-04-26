"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

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

/**
 * Sends a Supabase invitation email so the tenant can set a password and
 * activate their account. Returns the new auth.users id, or null when the
 * invite couldn't be sent (no service-role key, duplicate email, etc.).
 * Failures are logged and do not block tenant creation.
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

  // Admins can pick any owner; everyone else owns the tenant they create.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId =
    session.role === "admin" && requestedOwnerId
      ? requestedOwnerId
      : session.user.id;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;

  let auth_user_id: string | null = null;
  if (email) {
    auth_user_id = await inviteTenant(email, fullName, locale);
  }

  const { error } = await session.supabase.from("tenants").insert({
    owner_id: ownerId,
    full_name: fullName,
    email,
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    auth_user_id,
  });

  if (error) return { error: error.message };

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

  const updates: Record<string, unknown> = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  // Only admins can reassign ownership.
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  if (session.role === "admin" && requestedOwnerId) {
    updates.owner_id = requestedOwnerId;
  }

  const { error } = await session.supabase
    .from("tenants")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/tenants`);
  redirect(`/${locale}/dashboard/tenants/${id}`);
}

export async function deleteTenantAction(formData: FormData) {
  const locale = getLocale(formData);
  const id = String(formData.get("id") ?? "");
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  await session.supabase.from("tenants").delete().eq("id", id);

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
