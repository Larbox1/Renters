import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getAdminEmails,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";

export type Role = "admin" | "owner" | "tenant" | "service_provider";

const VALID_ROLES: readonly Role[] = [
  "admin",
  "owner",
  "tenant",
  "service_provider",
];

function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    (VALID_ROLES as readonly string[]).includes(value)
  );
}

export type Profile = {
  role: Role;
  full_name: string | null;
};

export type CurrentSession = {
  supabase: SupabaseClient;
  user: User;
  profile: Profile | null;
  role: Role;
  fullName: string;
  hasProfile: boolean;
};

/**
 * Promotes the current user to admin in the DB if their email appears in
 * ADMIN_EMAILS and SUPABASE_SERVICE_ROLE_KEY is configured. Idempotent —
 * skips the write when the user is already admin. Returns the (possibly
 * updated) profile.
 */
async function bootstrapAdmin(
  user: User,
  profile: Profile | null,
): Promise<Profile | null> {
  const userEmail = user.email?.toLowerCase();
  if (!userEmail) return profile;

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(userEmail)) return profile;

  if (profile?.role === "admin") return profile;

  if (!hasServiceRoleKey()) {
    console.warn(
      `[admin-bootstrap] ${userEmail} is in ADMIN_EMAILS but SUPABASE_SERVICE_ROLE_KEY is not set; cannot promote.`,
    );
    return profile;
  }

  try {
    const adminClient = createAdminClient();
    const fullName =
      profile?.full_name ?? user.user_metadata?.full_name ?? null;
    const { error } = await adminClient.from("profiles").upsert(
      { id: user.id, role: "admin", full_name: fullName },
      { onConflict: "id" },
    );
    if (error) {
      console.error("[admin-bootstrap] upsert failed:", error);
      return profile;
    }
    return { role: "admin", full_name: fullName };
  } catch (err) {
    console.error("[admin-bootstrap] unexpected error:", err);
    return profile;
  }
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const profile = await bootstrapAdmin(user, rawProfile);

  // Role precedence:
  //   1. profile.role — source of truth (set by trigger, admin promotion,
  //      or ADMIN_EMAILS bootstrap).
  //   2. user_metadata.role — what the user picked at signup. Recovers when
  //      the auto-create-profile trigger never fired (e.g. migration 0001
  //      applied after signup), so we don't silently downgrade an owner.
  //   3. "tenant" — least-privileged last resort if nothing is known.
  const metaRole = user.user_metadata?.role;
  const role: Role =
    profile?.role ?? (isRole(metaRole) ? metaRole : "tenant");

  return {
    supabase,
    user,
    profile,
    role,
    fullName:
      profile?.full_name ??
      user.user_metadata?.full_name ??
      user.email ??
      "",
    hasProfile: profile !== null,
  };
}

export function isOwnerOrAdmin(role: Role): boolean {
  return role === "owner" || role === "admin";
}
