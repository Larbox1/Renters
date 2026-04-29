"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type AddMenuItem = {
  href: string;
  label: string;
};

export function AddMenu({
  items,
  ariaLabel,
}: {
  items: AddMenuItem[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold leading-none text-white shadow-sm transition hover:bg-brand-700"
      >
        +
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.href} role="none">
              <Link
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                <span aria-hidden className="text-brand-600">
                  +
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
