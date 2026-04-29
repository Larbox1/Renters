"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type NotificationItem = {
  /** Stable key for React reconciliation. */
  id: string;
  name: string;
  preview: string;
  href: string;
  /** Number used for the per-item pill. Also summed for the bell badge. */
  unreadCount: number;
  /** Optional emoji shown in the avatar circle instead of a first letter. */
  icon?: string;
};

export function NotificationsBell({
  items,
  ariaLabel,
  emptyLabel,
  viewAllLabel,
  viewAllHref,
}: {
  items: NotificationItem[];
  ariaLabel: string;
  emptyLabel: string;
  viewAllLabel: string;
  viewAllHref: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalUnread = items.reduce((s, i) => s + i.unreadCount, 0);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-base text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <span aria-hidden>🔔</span>
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {ariaLabel}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {emptyLabel}
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} role="none">
                  <Link
                    href={n.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-brand-50/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-base text-brand-700">
                      {n.icon ?? (
                        <span className="text-xs font-semibold uppercase">
                          {n.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {n.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {n.preview}
                      </p>
                    </div>
                    {n.unreadCount > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                        {n.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-200">
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700"
            >
              {viewAllLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
