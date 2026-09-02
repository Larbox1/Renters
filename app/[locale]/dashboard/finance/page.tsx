import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession } from "@/lib/auth/current-user";
import { currencyFor, type CurrencyCode } from "@/lib/currency";
import { convertCents, eurToUsdRate } from "@/lib/fx";
import { loanFigures } from "@/lib/loan";
import { makeMoneyFormatter } from "@/lib/money";
import {
  CashflowChart,
  type MonthlyCashflow,
} from "@/components/cashflow-chart";
import { AddTransactionModal } from "./transaction-modal";
import { DatePicker } from "@/components/ui/date-picker";
import { CategoryPie } from "./category-pie";
import { CollectionCard } from "./collection-card";
import { AssetsTable, type AssetRow, type AssetTotals } from "./assets-table";
import { RentRollTable, type RentRollLease } from "./rent-roll-table";
import { TransactionsTable, type TransactionRow } from "./transactions-table";
import {
  PIE_SLOTS,
  PIE_UNCATEGORIZED,
  type PieSlice,
} from "@/lib/category-colors";

type PropertyRow = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  country: string | null;
  value_cents: number | null;
  market_value_cents: number | null;
  acquisition_fees_cents: number | null;
  brokerage_fees_cents: number | null;
  works_cents: number | null;
};

type LoanRow = {
  property_id: string;
  principal_cents: number;
  annual_rate_bps: number;
  start_date: string;
  end_date: string;
};

type ActiveLease = RentRollLease & { deposit_cents: number };

function propertyLabel(p: PropertyRow): string {
  return p.label ?? `${p.address}, ${p.city}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Calendar months touched by [from, to], for the expected-rent estimate. */
function monthsInRange(from: string, to: string): number {
  const months =
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    (Number(to.slice(5, 7)) - Number(from.slice(5, 7))) +
    1;
  return Math.max(1, Math.min(120, months));
}

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    property?: string;
    kind?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== "owner") {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  // Transactions date range, defaulting to the current calendar month.
  const sp = await searchParams;
  const now = new Date();
  const from = ISO_DATE.test(sp.from ?? "")
    ? (sp.from as string)
    : isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = ISO_DATE.test(sp.to ?? "")
    ? (sp.to as string)
    : isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const propertyFilter = (sp.property ?? "").trim() || null;
  // The kind filter narrows only the transactions listing; totals, donuts and
  // the collection tracker always look at both sides.
  const kindFilter =
    sp.kind === "income" || sp.kind === "expense" ? sp.kind : null;

  // Trailing 12 months feed the cashflow chart and the net-yield hint,
  // independent of the selected range.
  const chartWindowStart = isoDate(
    new Date(now.getFullYear(), now.getMonth() - 11, 1),
  );

  let rangeQuery = session.supabase
    .from("finance_transactions")
    .select("id, property_id, kind, category, amount_cents, occurred_on, note")
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (propertyFilter) rangeQuery = rangeQuery.eq("property_id", propertyFilter);

  let chartQuery = session.supabase
    .from("finance_transactions")
    .select("kind, amount_cents, occurred_on, property_id")
    .gte("occurred_on", chartWindowStart);
  if (propertyFilter) chartQuery = chartQuery.eq("property_id", propertyFilter);

  const [propsRes, leasesRes, txRes, loansRes, chartRes] = await Promise.all([
    session.supabase
      .from("properties")
      .select(
        "id, label, address, city, country, value_cents, market_value_cents, acquisition_fees_cents, brokerage_fees_cents, works_cents",
      )
      .order("created_at", { ascending: false }),
    session.supabase
      .from("leases")
      .select(
        "property_id, monthly_rent_cents, deposit_cents, tenants(full_name)",
      )
      .eq("status", "active"),
    rangeQuery,
    session.supabase
      .from("property_loans")
      .select(
        "property_id, principal_cents, annual_rate_bps, start_date, end_date",
      ),
    chartQuery,
  ]);

  const properties = (propsRes.data ?? []) as PropertyRow[];
  const activeLeases = (leasesRes.data ?? []) as ActiveLease[];
  const transactions = (txRes.data ?? []) as TransactionRow[];
  const loans = (loansRes.data ?? []) as LoanRow[];
  const chartTx = (chartRes.data ?? []) as {
    kind: string;
    amount_cents: number;
    occurred_on: string;
    property_id: string;
  }[];

  const propertyLabelById = new Map(
    properties.map((p) => [p.id, propertyLabel(p)] as const),
  );

  // Each property's own country decides the currency it transacts in. Rows
  // display in that currency; cross-property totals convert into the
  // operator's currency at the ECB daily EUR/USD rate so a mixed FR/US
  // portfolio sums correctly instead of adding € and $ cents together.
  const currency = currencyFor(session.operationCountry);
  const propertyCurrency = (p: PropertyRow) =>
    currencyFor(p.country === "US" ? "US" : "FR");
  const currencyByProperty = new Map(
    properties.map((p) => [p.id, propertyCurrency(p)] as const),
  );
  const currencyOf = (propertyId: string): CurrencyCode =>
    currencyByProperty.get(propertyId) ?? currency;
  const hasMixedCurrencies = new Set(currencyByProperty.values()).size > 1;
  const eurToUsd = await eurToUsdRate();
  const toDisplay = (cents: number, from: CurrencyCode) =>
    convertCents(cents, from, currency, eurToUsd);

  const money = makeMoneyFormatter(locale as Locale);
  const fmtCurrency = (cents: number) => money(cents, currency);

  const recordedIncomeCents = transactions
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + toDisplay(t.amount_cents, currencyOf(t.property_id)), 0);
  const recordedExpenseCents = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + toDisplay(t.amount_cents, currencyOf(t.property_id)), 0);
  const netCashflowCents = recordedIncomeCents - recordedExpenseCents;

  // Group active leases by property so a property with multiple tenants is
  // accounted correctly.
  const leasesByProperty = new Map<string, ActiveLease[]>();
  for (const l of activeLeases) {
    const list = leasesByProperty.get(l.property_id) ?? [];
    list.push(l);
    leasesByProperty.set(l.property_id, list);
  }

  const monthlyIncomeCents = activeLeases.reduce(
    (s, l) => s + toDisplay(l.monthly_rent_cents ?? 0, currencyOf(l.property_id)),
    0,
  );
  const annualIncomeCents = monthlyIncomeCents * 12;
  const depositsCents = activeLeases.reduce(
    (s, l) => s + toDisplay(l.deposit_cents ?? 0, currencyOf(l.property_id)),
    0,
  );
  const portfolioValueCents = properties.reduce(
    (s, p) => s + toDisplay(p.value_cents ?? 0, propertyCurrency(p)),
    0,
  );
  const yieldPct =
    portfolioValueCents > 0
      ? (annualIncomeCents / portfolioValueCents) * 100
      : 0;

  const today = new Date().toISOString().slice(0, 10);

  // Real-estate assets: borrowed / still-owed amounts are aggregated per
  // property; the remaining balance is derived from the loan inputs (see
  // lib/loan) exactly as the property screen shows it.
  const loansByProperty = new Map<string, LoanRow[]>();
  for (const l of loans) {
    const list = loansByProperty.get(l.property_id) ?? [];
    list.push(l);
    loansByProperty.set(l.property_id, list);
  }

  const assetRows: AssetRow[] = properties.map((p) => {
    const propertyLoans = loansByProperty.get(p.id) ?? [];
    const loanAmount = propertyLoans.reduce(
      (s, l) => s + (l.principal_cents ?? 0),
      0,
    );
    const remainingLoan = propertyLoans.reduce((s, l) => {
      const f = loanFigures({
        principalCents: l.principal_cents,
        annualRateBps: l.annual_rate_bps,
        startDate: l.start_date,
        endDate: l.end_date,
      });
      return s + (f?.remainingCents ?? 0);
    }, 0);

    const purchasePrice = p.value_cents ?? 0;
    const fees = (p.acquisition_fees_cents ?? 0) + (p.brokerage_fees_cents ?? 0);
    const works = p.works_cents ?? 0;

    return {
      property: { id: p.id, label: p.label, address: p.address, city: p.city },
      currency: propertyCurrency(p),
      purchasePrice,
      fees,
      works,
      totalCost: purchasePrice + fees + works,
      loanAmount,
      remainingLoan,
      marketValue: p.market_value_cents,
    };
  });

  // Totals are shown in the operator's own currency; rows in another currency
  // convert at the ECB rate before summing.
  const assetTotals: AssetTotals = assetRows.reduce(
    (acc, r) => ({
      purchasePrice: acc.purchasePrice + toDisplay(r.purchasePrice, r.currency),
      fees: acc.fees + toDisplay(r.fees, r.currency),
      works: acc.works + toDisplay(r.works, r.currency),
      totalCost: acc.totalCost + toDisplay(r.totalCost, r.currency),
      loanAmount: acc.loanAmount + toDisplay(r.loanAmount, r.currency),
      remainingLoan: acc.remainingLoan + toDisplay(r.remainingLoan, r.currency),
      marketValue: acc.marketValue + toDisplay(r.marketValue ?? 0, r.currency),
    }),
    {
      purchasePrice: 0,
      fees: 0,
      works: 0,
      totalCost: 0,
      loanAmount: 0,
      remainingLoan: 0,
      marketValue: 0,
    },
  );

  const equityCents =
    assetTotals.marketValue > 0
      ? assetTotals.marketValue - assetTotals.remainingLoan
      : null;

  // Cashflow chart: trailing 12 monthly buckets in the display currency.
  const cashflow: MonthlyCashflow[] = [];
  {
    const byMonth = new Map<string, MonthlyCashflow>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const bucket: MonthlyCashflow = {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        incomeCents: 0,
        expenseCents: 0,
      };
      cashflow.push(bucket);
      byMonth.set(bucket.month, bucket);
    }
    for (const t of chartTx) {
      const bucket = byMonth.get(t.occurred_on.slice(0, 7));
      if (!bucket) continue;
      const cents = toDisplay(t.amount_cents, currencyOf(t.property_id));
      if (t.kind === "income") bucket.incomeCents += cents;
      else if (t.kind === "expense") bucket.expenseCents += cents;
    }
  }

  // Net-yield hint: annual rent minus the last 12 months of recorded
  // expenses, over the full acquisition cost (price + fees + works).
  const trailingExpensesCents = cashflow.reduce(
    (s, m) => s + m.expenseCents,
    0,
  );
  const netYieldPct =
    assetTotals.totalCost > 0
      ? ((annualIncomeCents - trailingExpensesCents) / assetTotals.totalCost) *
        100
      : null;

  // Rent collection for the range: expected = rent roll × months in range
  // (scoped by the property filter), collected = recorded "rent" income.
  const collectionLeases = propertyFilter
    ? activeLeases.filter((l) => l.property_id === propertyFilter)
    : activeLeases;
  const months = monthsInRange(from, to);
  const expectedRentCents =
    collectionLeases.reduce(
      (s, l) =>
        s + toDisplay(l.monthly_rent_cents ?? 0, currencyOf(l.property_id)),
      0,
    ) * months;
  const collectedRentCents = transactions
    .filter((t) => t.kind === "income" && t.category === "rent")
    .reduce((s, t) => s + toDisplay(t.amount_cents, currencyOf(t.property_id)), 0);
  const outstandingCents = expectedRentCents - collectedRentCents;

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: propertyLabel(p),
    currency: propertyCurrency(p),
  }));

  const txDict = dict.finance.transactions;
  const categoryLabel = (t: TransactionRow): string | null => {
    if (!t.category) return null;
    const map =
      t.kind === "income"
        ? txDict.incomeCategories
        : txDict.expenseCategories;
    return (map as Record<string, string>)[t.category] ?? t.category;
  };
  // Same entity→color mapping as the donuts, so a category wears one hue
  // across chart, legend and table.
  const categoryColor = (t: TransactionRow): string => {
    const keys = Object.keys(
      t.kind === "income" ? txDict.incomeCategories : txDict.expenseCategories,
    );
    const i = t.category ? keys.indexOf(t.category) : -1;
    return i >= 0 ? PIE_SLOTS[i % PIE_SLOTS.length] : PIE_UNCATEGORIZED;
  };

  // Category donuts, scoped by the same from/to range as the transactions
  // list. Slices follow the fixed category order so a category keeps its
  // color whatever the range shows; unknown/absent categories fold into a
  // gray "Uncategorized" bucket. Amounts convert into the display currency
  // like every other cross-property total.
  const categorySlices = (kind: "income" | "expense"): PieSlice[] => {
    const labels: Record<string, string> =
      kind === "income" ? txDict.incomeCategories : txDict.expenseCategories;
    const keys = Object.keys(labels);
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== kind) continue;
      const key = t.category && keys.includes(t.category) ? t.category : "__other";
      totals.set(
        key,
        (totals.get(key) ?? 0) +
          toDisplay(t.amount_cents, currencyOf(t.property_id)),
      );
    }
    const slices: PieSlice[] = keys.map((key, i) => ({
      key,
      label: labels[key],
      cents: totals.get(key) ?? 0,
      formatted: fmtCurrency(totals.get(key) ?? 0),
      color: PIE_SLOTS[i % PIE_SLOTS.length],
    }));
    slices.push({
      key: "__other",
      label: dict.finance.charts.uncategorized,
      cents: totals.get("__other") ?? 0,
      formatted: fmtCurrency(totals.get("__other") ?? 0),
      color: PIE_UNCATEGORIZED,
    });
    return slices.filter((s) => s.cents > 0);
  };
  const incomeSlices = categorySlices("income");
  const expenseSlices = categorySlices("expense");

  // The kind filter narrows the listing only.
  const tableTransactions = kindFilter
    ? transactions.filter((t) => t.kind === kindFilter)
    : transactions;

  // Preset ranges keep the property/kind filters; the export link keeps the
  // property filter (the CSV always carries both kinds).
  const filterQuery = (f: string, t: string) => {
    const q = new URLSearchParams({ from: f, to: t });
    if (propertyFilter) q.set("property", propertyFilter);
    if (kindFilter) q.set("kind", kindFilter);
    return `?${q.toString()}`;
  };
  const y = now.getFullYear();
  const m = now.getMonth();
  const presets = [
    {
      key: "thisMonth" as const,
      from: isoDate(new Date(y, m, 1)),
      to: isoDate(new Date(y, m + 1, 0)),
    },
    {
      key: "lastMonth" as const,
      from: isoDate(new Date(y, m - 1, 1)),
      to: isoDate(new Date(y, m, 0)),
    },
    {
      key: "thisYear" as const,
      from: `${y}-01-01`,
      to: `${y}-12-31`,
    },
    {
      key: "last12Months" as const,
      from: isoDate(new Date(y, m - 11, 1)),
      to: isoDate(new Date(y, m + 1, 0)),
    },
  ];
  const exportQuery = (() => {
    const q = new URLSearchParams({ from, to });
    if (propertyFilter) q.set("property", propertyFilter);
    return `?${q.toString()}`;
  })();

  const selectClass =
    "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="px-6 py-12">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {dict.finance.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{dict.finance.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/${locale}/dashboard/finance/export${exportQuery}`}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            {txDict.export}
          </a>
          <AddTransactionModal
            locale={locale as Locale}
            dict={txDict}
            properties={propertyOptions}
            today={today}
            currency={currency}
          />
        </div>
      </div>

      {/* Range + filters (plain GET form) with one-click presets */}
      <div className="mb-8 space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="tx-from"
            className="text-sm font-medium text-slate-600"
          >
            {dict.finance.range.from}
          </label>
          <DatePicker
            id="tx-from"
            name="from"
            defaultValue={from}
            displayFormat="P"
            className="mt-0 w-36 rounded-md px-2 py-1"
          />
          <label htmlFor="tx-to" className="text-sm font-medium text-slate-600">
            {dict.finance.range.to}
          </label>
          <DatePicker
            id="tx-to"
            name="to"
            defaultValue={to}
            displayFormat="P"
            className="mt-0 w-36 rounded-md px-2 py-1"
          />
          <select
            name="property"
            defaultValue={propertyFilter ?? ""}
            aria-label={txDict.fields.property}
            className={selectClass}
          >
            <option value="">{dict.finance.filters.allProperties}</option>
            {propertyOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            name="kind"
            defaultValue={kindFilter ?? ""}
            aria-label={txDict.cols.category}
            className={selectClass}
          >
            <option value="">{dict.finance.filters.allKinds}</option>
            <option value="income">{txDict.kind.income}</option>
            <option value="expense">{txDict.kind.expense}</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
          >
            {dict.finance.range.apply}
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
          {presets.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link
                key={p.key}
                href={filterQuery(p.from, p.to)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {dict.finance.range.presets[p.key]}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-6">
        <StatCard
          label={dict.finance.stats.monthlyIncome}
          value={fmtCurrency(monthlyIncomeCents)}
          tone="emerald"
        />
        <StatCard
          label={dict.finance.stats.annualIncome}
          value={fmtCurrency(annualIncomeCents)}
          hint={dict.finance.stats.annualHint}
          tone="emerald"
        />
        <StatCard
          label={dict.finance.stats.deposits}
          value={fmtCurrency(depositsCents)}
          tone="brand"
        />
        <StatCard
          label={dict.finance.stats.portfolioValue}
          value={fmtCurrency(portfolioValueCents)}
          tone="brand"
        />
        <StatCard
          label={dict.finance.stats.equity}
          value={equityCents != null ? fmtCurrency(equityCents) : "—"}
          hint={dict.finance.stats.equityHint}
          tone="brand"
        />
        <StatCard
          label={dict.finance.stats.yield}
          value={`${yieldPct.toFixed(1)}%`}
          hint={
            netYieldPct != null
              ? dict.finance.stats.netYieldHint.replace(
                  "{pct}",
                  netYieldPct.toFixed(1),
                )
              : undefined
          }
          tone="emerald"
        />
      </div>

      {/* Only worth mentioning when a conversion actually happened. */}
      {hasMixedCurrencies && (
        <p className="-mt-6 mb-8 text-xs text-slate-500">
          {dict.finance.fxNote.replace(
            "{rate}",
            new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
              maximumFractionDigits: 4,
            }).format(eurToUsd),
          )}
        </p>
      )}

      <AssetsTable
        locale={locale as Locale}
        rows={assetRows}
        totals={assetTotals}
        currency={currency}
        money={money}
        dict={dict.finance.assets}
      />

      <RentRollTable
        properties={properties}
        leasesByProperty={leasesByProperty}
        currencyOf={currencyOf}
        money={money}
        totalFormatted={fmtCurrency(monthlyIncomeCents)}
        dict={dict.finance.breakdown}
      />

      {/* Recorded income & expenses */}
      <section className="mt-8">
        <div className="mb-4 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={txDict.recordedIncome}
            value={fmtCurrency(recordedIncomeCents)}
            tone="emerald"
            tinted
          />
          <StatCard
            label={txDict.recordedExpenses}
            value={fmtCurrency(recordedExpenseCents)}
            tone="red"
            tinted
          />
          <StatCard
            label={txDict.netCashflow}
            value={fmtCurrency(netCashflowCents)}
            tone={netCashflowCents >= 0 ? "emerald" : "red"}
            tinted
          />
        </div>

        {expectedRentCents > 0 && (
          <CollectionCard
            collected={fmtCurrency(collectedRentCents)}
            expected={fmtCurrency(expectedRentCents)}
            fraction={
              expectedRentCents > 0 ? collectedRentCents / expectedRentCents : 0
            }
            outstanding={
              outstandingCents > 0 ? fmtCurrency(outstandingCents) : null
            }
            months={months}
            dict={dict.finance.collection}
          />
        )}

        <div className="mb-4">
          <CashflowChart
            locale={locale as Locale}
            data={cashflow}
            dict={dict.dashboard.cashflow}
            currency={currency}
          />
        </div>

        {/* Category breakdown of the same date range as the table below. */}
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {dict.finance.charts.incomeByCategory}
              </h2>
            </div>
            <div className="px-5 py-4">
              <CategoryPie
                locale={locale as Locale}
                slices={incomeSlices}
                totalFormatted={fmtCurrency(recordedIncomeCents)}
                totalLabel={dict.finance.charts.total}
                emptyLabel={dict.finance.charts.emptyIncome}
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {dict.finance.charts.expensesByCategory}
              </h2>
            </div>
            <div className="px-5 py-4">
              <CategoryPie
                locale={locale as Locale}
                slices={expenseSlices}
                totalFormatted={fmtCurrency(recordedExpenseCents)}
                totalLabel={dict.finance.charts.total}
                emptyLabel={dict.finance.charts.emptyExpenses}
              />
            </div>
          </div>
        </div>

        <TransactionsTable
          locale={locale as Locale}
          transactions={tableTransactions}
          propertyLabelById={propertyLabelById}
          currencyOf={currencyOf}
          money={money}
          categoryLabel={categoryLabel}
          categoryColor={categoryColor}
          propertyOptions={propertyOptions}
          displayCurrency={currency}
          today={today}
          dict={txDict}
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  tinted = false,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Colors the value; income/positive = emerald, expense/negative = red. */
  tone?: "emerald" | "red" | "brand";
  /** Washes the whole card in the tone — for the recorded income/expense trio. */
  tinted?: boolean;
}) {
  const cardClass =
    tinted && tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/60"
      : tinted && tone === "red"
        ? "border-red-200 bg-red-50/60"
        : "border-slate-200 bg-white";
  const valueClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
        ? "text-red-600"
        : tone === "brand"
          ? "text-brand-700"
          : "text-slate-900";
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${cardClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
