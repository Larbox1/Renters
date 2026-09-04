import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { LanguageSwitcher } from "@/components/language-switcher";

const Chevron = () => (
  <svg className="h-2.5 w-2.5 text-ink-4" viewBox="0 0 16 16" fill="none">
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Arrow = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8h10m0 0L9 4m4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Public-site header (landing, pricing, contact, legal…). Signed-in visitors
 * get a "Dashboard" button in place of the login / sign-up actions.
 */
export function Navbar({
  locale,
  dict,
  signedIn = false,
}: {
  locale: Locale;
  dict: Dictionary["nav"];
  signedIn?: boolean;
}) {
  const navLinks = [
    { href: `/${locale}#features`, label: dict.features, chevron: true },
    { href: `/${locale}#audience`, label: dict.audience, chevron: false },
    { href: `/${locale}#pricing`, label: dict.pricing, chevron: false },
    { href: `/${locale}#resources`, label: dict.resources, chevron: true },
    { href: `/${locale}/contact`, label: dict.contact, chevron: false },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-[1360px] items-center justify-between px-6">
        <Link href={`/${locale}`} className="flex items-center">
          <Image
            src={locale === "fr" ? "/meskasas_logo_fr.png" : "/meskasas_logo_en.png"}
            alt="Meskasas"
            width={1493}
            height={374}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-1.5 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14.5px] text-ink-2 transition hover:bg-paper-sunk hover:text-ink"
            >
              {l.label}
              {l.chevron && <Chevron />}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher current={locale} />
          {signedIn ? (
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper transition hover:bg-ink-2"
            >
              {dict.dashboard}
              <Arrow />
            </Link>
          ) : (
            <>
              <Link
                href={`/${locale}/login`}
                className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-ink-2 transition hover:bg-paper-sunk hover:text-ink sm:inline-block"
              >
                {dict.login}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper transition hover:bg-ink-2"
              >
                {dict.freeTrial}
                <Arrow />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
