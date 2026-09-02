"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CurrencyCode } from "@/lib/currency";
import { localizeCurrencyLabel } from "@/lib/currency";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionState,
} from "./actions";
import { DatePicker } from "@/components/ui/date-picker";

type PropertyOption = {
  id: string;
  label: string;
  currency: CurrencyCode;
};

export type EditableTransaction = {
  id: string;
  property_id: string;
  kind: "income" | "expense";
  category: string | null;
  amount_cents: number;
  occurred_on: string;
  note: string | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

function SubmitButton({ labels }: { labels: { idle: string; busy: string } }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? labels.busy : labels.idle}
    </button>
  );
}

function errorMessage(
  code: string,
  dict: Dictionary["finance"]["transactions"],
): string {
  switch (code) {
    case "property_required":
    case "property_not_found":
      return dict.errors.property;
    case "amount_required":
      return dict.errors.amount;
    case "date_required":
      return dict.errors.date;
    case "kind_required":
      return dict.errors.kind;
    default:
      return dict.errors.generic;
  }
}

function TransactionForm({
  locale,
  dict,
  properties,
  today,
  onSuccess,
  currency,
  transaction,
}: {
  locale: Locale;
  dict: Dictionary["finance"]["transactions"];
  properties: PropertyOption[];
  today: string;
  onSuccess: () => void;
  currency: CurrencyCode;
  /** When set, the form edits this row instead of creating one. */
  transaction?: EditableTransaction;
}) {
  const [state, formAction] = useActionState<TransactionState, FormData>(
    transaction ? updateTransactionAction : createTransactionAction,
    {},
  );
  const [kind, setKind] = useState<"income" | "expense">(
    transaction?.kind ?? "income",
  );
  const [propertyId, setPropertyId] = useState(transaction?.property_id ?? "");

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state, onSuccess]);

  // The selected property's country decides the currency of the amount.
  const activeCurrency =
    properties.find((p) => p.id === propertyId)?.currency ?? currency;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <div className="grid grid-cols-2 gap-2">
        {(["income", "expense"] as const).map((k) => (
          <label
            key={k}
            className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${
              kind === k
                ? k === "income"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-red-500 bg-red-50 text-red-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="sr-only"
            />
            {dict.kind[k]}
          </label>
        ))}
      </div>

      <div>
        <label className={labelClass}>
          {dict.fields.property} <span className="text-red-500">*</span>
        </label>
        <select
          name="property_id"
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            {dict.fields.propertyPlaceholder}
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            {localizeCurrencyLabel(dict.fields.amount, activeCurrency)}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            name="amount_cents"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={
              transaction ? (transaction.amount_cents / 100).toFixed(2) : ""
            }
            placeholder={dict.fields.amountPlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.date} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            name="occurred_on"
            required
            defaultValue={transaction?.occurred_on ?? today}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{dict.fields.category}</label>
        <select
          // Remount on kind change so the value resets to the placeholder
          // (income and expense have disjoint category lists).
          key={kind}
          name="category"
          defaultValue={
            kind === transaction?.kind ? (transaction?.category ?? "") : ""
          }
          className={selectClass}
        >
          <option value="">{dict.fields.categoryPlaceholder}</option>
          {Object.entries(
            kind === "income" ? dict.incomeCategories : dict.expenseCategories,
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{dict.fields.note}</label>
        <input
          name="note"
          type="text"
          defaultValue={transaction?.note ?? ""}
          placeholder={dict.fields.notePlaceholder}
          className={inputClass}
        />
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(state.error, dict)}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <SubmitButton
          labels={{ idle: dict.submit, busy: dict.submitting }}
        />
      </div>
    </form>
  );
}

function ModalShell({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function AddTransactionModal({
  locale,
  dict,
  properties,
  today,
  currency,
}: {
  locale: Locale;
  dict: Dictionary["finance"]["transactions"];
  properties: PropertyOption[];
  today: string;
  currency: CurrencyCode;
}) {
  const [open, setOpen] = useState(false);
  // Bumped on each open so the inner form (and its action state) remounts fresh.
  const [formKey, setFormKey] = useState(0);

  const openModal = () => {
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const disabled = properties.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={disabled}
        title={disabled ? dict.noProperties : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        {dict.addButton}
      </button>

      {open && (
        <ModalShell
          title={dict.modalTitle}
          closeLabel={dict.close}
          onClose={() => setOpen(false)}
        >
          <TransactionForm
            key={formKey}
            locale={locale}
            dict={dict}
            properties={properties}
            today={today}
            onSuccess={() => setOpen(false)}
            currency={currency}
          />
        </ModalShell>
      )}
    </>
  );
}

export function EditTransactionModal({
  locale,
  dict,
  properties,
  today,
  currency,
  transaction,
}: {
  locale: Locale;
  dict: Dictionary["finance"]["transactions"];
  properties: PropertyOption[];
  today: string;
  currency: CurrencyCode;
  transaction: EditableTransaction;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFormKey((k) => k + 1);
          setOpen(true);
        }}
        className="text-xs font-medium text-slate-400 hover:text-brand-700"
      >
        {dict.edit}
      </button>

      {open && (
        <ModalShell
          title={dict.modalTitleEdit}
          closeLabel={dict.close}
          onClose={() => setOpen(false)}
        >
          <TransactionForm
            key={formKey}
            locale={locale}
            dict={dict}
            properties={properties}
            today={today}
            onSuccess={() => setOpen(false)}
            currency={currency}
            transaction={transaction}
          />
        </ModalShell>
      )}
    </>
  );
}
