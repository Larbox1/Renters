"use server";

import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

export type SignupRole = "owner" | "tenant" | "service_provider";
export type SignupState = {
  status: "idle" | "success" | "error";
  email?: string;
  error?: string;
};

const ALLOWED_ROLES: readonly SignupRole[] = [
  "owner",
  "tenant",
  "service_provider",
];

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const role: SignupRole = (ALLOWED_ROLES as readonly string[]).includes(roleRaw)
    ? (roleRaw as SignupRole)
    : "tenant";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/${locale}/dashboard`,
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    console.error("[signup] Supabase error:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return { status: "error", error: error.message };
  }

  return { status: "success", email };
}
