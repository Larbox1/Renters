import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { AddMenu, type AddMenuItem } from "@/components/add-menu";
import {
  NotificationsBell,
  type NotificationItem,
} from "@/components/notifications-bell";

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

export function Navbar({
  locale,
  dict,
  userEmail,
  addItems = [],
  notifications = [],
  utility,
}: {
  locale: Locale;
  dict: Dictionary["nav"];
  userEmail: string | null;
  addItems?: AddMenuItem[];
  notifications?: NotificationItem[];
  utility?: Dictionary["home"]["utility"];
}) {
  const navLinks = [
    { href: `/${locale}#features`, label: dict.features, chevron: true },
    { href: `/${locale}#audience`, label: dict.audience, chevron: false },
    { href: `/${locale}#pricing`, label: dict.pricing, chevron: false },
    { href: `/${locale}#resources`, label: dict.resources, chevron: true },
    { href: `/${locale}#cta`, label: dict.contact, chevron: false },
  ];

  return (
    <>
      {/* Utility bar — marketing only, scrolls away above the sticky nav. */}
      {!userEmail && utility && (
        <div className="border-b border-line bg-paper text-[12.5px] text-ink-3">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {utility.status}
              </span>
              <span className="hidden text-ink-4 md:inline">·</span>
              <span className="hidden text-ink-3 md:inline">{utility.version}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/fr" className="hover:text-ink">
                FR
              </Link>
              <Link href="/en" className="hover:text-ink">
                EN
              </Link>
              <span className="text-ink-4">·</span>
              <a href="#" className="hover:text-ink">
                {utility.statusLink}
              </a>
              <a href="#" className="hover:text-ink">
                {utility.help}
              </a>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav
          className={`mx-auto flex h-full items-center justify-between px-6 ${
            userEmail ? "max-w-none" : "max-w-7xl"
          }`}
        >
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

          {!userEmail && (
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
          )}

          <div className="flex items-center gap-2">
            {userEmail ? (
              <>
                <AddMenu items={addItems} ariaLabel={dict.addMenu} />
                <NotificationsBell
                  items={notifications}
                  ariaLabel={dict.notifications}
                  emptyLabel={dict.notificationsEmpty}
                  viewAllLabel={dict.notificationsViewAll}
                  viewAllHref={`/${locale}/dashboard/messages`}
                />
              </>
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
    </>
  );
}
