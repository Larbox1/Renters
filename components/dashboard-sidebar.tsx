"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  // Settings goes last in its own unlabelled group, visible to everyone.
  groups.push({
    items: [
      {
        href: `/${locale}/dashboard/settings`,
        label: dict.settings,
        icon: "⚙️",
      },
    ],
  });

  return groups;
}

export function DashboardSidebar({
  locale,
  role,
  dict,
  unreadMessages = 0,
}: {
  locale: Locale;
  role: Role;
  dict: Dictionary["dashboard"]["sidebar"];
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const groups = buildGroups(role, locale, dict, unreadMessages);
  const overviewHref = `/${locale}/dashboard`;

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

      {/* Logout: appears at the end of the horizontal nav on mobile, pinned to
          the bottom of the column on desktop with a divider above it. */}
      <form
        action={logoutAction}
        className="md:mt-auto md:border-t md:border-slate-200 md:pt-3"
      >
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <span aria-hidden className="text-base leading-none">
            ↩️
          </span>
          <span className="flex-1">{dict.logout}</span>
        </button>
      </form>
    </nav>
  );
}
