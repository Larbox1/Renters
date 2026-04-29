"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Two-pane layout for the messaging area:
 *   * lg+ : list (left, fixed width) | content (right, fills remaining space)
 *   * < lg: only one pane visible at a time, controlled by the URL.
 *           - on /messages exactly  → list visible, right pane hidden
 *           - on /messages/anything → list hidden, right pane visible
 */
export function MessagesShell({
  list,
  children,
}: {
  list: ReactNode;
  children: ReactNode;
}) {
  const params = useParams<{ id?: string; locale?: string }>();
  const isAtListRoot = params?.id === undefined;

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-slate-50">
      <aside
        className={`w-full lg:w-80 lg:shrink-0 lg:border-r lg:border-slate-200 lg:bg-white ${
          isAtListRoot ? "block" : "hidden lg:block"
        }`}
      >
        {list}
      </aside>
      <main
        className={`min-w-0 flex-1 ${isAtListRoot ? "hidden lg:flex" : "flex"} flex-col`}
      >
        {children}
      </main>
    </div>
  );
}
