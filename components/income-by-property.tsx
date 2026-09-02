"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CurrencyCode } from "@/lib/currency";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type PropertyIncome = {
  name: string;
  netCents: number;
};

const ROW_HEIGHT = 44;

export function IncomeByProperty({
  locale,
  data,
  currency,
  dict,
}: {
  locale: Locale;
  data: PropertyIncome[];
  currency: CurrencyCode;
  dict: Dictionary["dashboard"]["incomeByProperty"];
}) {
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

  const rows = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.netCents - a.netCents)
        .map((p) => ({ name: p.name, net: p.netCents / 100 })),
    [data],
  );

  const chartConfig = useMemo(
    () =>
      ({
        net: { label: dict.heading, color: "hsl(var(--chart-1))" },
      }) satisfies ChartConfig,
    [dict],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{dict.heading}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{dict.subtitle}</p>
      </header>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{dict.empty}</p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: rows.length * ROW_HEIGHT + 16 }}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 0, right: 72 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) =>
                v.length > 18 ? `${v.slice(0, 17)}…` : v
              }
            />
            <ChartTooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium tabular-nums text-foreground">
                      {fmtCurrency.format(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="net" radius={4} maxBarSize={22}>
              {/* Polarity, not identity: a property in the red keeps its row —
                  only the fill flips to the expense hue. */}
              {rows.map((r) => (
                <Cell
                  key={r.name}
                  fill={r.net < 0 ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))"}
                />
              ))}
              <LabelList
                dataKey="net"
                position="right"
                offset={8}
                className="fill-slate-600"
                fontSize={11}
                formatter={(v: number) => fmtCurrency.format(v)}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}
