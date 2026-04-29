import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function Navbar({
  locale,
  dict,
  userEmail,
}: {
  locale: Locale;
  dict: Dictionary["nav"];
  userEmail: string | null;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            R
          </span>
          <span className="text-xl font-semibold text-slate-900">renters</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {dict.home}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {dict.pricing}
          </Link>
          {userEmail && (
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {dict.dashboard}
            </Link>
          )}
          {userEmail && (
            <form
              action={`/${locale}/dashboard/search`}
              method="get"
              className="relative ml-2"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
              >
                🔎
              </span>
              <input
                type="search"
                name="q"
                placeholder={dict.searchPlaceholder}
                aria-label={dict.searchPlaceholder}
                className="w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </form>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!userEmail && (
            <>
              <Link
                href={`/${locale}/login`}
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline-block"
              >
                {dict.login}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                {dict.signup}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
