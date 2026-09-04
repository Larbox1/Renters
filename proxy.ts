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

// Forwarded to server layouts so they can tell dashboard routes (own shell)
// from public pages (global navbar + footer) — server components have no
// access to the pathname otherwise.
const PATHNAME_HEADER = "x-pathname";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const cookieLocale =
      cookie && (locales as readonly string[]).includes(cookie)
        ? (cookie as Locale)
        : null;
    const url = req.nextUrl.clone();

    // Serve the default locale at the bare domain via rewrite (HTTP 200) so
    // crawlers can index https://www.meskasas.com/ directly — a redirecting
    // homepage is reported as "Page with redirect" in Search Console and
    // stays out of the index. Visitors who explicitly switched language
    // (locale cookie) still get their redirect below; crawlers carry no
    // cookies, so they always see the stable 200. NOTE: the rewrite returns
    // without refreshSession — a token rotation inside it would replace the
    // rewrite with a plain next() response.
    if (pathname === "/" && (!cookieLocale || cookieLocale === defaultLocale)) {
      url.pathname = `/${defaultLocale}`;
      req.headers.set(PATHNAME_HEADER, url.pathname);
      return NextResponse.rewrite(url, { request: req });
    }

    const locale = cookieLocale ?? pickLocale(req);
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  req.headers.set(PATHNAME_HEADER, pathname);
  const response = NextResponse.next({ request: req });

  if (hasSupabaseEnv()) {
    return refreshSession(req, response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|auth/callback|favicon\\.ico|.*\\..*).*)"],
};
