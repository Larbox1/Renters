import Link from "next/link";
import { LanguageSwitcher } from "./language-switcher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { logoutAction } from "@/lib/actions/auth";

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

        <div className="hidden items-center gap-8 md:flex">
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
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher current={locale} />
          {userEmail ? (
            <>
              <span
                className="hidden max-w-[12rem] truncate text-sm text-slate-600 lg:inline-block"
                title={userEmail}
              >
                {userEmail}
              </span>
              <form action={logoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {dict.logout}
                </button>
              </form>
            </>
          ) : (
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
