"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type MonthlyCashflow = {
  month: string; // "YYYY-MM"
  incomeCents: number;
  expenseCents: number;
};

const RANGES = [3, 6, 12] as const;
type Range = (typeof RANGES)[number];

export function CashflowChart({
  locale,
  data,
  dict,
}: {
  locale: Locale;
  data: MonthlyCashflow[]; // 12 months, oldest → newest
  dict: Dictionary["dashboard"]["cashflow"];
}) {
  const [range, setRange] = useState<Range>(6);

  const intl = locale === "fr" ? "fr-FR" : "en-US";
  const fmtCurrency = useMemo(
    () =>
      new Intl.NumberFormat(intl, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [intl],
  );
  const monthLabel = useMemo(() => {
    const f = new Intl.DateTimeFormat(intl, { month: "short" });
    return (key: string) => {
      const [y, m] = key.split("-").map(Number);
      return f.format(new Date(y, m - 1, 1));
    };
  }, [intl]);

  const visible = useMemo(() => data.slice(-range), [data, range]);

  const totals = useMemo(() => {
    const income = visible.reduce((s, m) => s + m.incomeCents, 0);
    const expense = visible.reduce((s, m) => s + m.expenseCents, 0);
    return { income, expense, net: income - expense };
  }, [visible]);

  const maxCents = Math.max(
    1,
    ...visible.map((m) => Math.max(m.incomeCents, m.expenseCents)),
  );
  const barHeight = (cents: number) =>
    cents <= 0 ? "0%" : `${Math.max(3, (cents / maxCents) * 100)}%`;

  const isEmpty = totals.income === 0 && totals.expense === 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{dict.heading}</h2>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                range === r
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r} {dict.monthsSuffix}
            </button>
          ))}
        </div>
      </header>

      {/* Range totals */}
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
        <Summary
          label={dict.revenues}
          value={fmtCurrency.format(totals.income / 100)}
          dotClass="bg-emerald-500"
        />
        <Summary
          label={dict.expenses}
          value={fmtCurrency.format(totals.expense / 100)}
          dotClass="bg-red-500"
        />
        <Summary
          label={dict.net}
          value={fmtCurrency.format(totals.net / 100)}
          valueClass={totals.net < 0 ? "text-red-600" : "text-slate-900"}
        />
      </div>

      {isEmpty ? (
        <p className="py-10 text-center text-sm text-slate-500">{dict.empty}</p>
      ) : (
        <div className="flex items-end gap-2">
          {visible.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div
                  title={`${dict.revenues}: ${fmtCurrency.format(m.incomeCents / 100)}`}
                  style={{ height: barHeight(m.incomeCents) }}
                  className="w-2.5 rounded-t bg-emerald-500 sm:w-3.5"
                />
                <div
                  title={`${dict.expenses}: ${fmtCurrency.format(m.expenseCents / 100)}`}
                  style={{ height: barHeight(m.expenseCents) }}
                  className="w-2.5 rounded-t bg-red-500 sm:w-3.5"
                />
              </div>
              <span className="mt-1.5 text-[10px] capitalize text-slate-500">
                {monthLabel(m.month)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Summary({
  label,
  value,
  dotClass,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  dotClass?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
