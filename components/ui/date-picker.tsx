"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DATE_LOCALES = { en: enUS, fr } as const;
// Bundled here rather than in the dictionaries so call sites don't have to
// thread `dict` down just for a placeholder.
const PLACEHOLDERS = { en: "Pick a date", fr: "Choisir une date" } as const;

// Parse "yyyy-MM-dd" as a LOCAL date. `new Date("yyyy-MM-dd")` would parse as
// UTC midnight and display the previous day in western timezones.
function parseIsoDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export type DatePickerProps = {
  /** Submitted with the form via a hidden input, like a native date input. */
  name?: string;
  id?: string;
  /** "yyyy-MM-dd" or "" (controlled). */
  value?: string;
  /** "yyyy-MM-dd" or "" (uncontrolled). */
  defaultValue?: string;
  /** Receives "yyyy-MM-dd", or "" when the date is cleared. */
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Extra classes for the trigger button (merged over the input-like default). */
  className?: string;
  /** date-fns display format; "PPP" = long localized date, "P" = short. */
  displayFormat?: string;
  /** Earliest/latest selectable date, "yyyy-MM-dd". */
  min?: string;
  max?: string;
  /** When set, the calendar caption becomes month/year dropdowns — use for
   * dates far from today (birth dates, acquisition dates, expirations). */
  fromYear?: number;
  toYear?: number;
};

export function DatePicker({
  name,
  id,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  placeholder,
  className,
  displayFormat = "PPP",
  min,
  max,
  fromYear,
  toYear,
}: DatePickerProps) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === "fr" ? "fr" : "en";
  const dateLocale = DATE_LOCALES[locale];

  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = React.useState(defaultValue ?? "");
  const current = isControlled ? value : innerValue;
  const selected = parseIsoDate(current);
  const [open, setOpen] = React.useState(false);

  const handleSelect = (day: Date | undefined) => {
    const next = day ? format(day, "yyyy-MM-dd") : "";
    if (!isControlled) setInnerValue(next);
    onChange?.(next);
    if (day) setOpen(false);
  };

  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];
  const withDropdowns = fromYear != null || toYear != null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "mt-1 flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
              className,
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
            {selected ? (
              <span className="truncate">
                {format(selected, displayFormat, { locale: dateLocale })}
              </span>
            ) : (
              <span className="truncate text-slate-400">
                {placeholder ?? PLACEHOLDERS[locale]}
              </span>
            )}
          </button>
        </PopoverTrigger>
        {/* Invisible-but-focusable input: carries name/value for plain form
            submission and anchors native `required` validation. Not
            `type="hidden"`/readOnly — both are exempt from validation. */}
        {name && (
          <input
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            name={name}
            value={current}
            onChange={() => {}}
            required={required}
            disabled={disabled}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          locale={dateLocale}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
          {...(withDropdowns
            ? {
                captionLayout: "dropdown-buttons" as const,
                fromYear: fromYear ?? 1900,
                toYear: toYear ?? new Date().getFullYear(),
              }
            : {})}
        />
      </PopoverContent>
    </Popover>
  );
}
