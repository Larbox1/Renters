"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "renters:sidebar-collapsed";

/**
 * Client wrapper around the dashboard sidebar that lets the user collapse it.
 * The collapse only applies on desktop (md+); on mobile the sidebar stays a
 * horizontal strip. The collapsed state is persisted to localStorage so it
 * survives navigation and reloads.
 */
export function DashboardSidebarShell({
  children,
  toggleLabel,
}: {
  children: React.ReactNode;
  toggleLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <>
      <aside
        className={`border-b border-slate-200 bg-slate-50 md:flex md:h-full md:shrink-0 md:flex-col md:overflow-hidden md:border-b-0 md:border-r print:hidden ${
          collapsed ? "md:hidden" : "md:w-56"
        }`}
      >
        <div className="hidden shrink-0 justify-end px-4 pt-4 md:flex">
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            <span aria-hidden className="text-base leading-none">
              «
            </span>
          </button>
        </div>
        {children}
      </aside>

      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="hidden h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 md:ml-2 md:mt-2 md:flex"
        >
          <span aria-hidden className="text-base leading-none">
            »
          </span>
        </button>
      )}
    </>
  );
}
