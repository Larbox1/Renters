import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CurrencyCode } from "@/lib/currency";
import type { MoneyFormatter } from "@/lib/money";

export type AssetPropertyRow = {
  id: string;
  label: string | null;
  address: string;
  city: string;
};

/** One row of the real-estate assets table; all amounts in cents. */
export type AssetRow = {
  property: AssetPropertyRow;
  currency: CurrencyCode;
  purchasePrice: number;
  fees: number;
  works: number;
  totalCost: number;
  loanAmount: number;
  remainingLoan: number;
  marketValue: number | null;
};

export type AssetTotals = {
  purchasePrice: number;
  fees: number;
  works: number;
  totalCost: number;
  loanAmount: number;
  remainingLoan: number;
  marketValue: number;
};

/** Signed amount + tone; capital gain and equity color by polarity. */
function SignedCell({ text, cents }: { text: string; cents: number }) {
  return (
    <span
      className={
        cents > 0
          ? "text-emerald-700"
          : cents < 0
            ? "text-red-600"
            : "text-slate-700"
      }
    >
      {text}
    </span>
  );
}

export function AssetsTable({
  locale,
  rows,
  totals,
  currency,
  money,
  dict,
}: {
  locale: Locale;
  rows: AssetRow[];
  totals: AssetTotals;
  /** Display currency for the totals row. */
  currency: CurrencyCode;
  money: MoneyFormatter;
  dict: Dictionary["finance"]["assets"];
}) {
  const fmtPct = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });

  const headRight = "px-4 py-2 text-right font-semibold text-slate-600";
  const cell = "whitespace-nowrap px-4 py-3 text-right text-slate-700";

  // Derived per-row; null when no market value is recorded.
  const gainOf = (r: AssetRow) =>
    r.marketValue != null ? r.marketValue - r.totalCost : null;
  const equityOf = (r: AssetRow) =>
    r.marketValue != null ? r.marketValue - r.remainingLoan : null;

  const totalGain =
    totals.marketValue > 0 ? totals.marketValue - totals.totalCost : null;
  const totalEquity =
    totals.marketValue > 0 ? totals.marketValue - totals.remainingLoan : null;

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {dict.heading}
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-600">{dict.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.cols.property}
                </th>
                <th className={headRight}>{dict.cols.purchasePrice}</th>
                <th className={headRight}>
                  {dict.cols.fees}
                  <span className="block text-[11px] font-normal text-slate-400">
                    {dict.cols.feesHint}
                  </span>
                </th>
                <th className={headRight}>{dict.cols.works}</th>
                <th className={headRight}>{dict.cols.totalCost}</th>
                <th className={headRight}>{dict.cols.loanAmount}</th>
                <th className={headRight}>{dict.cols.remainingLoan}</th>
                <th className={headRight}>{dict.cols.marketValue}</th>
                <th className={headRight}>{dict.cols.capitalGain}</th>
                <th className={headRight}>{dict.cols.equity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                // Zero means "nothing recorded" for every money column here,
                // so a dash reads better than a formatted 0.
                const amount = (cents: number | null) =>
                  cents ? money(cents, r.currency) : "—";
                const gain = gainOf(r);
                const equity = equityOf(r);
                return (
                  <tr key={r.property.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/dashboard/properties/${r.property.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                      >
                        {r.property.label ?? r.property.address}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {r.property.address}, {r.property.city}
                      </p>
                    </td>
                    <td className={cell}>{amount(r.purchasePrice)}</td>
                    <td className={cell}>{amount(r.fees)}</td>
                    <td className={cell}>{amount(r.works)}</td>
                    <td className={`${cell} font-medium text-slate-900`}>
                      {amount(r.totalCost)}
                    </td>
                    <td className={cell}>{amount(r.loanAmount)}</td>
                    <td className={cell}>{amount(r.remainingLoan)}</td>
                    <td className={`${cell} font-medium text-slate-900`}>
                      {amount(r.marketValue)}
                    </td>
                    <td className={cell}>
                      {gain == null ? (
                        "—"
                      ) : (
                        <SignedCell
                          cents={gain}
                          text={`${money(gain, r.currency)}${
                            r.totalCost > 0
                              ? ` (${fmtPct.format(gain / r.totalCost)})`
                              : ""
                          }`}
                        />
                      )}
                    </td>
                    <td className={`${cell} font-medium`}>
                      {equity == null ? (
                        "—"
                      ) : (
                        <SignedCell
                          cents={equity}
                          text={money(equity, r.currency)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                  {dict.total}
                </td>
                {[
                  totals.purchasePrice,
                  totals.fees,
                  totals.works,
                  totals.totalCost,
                  totals.loanAmount,
                  totals.remainingLoan,
                  totals.marketValue,
                ].map((cents, i) => (
                  <td
                    key={i}
                    className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-slate-900"
                  >
                    {cents ? money(cents, currency) : "—"}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold">
                  {totalGain == null ? (
                    "—"
                  ) : (
                    <SignedCell
                      cents={totalGain}
                      text={money(totalGain, currency)}
                    />
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold">
                  {totalEquity == null ? (
                    "—"
                  ) : (
                    <SignedCell
                      cents={totalEquity}
                      text={money(totalEquity, currency)}
                    />
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
