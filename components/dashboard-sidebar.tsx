"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Role } from "@/lib/auth/current-user";
import type { Dictionary } from "@/i18n/dictionaries/en";

type SidebarItem = { href: string; label: string; badge?: number };

function buildItems(
  role: Role,
  locale: Locale,
  dict: Dictionary["dashboard"]["sidebar"],
  unreadMessages: number,
): SidebarItem[] {
  const items: SidebarItem[] = [
    { href: `/${locale}/dashboard`, label: dict.overview },
    {
      href: `/${locale}/dashboard/messages`,
      label: dict.messages,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
  ];
  if (role === "owner" || role === "admin") {
    items.push(
      { href: `/${locale}/dashboard/properties`, label: dict.properties },
      { href: `/${locale}/dashboard/tenants`, label: dict.tenants },
      { href: `/${locale}/dashboard/leases`, label: dict.leases },
    );
  }
  if (role === "admin") {
    items.push({ href: `/${locale}/dashboard/users`, label: dict.users });
    // The Hub: admin-only, no translation (same in EN and FR).
    items.push({ href: `/${locale}/dashboard/the-hub`, label: "The Hub" });
  }
  return items;
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
  const items = buildItems(role, locale, dict, unreadMessages);
  const overviewHref = `/${locale}/dashboard`;

  return (
    <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:p-4">
      {items.map((item) => {
        const isActive =
          item.href === overviewHref
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
