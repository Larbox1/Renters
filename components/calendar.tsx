import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type CalendarEventKind = "lease_start" | "lease_end";

export type CalendarEvent = {
  date: string; // ISO YYYY-MM-DD
  kind: CalendarEventKind;
  label: string;
  leaseId: string;
};

const EVENT_DOT_CLASS: Record<CalendarEventKind, string> = {
  lease_start: "bg-green-500",
  lease_end: "bg-amber-500",
};

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

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

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
                className="aspect-square rounded-md bg-slate-50/40"
                aria-hidden
              />
            );
          }
          const dayEvents = eventsByDay.get(d) ?? [];
          const isToday = isCurrentMonth && d === todayDate;
          return (
            <div
              key={i}
              className={`relative flex aspect-square flex-col rounded-md border p-1.5 ${
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
                <div className="mt-auto flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 4).map((e, idx) => (
                    <span
                      key={`${e.leaseId}-${e.kind}-${idx}`}
                      title={`${dict.events[e.kind]}: ${e.label}`}
                      className={`block h-1.5 w-1.5 rounded-full ${EVENT_DOT_CLASS[e.kind]}`}
                    />
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="text-[9px] font-semibold text-slate-500">
                      +{dayEvents.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {dict.events.lease_start}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {dict.events.lease_end}
        </span>
        {events.length === 0 && (
          <span className="ml-auto italic">{dict.empty}</span>
        )}
      </div>
    </section>
  );
}
