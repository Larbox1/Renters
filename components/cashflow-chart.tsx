"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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
  currency = "EUR",
}: {
  locale: Locale;
  data: MonthlyCashflow[]; // 12 months, oldest → newest
  dict: Dictionary["dashboard"]["cashflow"];
  currency?: string;
}) {
  const [range, setRange] = useState<Range>(6);

  const intl = locale === "fr" ? "fr-FR" : "en-US";
  const fmtCurrency = useMemo(
    () =>
      new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [intl, currency],
  );
  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [intl, currency],
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

  const chartConfig = useMemo(
    () =>
      ({
        income: { label: dict.revenues, color: "hsl(var(--chart-2))" },
        expense: { label: dict.expenses, color: "hsl(var(--chart-3))" },
        net: { label: dict.net, color: "hsl(var(--chart-1))" },
      }) satisfies ChartConfig,
    [dict],
  );

  const rows = useMemo(
    () =>
      visible.map((m) => ({
        month: monthLabel(m.month),
        income: m.incomeCents / 100,
        expense: m.expenseCents / 100,
        net: (m.incomeCents - m.expenseCents) / 100,
      })),
    [visible, monthLabel],
  );

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
          dotClass="bg-emerald-600"
        />
        <Summary
          label={dict.expenses}
          value={fmtCurrency.format(totals.expense / 100)}
          dotClass="bg-red-600"
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
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ComposedChart data={rows} barGap={2} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="capitalize"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => fmtCompact.format(v)}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: `var(--color-${name})` }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="ml-auto pl-4 font-medium tabular-nums text-foreground">
                        {fmtCurrency.format(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--color-net)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
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
