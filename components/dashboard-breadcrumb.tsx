"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Breadcrumb for the dashboard content header, derived from the current path.
 * `labels` maps a known path segment to its display label; any unmapped segment
 * (e.g. a record id) falls back to `fallback`. The first crumb is always the
 * dashboard root and links home; the last crumb is the current page (no link).
 */
export function DashboardBreadcrumb({
  labels,
  fallback,
}: {
  labels: Record<string, string>;
  fallback: string;
}) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean); // [locale, dashboard, …]
  const start = parts.indexOf("dashboard");
  if (start === -1) return null;

  const segments = parts.slice(start); // [dashboard, leases, <id>, edit]
  const crumbs = segments.map((segment, i) => ({
    href: `/${parts.slice(0, start + i + 1).join("/")}`,
    label: labels[segment] ?? fallback,
    isLast: i === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-slate-300">
              /
            </span>
          )}
          {crumb.isLast ? (
            <span className="truncate font-semibold text-slate-900">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="truncate text-slate-500 transition hover:text-slate-700"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
