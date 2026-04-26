import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // Role precedence:
  //   1. profile.role — source of truth (set by trigger or admin promotion).
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
