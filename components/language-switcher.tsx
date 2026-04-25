"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: Locale) {
    if (target === current) return;
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    const segments = pathname.split("/");
    // segments[0] is "" (leading slash), segments[1] is the current locale
    if (segments[1] && (locales as readonly string[]).includes(segments[1])) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }
    const next = segments.join("/") || `/${target}`;
    router.push(next);
    router.refresh();
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-pressed={active}
            className={`px-2.5 py-1.5 uppercase transition ${
              active
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
