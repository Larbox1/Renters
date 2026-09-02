import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CurrencyCode } from "@/lib/currency";
import type { MoneyFormatter } from "@/lib/money";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteTransactionAction } from "./actions";
import {
  EditTransactionModal,
  type EditableTransaction,
} from "./transaction-modal";

export type TransactionRow = EditableTransaction;

export function TransactionsTable({
  locale,
  transactions,
  propertyLabelById,
  currencyOf,
  money,
  categoryLabel,
  categoryColor,
  propertyOptions,
  displayCurrency,
  today,
  dict,
}: {
  locale: Locale;
  transactions: TransactionRow[];
  propertyLabelById: Map<string, string>;
  currencyOf: (propertyId: string) => CurrencyCode;
  money: MoneyFormatter;
  categoryLabel: (t: TransactionRow) => string | null;
  categoryColor: (t: TransactionRow) => string;
  propertyOptions: { id: string; label: string; currency: CurrencyCode }[];
  displayCurrency: CurrencyCode;
  today: string;
  dict: Dictionary["finance"]["transactions"];
}) {
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {dict.heading}
        </h2>
      </div>
      {transactions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-600">{dict.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.cols.date}
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.cols.property}
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.cols.category}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">
                  {dict.cols.amount}
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
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: categoryColor(t) }}
                        />
                        {categoryLabel(t) ?? "—"}
                      </span>
                      {t.note && (
                        <p className="pl-4 text-xs text-slate-500">{t.note}</p>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                        isIncome ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {money(t.amount_cents, currencyOf(t.property_id), {
                        precise: true,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <EditTransactionModal
                          locale={locale}
                          dict={dict}
                          properties={propertyOptions}
                          today={today}
                          currency={displayCurrency}
                          transaction={t}
                        />
                        <form action={deleteTransactionAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmSubmit
                            message={dict.deleteConfirm}
                            className="text-xs font-medium text-slate-400 hover:text-red-600"
                          >
                            {dict.delete}
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
