"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

const ALLOWED_ROLES: readonly Role[] = [
  "admin",
  "owner",
  "tenant",
  "service_provider",
];

const SUSPEND_DURATION = "876000h"; // ~100 years — effectively indefinite

export type UserActionState = { error?: string };

function parseLocale(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function parseRole(value: unknown): Role {
  return ALLOWED_ROLES.includes(value as Role) ? (value as Role) : "tenant";
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "not_authenticated" };
  if (session.role !== "admin") return { ok: false, error: "not_admin" };
  if (!hasServiceRoleKey()) {
    return { ok: false, error: "service_role_key_missing" };
  }
  return { ok: true };
}

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const locale = parseLocale(formData);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = parseRole(formData.get("role"));

  if (!email || password.length < 6) {
    return { error: "invalid_input" };
  }

  const admin = createAdminClient();

  // Create the auth user (auto-confirmed so they can log in immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createErr || !created.user) {
    console.error("[users.create] createUser failed:", createErr);
    return { error: createErr?.message ?? "create_failed" };
  }

  // The on_auth_user_created trigger inserts a profiles row with role from
  // metadata (admin → tenant). Force the requested role + name explicitly.
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      { id: created.user.id, role, full_name: fullName || null },
      { onConflict: "id" },
    );

  if (profileErr) {
    console.error("[users.create] profile upsert failed:", profileErr);
    return { error: profileErr.message };
  }

  revalidatePath(`/${locale}/dashboard/users`);
  redirect(`/${locale}/dashboard/users`);
}

export async function updateUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const locale = parseLocale(formData);
  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = parseRole(formData.get("role"));

  if (!id) return { error: "missing_id" };

  const admin = createAdminClient();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ role, full_name: fullName || null })
    .eq("id", id);

  if (profileErr) {
    console.error("[users.update] profile update failed:", profileErr);
    return { error: profileErr.message };
  }

  // Keep user_metadata in sync so the role precedence chain stays correct.
  const { error: metaErr } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { full_name: fullName, role },
  });
  if (metaErr) {
    console.error("[users.update] user_metadata update failed:", metaErr);
  }

  revalidatePath(`/${locale}/dashboard/users`);
  redirect(`/${locale}/dashboard/users`);
}

export async function toggleSuspendUserAction(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) return;

  const locale = parseLocale(formData);
  const id = String(formData.get("id") ?? "");
  const isSuspended = String(formData.get("isSuspended") ?? "") === "true";
  if (!id) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: isSuspended ? "none" : SUSPEND_DURATION,
  });

  if (error) {
    console.error("[users.suspend] failed:", error);
  }

  revalidatePath(`/${locale}/dashboard/users`);
}

export async function deleteUserAction(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) return;

  const locale = parseLocale(formData);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error("[users.delete] failed:", error);
  }

  revalidatePath(`/${locale}/dashboard/users`);
}
