"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Resolvers that turn a record id into a human label, keyed by the collection
 * segment that precedes the id in the path (…/leases/<id> → use "leases").
 * Each reads through the user's session (RLS applies); a null result falls back
 * to the generic label. Mirrors the display names used on the detail pages.
 */
const RESOLVERS: Record<
  string,
  (sb: SupabaseClient, id: string) => Promise<string | null>
> = {
  leases: async (sb, id) => {
    const { data } = await sb
      .from("leases")
      .select("properties(label, address, city), tenants(full_name)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const p = Array.isArray(data.properties)
      ? data.properties[0]
      : data.properties;
    if (p) return p.label ?? `${p.address}, ${p.city}`;
    const t = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
    return t?.full_name ?? null;
  },
  properties: async (sb, id) => {
    const { data } = await sb
      .from("properties")
      .select("label, address, city")
      .eq("id", id)
      .maybeSingle();
    return data ? (data.label ?? `${data.address}, ${data.city}`) : null;
  },
  tenants: async (sb, id) => {
    const { data } = await sb
      .from("tenants")
      .select("full_name")
      .eq("id", id)
      .maybeSingle();
    return data?.full_name ?? null;
  },
  messages: async (sb, id) => {
    const { data } = await sb
      .from("profiles")
      .select("full_name")
      .eq("id", id)
      .maybeSingle();
    return data?.full_name ?? null;
  },
};

const looksLikeId = (seg: string) => /^[0-9a-f-]{16,}$/i.test(seg);

/**
 * Breadcrumb for the dashboard content header, derived from the current path.
 * `labels` maps a known path segment to its display label. Record-id segments
 * are resolved to the entity's real name (property/tenant/lease/conversation)
 * through the browser client; anything still unresolved falls back to
 * `fallback`. The first crumb is the dashboard root; the last crumb is the
 * current page (no link).
 */
export function DashboardBreadcrumb({
  labels,
  fallback,
}: {
  labels: Record<string, string>;
  fallback: string;
}) {
  const pathname = usePathname();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);
  // Resolved id → name cache, persisted across navigations.
  const [names, setNames] = useState<Record<string, string>>({});

  const parts = pathname.split("/").filter(Boolean); // [locale, dashboard, …]
  const start = parts.indexOf("dashboard");
  const segments = start === -1 ? [] : parts.slice(start);

  useEffect(() => {
    if (!supabase || segments.length === 0) return;
    const pending = segments
      .map((seg, i) => ({ seg, collection: segments[i - 1] }))
      .filter(
        ({ seg, collection }) =>
          !labels[seg] &&
          looksLikeId(seg) &&
          !!collection &&
          !!RESOLVERS[collection] &&
          names[seg] === undefined,
      );
    if (pending.length === 0) return;

    let cancelled = false;
    Promise.all(
      pending.map(async ({ seg, collection }) => {
        const name = await RESOLVERS[collection](supabase, seg).catch(
          () => null,
        );
        return [seg, name] as const;
      }),
    ).then((resolved) => {
      if (cancelled) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const [seg, name] of resolved) if (name) next[seg] = name;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, supabase]);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, i) => ({
    href: `/${parts.slice(0, start + i + 1).join("/")}`,
    label: labels[segment] ?? names[segment] ?? fallback,
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
