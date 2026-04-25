import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { refreshSession } from "@/lib/supabase/proxy-client";

const LOCALE_COOKIE = "NEXT_LOCALE";

function pickLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }

  const accept = req.headers.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .map((tag) => tag.split("-")[0]);

  for (const tag of preferred) {
    if ((locales as readonly string[]).includes(tag)) {
      return tag as Locale;
    }
  }
  return defaultLocale;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = pickLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: req });

  if (hasSupabaseEnv()) {
    return refreshSession(req, response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|auth/callback|favicon\\.ico|.*\\..*).*)"],
};
