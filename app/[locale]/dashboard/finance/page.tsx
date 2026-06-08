import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getCurrentSession } from "@/lib/auth/current-user";
import { AddTransactionModal } from "./transaction-modal";
import { deleteTransactionAction } from "./actions";

type PropertyRow = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  value_cents: number | null;
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

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
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

  const [propsRes, leasesRes, txRes] = await Promise.all([
    session.supabase
      .from("properties")
      .select("id, label, address, city, value_cents")
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
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const properties = (propsRes.data ?? []) as PropertyRow[];
  const activeLeases = (leasesRes.data ?? []) as ActiveLease[];
  const transactions = (txRes.data ?? []) as Transaction[];

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

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const fmtCurrencyPrecise = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

  const today = new Date().toISOString().slice(0, 10);

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: propertyLabel(p),
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
        <AddTransactionModal
          locale={locale as Locale}
          dict={dict.finance.transactions}
          properties={propertyOptions}
          today={today}
        />
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
                          {fmtCurrencyPrecise(t.amount_cents)}
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
