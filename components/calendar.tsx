"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type CalendarEventKind =
  | "lease_start"
  | "lease_end"
  | "lease_revision"
  | "tenant_birthday"
  | "rent_payment";

export type CalendarEvent = {
  date: string; // ISO YYYY-MM-DD
  kind: CalendarEventKind;
  label: string;
  leaseId: string;
};

const EVENT_DOT_CLASS: Record<CalendarEventKind, string> = {
  lease_start: "bg-green-500",
  lease_end: "bg-amber-500",
  lease_revision: "bg-blue-500",
  tenant_birthday: "bg-pink-500",
  rent_payment: "bg-violet-500",
};

// Tinted background + text for the inline event previews inside day cells.
const EVENT_PILL_CLASS: Record<CalendarEventKind, string> = {
  lease_start: "bg-green-100 text-green-700",
  lease_end: "bg-amber-100 text-amber-700",
  lease_revision: "bg-blue-100 text-blue-700",
  tenant_birthday: "bg-pink-100 text-pink-700",
  rent_payment: "bg-violet-100 text-violet-700",
};

// How many event previews to render inside a day cell before collapsing the
// rest into a "+N" counter.
const MAX_PREVIEWS = 3;

// Legend / popup order — keeps related event types grouped.
const EVENT_ORDER: CalendarEventKind[] = [
  "lease_start",
  "lease_end",
  "rent_payment",
  "lease_revision",
  "tenant_birthday",
];

function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

function formatMonthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Calendar({
  locale,
  monthDate,
  events,
  baseUrl,
  dict,
}: {
  locale: Locale;
  monthDate: Date; // first day of the month being displayed
  events: CalendarEvent[];
  baseUrl: string; // e.g. /en/dashboard
  dict: Dictionary["dashboard"]["calendar"];
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Computed after mount so server-rendered HTML (which uses the server's clock)
  // never disagrees with the client on which cell is "today".
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  // Reset the open popup whenever the displayed month changes.
  useEffect(() => {
    setSelectedDay(null);
  }, [year, month]);

  // Close the popup on Escape.
  useEffect(() => {
    if (selectedDay === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedDay]);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = monthEnd.getDate();

  // Monday-first week: 0=Mon..6=Sun.
  const startOffset = (monthStart.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Bucket events by day-of-month (only those falling in this month).
  const eventsByDay = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(`${e.date}T00:00:00`);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    const arr = eventsByDay.get(day) ?? [];
    arr.push(e);
    eventsByDay.set(day, arr);
  }
  // Stable, grouped ordering within a day.
  for (const arr of eventsByDay.values()) {
    arr.sort((a, b) => EVENT_ORDER.indexOf(a.kind) - EVENT_ORDER.indexOf(b.kind));
  }

  const fmt = intlLocale(locale);
  const monthLabel = new Intl.DateTimeFormat(fmt, {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  // Weekday short labels, Monday first. Jan 1 2024 was a Monday.
  const weekdayFmt = new Intl.DateTimeFormat(fmt, { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(new Date(2024, 0, 1 + i)),
  );

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const prevHref = `${baseUrl}?month=${formatMonthParam(prevMonth)}`;
  const nextHref = `${baseUrl}?month=${formatMonthParam(nextMonth)}`;
  const todayHref = baseUrl;

  const isCurrentMonth =
    today !== null &&
    today.getFullYear() === year &&
    today.getMonth() === month;
  const todayDate = today?.getDate() ?? -1;

  const selectedEvents =
    selectedDay !== null ? (eventsByDay.get(selectedDay) ?? []) : [];
  const selectedDateLabel =
    selectedDay !== null
      ? new Intl.DateTimeFormat(fmt, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(year, month, selectedDay))
      : "";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {dict.heading}
        </h2>
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            aria-label={dict.previous}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ‹
          </Link>
          <Link
            href={todayHref}
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {dict.today}
          </Link>
          <Link
            href={nextHref}
            aria-label={dict.next}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ›
          </Link>
        </div>
      </header>

      <p className="mb-3 text-sm font-medium capitalize text-slate-700">
        {monthLabel}
      </p>

      <div className="grid grid-cols-7 gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {weekdays.map((w, i) => (
          <div key={i} className="px-1 py-1.5 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) {
            return (
              <div
                key={i}
                className="min-h-[92px] rounded-md bg-slate-50/40"
                aria-hidden
              />
            );
          }
          const dayEvents = eventsByDay.get(d) ?? [];
          const isToday = isCurrentMonth && d === todayDate;
          const hidden = dayEvents.length - MAX_PREVIEWS;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDay(d)}
              aria-label={`${d}${dayEvents.length > 0 ? ` — ${dayEvents.length}` : ""}`}
              className={`relative flex min-h-[92px] flex-col gap-1 rounded-md border p-1.5 text-left transition hover:border-brand-400 hover:bg-brand-50/60 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                isToday
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday ? "text-brand-700" : "text-slate-700"
                }`}
              >
                {d}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, MAX_PREVIEWS).map((e, idx) => (
                    <span
                      key={`${e.leaseId}-${e.kind}-${idx}`}
                      title={`${dict.events[e.kind]}: ${e.label}`}
                      className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${EVENT_PILL_CLASS[e.kind]}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_DOT_CLASS[e.kind]}`}
                      />
                      <span className="truncate">
                        {e.label || dict.events[e.kind]}
                      </span>
                    </span>
                  ))}
                  {hidden > 0 && (
                    <span className="px-1 text-[10px] font-semibold text-slate-500">
                      +{hidden}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {EVENT_ORDER.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${EVENT_DOT_CLASS[kind]}`} />
            {dict.events[kind]}
          </span>
        ))}
        {events.length === 0 && (
          <span className="ml-auto italic">{dict.empty}</span>
        )}
      </div>

      {/* Day-detail popup */}
      {selectedDay !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold capitalize text-slate-900">
                {selectedDateLabel}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label={dict.close}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">{dict.noEventsDay}</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedEvents.map((e, idx) => (
                  <li key={`${e.leaseId}-${e.kind}-${idx}`}>
                    <Link
                      href={`${baseUrl}/leases/${e.leaseId}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:border-brand-200 hover:bg-brand-50/60"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${EVENT_DOT_CLASS[e.kind]}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">
                          {e.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {dict.events[e.kind]}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-brand-600">
                        {dict.viewLease}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
