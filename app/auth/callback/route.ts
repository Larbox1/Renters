import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale } from "@/i18n/config";
import { isOperationCountry } from "@/lib/operation-country";

const SIGNUP_ROLES = ["owner", "tenant", "service_provider"] as const;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? `/${defaultLocale}/dashboard`;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : `/${defaultLocale}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const role = searchParams.get("signup_role");
      const country = searchParams.get("signup_country");

      // OAuth signups can't carry metadata the way email signups do, so the
      // profile trigger created them with onboarded_at = null. When the
      // signup page passed the role the user picked, apply it now through
      // complete_onboarding (0071): it only ever succeeds once per profile,
      // so a returning user hitting this URL with stale params is a no-op,
      // and 'admin' is refused server-side. Without a role param (login page)
      // the dashboard redirects to /onboarding for an explicit choice.
      if (role && (SIGNUP_ROLES as readonly string[]).includes(role)) {
        const { error: rpcError } = await supabase.rpc("complete_onboarding", {
          p_role: role,
          p_country: country && isOperationCountry(country) ? country : "FR",
        });
        if (rpcError && !rpcError.message.includes("already_onboarded")) {
          console.warn(
            "[auth-callback] complete_onboarding failed:",
            rpcError.message,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${defaultLocale}/login`);
}
