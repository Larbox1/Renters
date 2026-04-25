"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale } from "@/i18n/config";

export async function logoutAction(formData: FormData) {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}`);
}
