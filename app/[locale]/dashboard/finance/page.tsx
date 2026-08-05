import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getCurrentSession } from "@/lib/auth/current-user";
import { currencyFor, type CurrencyCode } from "@/lib/currency";
import { loanFigures } from "@/lib/loan";
import { AddTransactionModal } from "./transaction-modal";
import { deleteTransactionAction } from "./actions";

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

/** One row of the real-estate assets table; all amounts in cents. */
type AssetRow = {
  property: PropertyRow;
  currency: CurrencyCode;
  purchasePrice: number;
  fees: number;
  works: number;
  totalCost: number;
  loanAmount: number;
  remainingLoan: number;
  marketValue: number | null;
};

type ActiveLease = {
  property_id: string;
  monthly_rent_cents: number;
  deposit_cents: number;
  tenants:
    | { full_name: string }
    | { full_name: string }[]
    | null;
};

type Transaction = {
  id: string;
  property_id: string;
  kind: "income" | "expense";
  category: string | null;
  amount_cents: number;
  occurred_on: string;
  note: string | null;
};

function tenantName(t: ActiveLease["tenants"]): string | null {
  if (!t) return null;
  if (Array.isArray(t)) return t[0]?.full_name ?? null;
  return t.full_name;
}

function propertyLabel(p: PropertyRow): string {
  return p.label ?? `${p.address}, ${p.city}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
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

  const [propsRes, leasesRes, txRes, loansRes] = await Promise.all([
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
    session.supabase
      .from("finance_transactions")
      .select(
        "id, property_id, kind, category, amount_cents, occurred_on, note",
      )
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    session.supabase
      .from("property_loans")
      .select(
        "property_id, principal_cents, annual_rate_bps, start_date, end_date",
      ),
  ]);

  const properties = (propsRes.data ?? []) as PropertyRow[];
  const activeLeases = (leasesRes.data ?? []) as ActiveLease[];
  const transactions = (txRes.data ?? []) as Transaction[];
  const loans = (loansRes.data ?? []) as LoanRow[];

  const propertyLabelById = new Map(
    properties.map((p) => [p.id, propertyLabel(p)] as const),
  );

  const recordedIncomeCents = transactions
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount_cents, 0);
  const recordedExpenseCents = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + t.amount_cents, 0);
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
    (s, l) => s + (l.monthly_rent_cents ?? 0),
    0,
  );
  const annualIncomeCents = monthlyIncomeCents * 12;
  const depositsCents = activeLeases.reduce(
    (s, l) => s + (l.deposit_cents ?? 0),
    0,
  );
  const portfolioValueCents = properties.reduce(
    (s, p) => s + (p.value_cents ?? 0),
    0,
  );
  const yieldPct =
    portfolioValueCents > 0
      ? (annualIncomeCents / portfolioValueCents) * 100
      : 0;

  const currency = currencyFor(session.operationCountry);
  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const fmtCurrencyPrecise = (cents: number, code = currency) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: code,
    }).format(cents / 100);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

  const today = new Date().toISOString().slice(0, 10);

  // Each property's own country decides the currency it transacts in.
  const propertyCurrency = (p: PropertyRow) =>
    currencyFor(p.country === "US" ? "US" : "FR");
  const currencyByProperty = new Map(
    properties.map((p) => [p.id, propertyCurrency(p)] as const),
  );

  const fmtCurrencyIn = (cents: number, code: CurrencyCode) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(cents / 100);

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
      property: p,
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

  // Totals mix currencies on a multi-country portfolio; they are shown in the
  // operator's own currency, like the portfolio-value stat above.
  const assetTotals = assetRows.reduce(
    (acc, r) => ({
      purchasePrice: acc.purchasePrice + r.purchasePrice,
      fees: acc.fees + r.fees,
      works: acc.works + r.works,
      totalCost: acc.totalCost + r.totalCost,
      loanAmount: acc.loanAmount + r.loanAmount,
      remainingLoan: acc.remainingLoan + r.remainingLoan,
      marketValue: acc.marketValue + (r.marketValue ?? 0),
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

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: propertyLabel(p),
    currency: propertyCurrency(p),
  }));

  const txDict = dict.finance.transactions;
  const categoryLabel = (t: Transaction): string | null => {
    if (!t.category) return null;
    const map =
      t.kind === "income"
        ? txDict.incomeCategories
        : txDict.expenseCategories;
    return (map as Record<string, string>)[t.category] ?? t.category;
  };

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
          {/* Date range for recorded transactions (GET form, no client JS) */}
          <form
            method="get"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
          >
            <label
              htmlFor="tx-from"
              className="text-sm font-medium text-slate-600"
            >
              {dict.finance.range.from}
            </label>
            <input
              id="tx-from"
              name="from"
              type="date"
              defaultValue={from}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <label
              htmlFor="tx-to"
              className="text-sm font-medium text-slate-600"
            >
              {dict.finance.range.to}
            </label>
            <input
              id="tx-to"
              name="to"
              type="date"
              defaultValue={to}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
            >
              {dict.finance.range.apply}
            </button>
          </form>
          <AddTransactionModal
            locale={locale as Locale}
            dict={dict.finance.transactions}
            properties={propertyOptions}
            today={today}
            currency={currency}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={dict.finance.stats.monthlyIncome}
          value={fmtCurrency(monthlyIncomeCents)}
        />
        <StatCard
          label={dict.finance.stats.annualIncome}
          value={fmtCurrency(annualIncomeCents)}
          hint={dict.finance.stats.annualHint}
        />
        <StatCard
          label={dict.finance.stats.deposits}
          value={fmtCurrency(depositsCents)}
        />
        <StatCard
          label={dict.finance.stats.portfolioValue}
          value={fmtCurrency(portfolioValueCents)}
        />
        <StatCard
          label={dict.finance.stats.yield}
          value={`${yieldPct.toFixed(1)}%`}
        />
      </div>

      {/* Real estate assets */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {dict.finance.assets.heading}
          </h2>
        </div>
        {assetRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            {dict.finance.assets.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    {dict.finance.assets.cols.property}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.purchasePrice}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.fees}
                    <span className="block text-[11px] font-normal text-slate-400">
                      {dict.finance.assets.cols.feesHint}
                    </span>
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.works}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.totalCost}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.loanAmount}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.remainingLoan}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.assets.cols.marketValue}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assetRows.map((r) => {
                  // Zero means "nothing recorded" for every money column here,
                  // so a dash reads better than a formatted 0.
                  const amount = (cents: number | null) =>
                    cents ? fmtCurrencyIn(cents, r.currency) : "—";
                  return (
                    <tr key={r.property.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {r.property.label ?? r.property.address}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.property.address}, {r.property.city}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {amount(r.purchasePrice)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {amount(r.fees)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {amount(r.works)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                        {amount(r.totalCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {amount(r.loanAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                        {amount(r.remainingLoan)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                        {amount(r.marketValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    {dict.finance.assets.total}
                  </td>
                  {[
                    assetTotals.purchasePrice,
                    assetTotals.fees,
                    assetTotals.works,
                    assetTotals.totalCost,
                    assetTotals.loanAmount,
                    assetTotals.remainingLoan,
                    assetTotals.marketValue,
                  ].map((cents, i) => (
                    <td
                      key={i}
                      className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-slate-900"
                    >
                      {cents ? fmtCurrency(cents) : "—"}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Breakdown */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {dict.finance.breakdown.heading}
          </h2>
        </div>
        {properties.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            {dict.finance.breakdown.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    {dict.finance.breakdown.property}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    {dict.finance.breakdown.status}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    {dict.finance.breakdown.tenant}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.finance.breakdown.rent}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map((p) => {
                  const leases = leasesByProperty.get(p.id) ?? [];
                  const propertyRent = leases.reduce(
                    (s, l) => s + (l.monthly_rent_cents ?? 0),
                    0,
                  );
                  const tenants = leases
                    .map((l) => tenantName(l.tenants))
                    .filter((n): n is string => Boolean(n));
                  const isVacant = leases.length === 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {p.label ?? p.address}
                        </p>
                        <p className="text-xs text-slate-500">
                          {p.address}, {p.city}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            isVacant
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isVacant
                            ? dict.finance.breakdown.vacant
                            : dict.finance.breakdown.rented}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {tenants.length > 0 ? tenants.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {isVacant ? "—" : fmtCurrency(propertyRent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-700"
                  >
                    {dict.finance.breakdown.total}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                    {fmtCurrency(monthlyIncomeCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Recorded income & expenses */}
      <section className="mt-8">
        <div className="mb-4 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={dict.finance.transactions.recordedIncome}
            value={fmtCurrency(recordedIncomeCents)}
          />
          <StatCard
            label={dict.finance.transactions.recordedExpenses}
            value={fmtCurrency(recordedExpenseCents)}
          />
          <StatCard
            label={dict.finance.transactions.netCashflow}
            value={fmtCurrency(netCashflowCents)}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {dict.finance.transactions.heading}
            </h2>
          </div>
          {transactions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-600">
              {dict.finance.transactions.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">
                      {dict.finance.transactions.cols.date}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">
                      {dict.finance.transactions.cols.property}
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">
                      {dict.finance.transactions.cols.category}
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">
                      {dict.finance.transactions.cols.amount}
                    </th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => {
                    const isIncome = t.kind === "income";
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {fmtDate(t.occurred_on)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {propertyLabelById.get(t.property_id) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {categoryLabel(t) ?? "—"}
                          {t.note && (
                            <p className="text-xs text-slate-500">{t.note}</p>
                          )}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                            isIncome ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {isIncome ? "+" : "−"}
                          {fmtCurrencyPrecise(
                            t.amount_cents,
                            currencyByProperty.get(t.property_id) ?? currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={deleteTransactionAction}>
                            <input
                              type="hidden"
                              name="locale"
                              value={locale}
                            />
                            <input type="hidden" name="id" value={t.id} />
                            <ConfirmSubmit
                              message={dict.finance.transactions.deleteConfirm}
                              className="text-xs font-medium text-slate-400 hover:text-red-600"
                            >
                              {dict.finance.transactions.delete}
                            </ConfirmSubmit>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
