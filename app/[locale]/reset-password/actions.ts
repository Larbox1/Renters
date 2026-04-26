"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

export type ResetPasswordState = {
  status: "idle" | "error";
  error?: string;
};

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  if (password.length < 6) {
    return { status: "error", error: "password_too_short" };
  }
  if (password !== confirm) {
    return { status: "error", error: "password_mismatch" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[reset-password] Supabase error:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return { status: "error", error: error.message };
  }

  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/dashboard`);
}
