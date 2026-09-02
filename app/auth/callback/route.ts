import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { defaultLocale } from "@/i18n/config";
import { isOperationCountry } from "@/lib/operation-country";

const SIGNUP_ROLES = ["owner", "tenant", "service_provider"] as const;

// A user whose auth record is younger than this just signed up through this
// very OAuth round-trip; older accounts are returning users whose profile
// must not be touched by signup-page parameters.
const NEW_USER_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? `/${defaultLocale}/dashboard`;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : `/${defaultLocale}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.session?.user;
      const role = searchParams.get("signup_role");
      const country = searchParams.get("signup_country");
      const isNewUser =
        user &&
        Date.now() - new Date(user.created_at).getTime() < NEW_USER_WINDOW_MS;

      // OAuth signups can't carry metadata the way email signups do, so the
      // profile trigger defaulted them to tenant/FR. Apply what the user
      // picked on the signup form. Never grants admin: the role is checked
      // against the same public list the signup form offers. Must go through
      // the admin client — profiles.role is trigger-locked (0065) against
      // non-service-role writes.
      if (isNewUser && role && (SIGNUP_ROLES as readonly string[]).includes(role)) {
        if (hasServiceRoleKey()) {
          await createAdminClient()
            .from("profiles")
            .update({
              role,
              operation_country:
                country && isOperationCountry(country) ? country : "FR",
            })
            .eq("id", user.id);
        } else {
          console.warn(
            "[auth-callback] SUPABASE_SERVICE_ROLE_KEY not set; cannot apply signup_role",
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${defaultLocale}/login`);
}
