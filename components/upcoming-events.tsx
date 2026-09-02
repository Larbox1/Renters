import type { ComponentType } from "react";
import {
  Cake,
  Coins,
  DoorOpen,
  DoorClosed,
  RefreshCw,
  type LucideProps,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CalendarEvent, CalendarEventKind } from "@/components/calendar";

const EVENT_ICON: Record<CalendarEventKind, ComponentType<LucideProps>> = {
  lease_start: DoorOpen,
  lease_end: DoorClosed,
  lease_revision: RefreshCw,
  tenant_birthday: Cake,
  rent_payment: Coins,
};

// Icon chip tints follow the calendar's event dot colors so the two widgets
// read as one system.
const EVENT_CHIP_CLASS: Record<CalendarEventKind, string> = {
  lease_start: "bg-emerald-50 text-emerald-700",
  lease_end: "bg-amber-50 text-amber-700",
  lease_revision: "bg-brand-50 text-brand-700",
  tenant_birthday: "bg-pink-50 text-pink-700",
  rent_payment: "bg-slate-100 text-slate-700",
};

export function UpcomingEvents({
  locale,
  events, // pre-filtered to the window, sorted by date ascending
  dict,
  eventLabels,
}: {
  locale: Locale;
  events: CalendarEvent[];
  dict: Dictionary["dashboard"]["upcoming"];
  eventLabels: Dictionary["dashboard"]["calendar"]["events"];
}) {
  const fmtDate = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return fmtDate.format(new Date(y, m - 1, d));
  };

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{dict.heading}</h2>

      {events.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-slate-500">
          {dict.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3 overflow-y-auto">
          {events.map((e, i) => {
            const Icon = EVENT_ICON[e.kind];
            return (
              <li key={`${e.leaseId}-${e.kind}-${e.date}-${i}`} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${EVENT_CHIP_CLASS[e.kind]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {eventLabels[e.kind]}
                    {e.label && (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · {e.label}
                      </span>
                    )}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    {dateLabel(e.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
