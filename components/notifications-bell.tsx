"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NotificationItem = {
  /** Stable key for React reconciliation. */
  id: string;
  name: string;
  preview: string;
  href: string;
  /** Number used for the per-item pill. Also summed for the bell badge. */
  unreadCount: number;
  /** Optional icon shown in the avatar circle instead of a first letter. */
  icon?: ReactNode;
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
  const totalUnread = items.reduce((s, i) => s + i.unreadCount, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Bell aria-hidden className="h-4 w-4" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {ariaLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {emptyLabel}
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem key={n.id} asChild className="rounded-none">
                <Link
                  href={n.href}
                  className="flex w-full items-start gap-3 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    {n.icon ?? (
                      <span className="text-xs font-semibold uppercase">
                        {n.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {n.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {n.preview}
                    </span>
                  </span>
                  {n.unreadCount > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                      {n.unreadCount}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="rounded-none">
          <Link
            href={viewAllHref}
            className="block w-full justify-center px-4 py-2.5 text-center text-xs font-semibold text-brand-600"
          >
            {viewAllLabel}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
