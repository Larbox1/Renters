"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { isOperationCountry } from "@/lib/operation-country";

export type OnboardingRole = "owner" | "tenant";
export type OnboardingState = { status: "idle" | "error"; error?: string };

const ALLOWED_ROLES: readonly OnboardingRole[] = ["owner", "tenant"];

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const role = String(formData.get("role") ?? "");
  const countryRaw = String(formData.get("operation_country") ?? "");

  if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
    return { status: "error", error: "invalid_role" };
  }
  const country =
    role === "owner" && isOperationCountry(countryRaw) ? countryRaw : "FR";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // One-shot server-side (0071): refuses once onboarded_at is set, so this
  // action can never be replayed to switch roles later.
  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: role,
    p_country: country,
  });
  if (error && !error.message.includes("already_onboarded")) {
    return { status: "error", error: error.message };
  }

  redirect(`/${locale}/dashboard`);
}

export async function signOutAction(formData: FormData) {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
