"use client";

import { useActionState, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { localizeCurrencyLabel, type CurrencyCode } from "@/lib/currency";
import { amortizationPoints, loanFigures, rateBpsToPercent } from "@/lib/loan";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  createLoanAction,
  updateLoanAction,
  deleteLoanAction,
  type LoanState,
} from "../loan-actions";

export type PropertyLoan = {
  id: string;
  label: string | null;
  principal_cents: number;
  annual_rate_bps: number;
  start_date: string;
  end_date: string;
};

type LoansDict = Dictionary["properties"]["loans"];

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

function LoanForm({
  locale,
  dict,
  propertyId,
  currency,
  loan,
  onDone,
}: {
  locale: Locale;
  dict: LoansDict;
  propertyId: string;
  currency: CurrencyCode;
  loan?: PropertyLoan;
  onDone: () => void;
}) {
  const action = loan ? updateLoanAction : createLoanAction;
  const [state, formAction, pending] = useActionState<LoanState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.saved) onDone();
  }, [state, onDone]);

  const money = (label: string) => localizeCurrencyLabel(label, currency);

  return (
    <form
      action={formAction}
      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="property_id" value={propertyId} />
      {loan && <input type="hidden" name="id" value={loan.id} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelClass}>{dict.fields.label}</label>
          <input
            name="label"
            type="text"
            defaultValue={loan?.label ?? ""}
            placeholder={dict.fields.labelPlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {money(dict.fields.principal)}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            name="principal"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={
              loan ? (loan.principal_cents / 100).toString() : ""
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.rate} <span className="text-red-500">*</span>
          </label>
          <input
            name="rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={loan ? rateBpsToPercent(loan.annual_rate_bps) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.startDate} <span className="text-red-500">*</span>
          </label>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={loan?.start_date ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.endDate} <span className="text-red-500">*</span>
          </label>
          <input
            name="end_date"
            type="date"
            required
            defaultValue={loan?.end_date ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-600">
          {dict.errors[state.error as keyof LoansDict["errors"]] ??
            dict.errors.generic}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? dict.saving : dict.save}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          {dict.cancel}
        </button>
      </div>
    </form>
  );
}

export function LoansSection({
  locale,
  dict,
  propertyId,
  currency,
  loans,
}: {
  locale: Locale;
  dict: LoansDict;
  propertyId: string;
  currency: CurrencyCode;
  loans: PropertyLoan[];
}) {
  // null = closed, "new" = add form, otherwise the id of the loan being edited.
  const [editing, setEditing] = useState<string | null>(null);

  const intlLocale = locale === "fr" ? "fr-FR" : "en-US";
  const fmtWhole = (cents: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  const fmtExact = (cents: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(cents / 100);
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(
      new Date(iso),
    );

  const figures = loans.map((l) =>
    loanFigures({
      principalCents: l.principal_cents,
      annualRateBps: l.annual_rate_bps,
      startDate: l.start_date,
      endDate: l.end_date,
    }),
  );

  // Year-by-year amortization rows for one loan; each monthly payment is
  // attributed to the calendar year it falls in.
  const yearRows = (loan: PropertyLoan) => {
    const points = amortizationPoints({
      principalCents: loan.principal_cents,
      annualRateBps: loan.annual_rate_bps,
      startDate: loan.start_date,
      endDate: loan.end_date,
    });
    if (!points) return null;
    const start = new Date(loan.start_date);
    const rows = new Map<
      number,
      { interest: number; principal: number; balance: number }
    >();
    for (let m = 1; m < points.length; m++) {
      const year = new Date(
        start.getFullYear(),
        start.getMonth() + m,
        1,
      ).getFullYear();
      const row = rows.get(year) ?? { interest: 0, principal: 0, balance: 0 };
      row.interest +=
        points[m].cumulativeInterestCents - points[m - 1].cumulativeInterestCents;
      row.principal += points[m - 1].balanceCents - points[m].balanceCents;
      row.balance = points[m].balanceCents;
      rows.set(year, row);
    }
    return [...rows.entries()];
  };

  const thClass = "px-3 py-2 text-left font-semibold text-slate-600";
  const thRight = "px-3 py-2 text-right font-semibold text-slate-600";

  const monthlyTotal = figures.reduce(
    (s, f) => s + (f?.monthlyPaymentCents ?? 0),
    0,
  );
  const remainingTotal = figures.reduce(
    (s, f) => s + (f?.remainingCents ?? 0),
    0,
  );

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.title}
        </h2>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-400 hover:text-brand-700"
          >
            + {dict.add}
          </button>
        )}
      </div>

      {loans.length === 0 && editing === null && (
        <p className="text-sm text-slate-600">{dict.empty}</p>
      )}

      {loans.length > 1 && (
        <p className="mb-4 text-sm text-slate-600">
          {dict.summary.monthlyTotal}:{" "}
          <span className="font-semibold text-slate-900">
            {fmtExact(monthlyTotal)}
          </span>
          {" · "}
          {dict.summary.remainingTotal}:{" "}
          <span className="font-semibold text-slate-900">
            {fmtWhole(remainingTotal)}
          </span>
        </p>
      )}

      <ul className="space-y-4">
        {loans.map((loan, i) => {
          const f = figures[i];
          const rows = f ? yearRows(loan) : null;
          if (editing === loan.id) {
            return (
              <li key={loan.id}>
                <LoanForm
                  locale={locale}
                  dict={dict}
                  propertyId={propertyId}
                  currency={currency}
                  loan={loan}
                  onDone={() => setEditing(null)}
                />
              </li>
            );
          }
          return (
            <li
              key={loan.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {loan.label ?? dict.defaultLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {fmtWhole(loan.principal_cents)} ·{" "}
                    {rateBpsToPercent(loan.annual_rate_bps)}&nbsp;% ·{" "}
                    {fmtDate(loan.start_date)} → {fmtDate(loan.end_date)}
                    {f &&
                      ` · ${dict.figures.term.replace(
                        "{months}",
                        String(f.termMonths),
                      )}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(loan.id)}
                    className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
                  >
                    {dict.edit}
                  </button>
                  <form action={deleteLoanAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={loan.id} />
                    <input
                      type="hidden"
                      name="property_id"
                      value={propertyId}
                    />
                    <ConfirmSubmit
                      message={dict.confirmDelete}
                      className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline"
                    >
                      {dict.delete}
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>

              {f && (
                <>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs text-slate-500">
                        {dict.figures.monthlyPayment}
                      </dt>
                      <dd className="text-sm font-semibold text-slate-900">
                        {fmtExact(f.monthlyPaymentCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        {dict.figures.remaining}
                      </dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {fmtWhole(f.remainingCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        {dict.figures.totalInterest}
                      </dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {fmtWhole(f.totalInterestCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        {dict.figures.totalCost}
                      </dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {fmtWhole(f.totalCostCents)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.round(f.progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {dict.figures.repaid.replace(
                        "{percent}",
                        String(Math.round(f.progress * 100)),
                      )}
                    </p>
                  </div>
                  {rows && rows.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-brand-700">
                        {dict.schedule.title}
                      </summary>
                      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className={thClass}>
                                {dict.schedule.cols.year}
                              </th>
                              <th className={thRight}>
                                {dict.schedule.cols.interest}
                              </th>
                              <th className={thRight}>
                                {dict.schedule.cols.principal}
                              </th>
                              <th className={thRight}>
                                {dict.schedule.cols.balance}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rows.map(([year, row]) => (
                              <tr key={year}>
                                <td className="px-3 py-2 text-slate-700">
                                  {year}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  {fmtWhole(row.interest)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">
                                  {fmtWhole(row.principal)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-slate-900">
                                  {fmtWhole(row.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {editing === "new" && (
        <LoanForm
          locale={locale}
          dict={dict}
          propertyId={propertyId}
          currency={currency}
          onDone={() => setEditing(null)}
        />
      )}
    </section>
  );
}
