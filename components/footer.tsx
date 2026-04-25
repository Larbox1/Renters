import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function Footer({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["footer"];
}) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                R
              </span>
              <span className="text-xl font-semibold text-slate-900">
                renters
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-slate-600">
              {dict.tagline}
            </p>
          </div>

          <div className="flex gap-10 text-sm">
            <div>
              <h4 className="font-semibold text-slate-900">{dict.product}</h4>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li>
                  <Link
                    href={`/${locale}`}
                    className="hover:text-slate-900"
                  >
                    {dict.features}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/pricing`}
                    className="hover:text-slate-900"
                  >
                    {dict.pricing}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{dict.account}</h4>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li>
                  <Link
                    href={`/${locale}/login`}
                    className="hover:text-slate-900"
                  >
                    {dict.login}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/signup`}
                    className="hover:text-slate-900"
                  >
                    {dict.signup}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} renters. {dict.rights}
        </div>
      </div>
    </footer>
  );
}
