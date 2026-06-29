"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Role } from "@/lib/auth/current-user";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { logoutAction } from "@/lib/actions/auth";

type SidebarItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

type SidebarGroup = {
  // Section heading shown above the items; omit for an unlabelled group.
  label?: string;
  items: SidebarItem[];
};

function buildGroups(
  role: Role,
  locale: Locale,
  dict: Dictionary["dashboard"]["sidebar"],
  unreadMessages: number,
): SidebarGroup[] {
  const groups: SidebarGroup[] = [];

  // Management: the day-to-day piloting of the portfolio.
  const management: SidebarItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: dict.overview,
      icon: "🏠",
    },
  ];
  if (role === "owner" || role === "admin") {
    management.push(
      {
        href: `/${locale}/dashboard/properties`,
        label: dict.properties,
        icon: "🏢",
      },
      {
        href: `/${locale}/dashboard/tenants`,
        label: dict.tenants,
        icon: "👥",
      },
      {
        href: `/${locale}/dashboard/leases`,
        label: dict.leases,
        icon: "📄",
      },
      {
        href: `/${locale}/dashboard/documents`,
        label: dict.documents,
        icon: "📁",
      },
    );
  }
  if (role === "tenant") {
    management.push({
      href: `/${locale}/dashboard/my-lease`,
      label: dict.leases,
      icon: "📄",
    });
  }
  groups.push({ label: dict.groups.management, items: management });

  // Accounting: finance, owner-only.
  if (role === "owner") {
    groups.push({
      label: dict.groups.accounting,
      items: [
        {
          href: `/${locale}/dashboard/finance`,
          label: dict.finance,
          icon: "💰",
        },
      ],
    });
  }

  // Operations: messaging, visible to everyone.
  groups.push({
    label: dict.groups.operations,
    items: [
      {
        href: `/${locale}/dashboard/messages`,
        label: dict.messages,
        icon: "💬",
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
    ],
  });

  // Administration: admin-only tools.
  if (role === "admin") {
    groups.push({
      label: dict.groups.admin,
      items: [
        {
          href: `/${locale}/dashboard/users`,
          label: dict.users,
          icon: "🛡️",
        },
        // The Hub: admin-only, no translation (same in EN and FR).
        {
          href: `/${locale}/dashboard/the-hub`,
          label: "The Hub",
          icon: "🌐",
        },
      ],
    });
  }

  // Settings is no longer a nav item — it's reached via the profile menu at
  // the bottom of the sidebar (Profil).

  return groups;
}

type PlanCard = {
  name: string;
  used: number;
  limit: number | null;
  canUpgrade: boolean;
};

// Two-letter initials for the profile avatar, from the full name when
// available, otherwise the email. Falls back to "?" when nothing is known.
function initialsOf(fullName: string, email: string): string {
  const source = (fullName || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : source.slice(0, 2);
  return letters.toUpperCase();
}

export function DashboardSidebar({
  locale,
  role,
  dict,
  unreadMessages = 0,
  fullName,
  email,
  roleLabel,
  plan,
}: {
  locale: Locale;
  role: Role;
  dict: Dictionary["dashboard"]["sidebar"];
  unreadMessages?: number;
  fullName: string;
  email: string;
  roleLabel: string;
  plan?: PlanCard;
}) {
  const pathname = usePathname();
  const groups = buildGroups(role, locale, dict, unreadMessages);
  const overviewHref = `/${locale}/dashboard`;
  const settingsHref = `/${locale}/dashboard/settings`;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const quotaPct =
    plan && plan.limit !== null && plan.limit > 0
      ? Math.min(100, Math.round((plan.used / plan.limit) * 100))
      : 0;
  const nearQuota =
    plan && plan.limit !== null && plan.limit > 0
      ? plan.used / plan.limit >= 0.8
      : false;

  return (
    <nav className="flex gap-1 overflow-x-auto p-3 md:min-h-0 md:flex-1 md:flex-col md:gap-0 md:overflow-visible md:p-4">
      <form
        action={`/${locale}/dashboard/search`}
        method="get"
        className="relative mb-4 hidden md:block"
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
          placeholder={dict.search}
          aria-label={dict.search}
          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </form>

      {groups.map((group, groupIndex) => (
        <div
          key={group.label ?? `group-${groupIndex}`}
          className="flex gap-1 md:flex-col md:gap-1 md:[&:not(:first-child)]:mt-4"
        >
          {group.label && (
            <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:block">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const isActive =
              item.href === overviewHref
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Footer: plan quota card + profile menu. Pinned to the bottom of the
          column on desktop with a divider above it; on mobile it trails the
          horizontal nav (the wide plan card is hidden there to save space). */}
      <div className="ml-2 flex items-center gap-2 md:ml-0 md:mt-auto md:flex-col md:items-stretch md:gap-3 md:border-t md:border-slate-200 md:pt-3">
        {plan && (
          <div className="hidden rounded-xl border border-brand-100 bg-brand-50/60 p-3 md:block">
            <p className="text-xs font-semibold text-brand-900">
              {dict.plan.label} {plan.name}
              {plan.limit !== null && (
                <span className="font-normal text-brand-700">
                  {" · "}
                  {plan.used}/{plan.limit} {dict.plan.unit}
                </span>
              )}
            </p>
            {plan.limit !== null && (
              <>
                {nearQuota && (
                  <p className="mt-1 text-[11px] leading-snug text-brand-700/80">
                    {dict.plan.quotaHint}
                  </p>
                )}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-[width]"
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              </>
            )}
            {plan.canUpgrade && (
              <Link
                href={settingsHref}
                className="mt-3 block rounded-lg bg-white px-3 py-1.5 text-center text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100 transition hover:bg-brand-50"
              >
                {dict.plan.upgrade}
              </Link>
            )}
          </div>
        )}

        <div ref={menuRef} className="relative md:w-full">
          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg md:w-full"
            >
              <Link
                href={settingsHref}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span aria-hidden className="text-base leading-none">
                  ⚙️
                </span>
                <span className="flex-1">{dict.profile}</span>
              </Link>
              <form action={logoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <span aria-hidden className="text-base leading-none">
                    ↩️
                  </span>
                  <span className="flex-1">{dict.logout}</span>
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
            >
              {initialsOf(fullName, email)}
            </span>
            <span className="hidden min-w-0 flex-1 md:block">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {fullName || email}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {roleLabel}
              </span>
            </span>
            <span aria-hidden className="hidden text-slate-400 md:block">
              ⌄
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
