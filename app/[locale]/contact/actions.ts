"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export type ContactFormState = { ok?: boolean; error?: string };

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").slice(0, 10);

  if (
    !name ||
    name.length > 200 ||
    !email ||
    email.length > 320 ||
    !email.includes("@") ||
    !message ||
    message.length > 5000
  ) {
    return { error: "invalid" };
  }

  if (!hasSupabaseEnv()) return { error: "unavailable" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, message, locale });

  if (error) return { error: "unavailable" };
  return { ok: true };
}
