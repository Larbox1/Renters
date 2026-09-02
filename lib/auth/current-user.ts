import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  getAdminEmails,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import {
  isOperationCountry,
  type OperationCountry,
} from "@/lib/operation-country";

export type Role = "admin" | "owner" | "tenant" | "service_provider";

export type Profile = {
  role: Role;
  full_name: string | null;
  operation_country?: OperationCountry | null;
  avatar_url?: string | null;
};

export type CurrentSession = {
  supabase: SupabaseClient;
  user: User;
  profile: Profile | null;
  role: Role;
  fullName: string;
  /** Profile picture: uploaded avatar first, then the auth provider's. */
  avatarUrl: string | null;
  hasProfile: boolean;
  operationCountry: OperationCountry;
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
    return {
      role: "admin",
      full_name: fullName,
      avatar_url: profile?.avatar_url ?? null,
    };
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
    .select("role, full_name, operation_country, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const profile = await bootstrapAdmin(user, rawProfile);

  // profile.role is the only source of truth. user_metadata.role is
  // client-writable (auth.updateUser) and must never grant privilege; a
  // missing profile row degrades to the least-privileged role.
  const role: Role = profile?.role ?? "tenant";

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
    avatarUrl:
      profile?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null) ??
      (typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null),
    hasProfile: profile !== null,
    operationCountry: isOperationCountry(profile?.operation_country)
      ? profile.operation_country
      : "FR",
  };
}

export function isOwnerOrAdmin(role: Role): boolean {
  return role === "owner" || role === "admin";
}
