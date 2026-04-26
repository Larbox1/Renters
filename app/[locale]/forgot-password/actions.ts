"use server";

import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

export type ForgotPasswordState = {
  status: "idle" | "success" | "error";
  email?: string;
  error?: string;
};

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/${locale}/reset-password`,
  });

  if (error) {
    console.error("[forgot-password] Supabase error:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return { status: "error", error: error.message };
  }

  return { status: "success", email };
}
