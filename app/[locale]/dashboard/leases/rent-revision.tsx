"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type IrlQuarter = { period: string; value: number };
type Bv = Dictionary["leases"]["fields"]["bailVide"];

// "2024-Q1" -> "T1 2024"
function formatQuarter(period: string): string {
  const [year, q] = period.split("-Q");
  return `T${q} ${year}`;
}

// "T1 2024" (or "2024-Q1") -> "2024-Q1", when parseable.
function labelToPeriod(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-Q[1-4]$/.test(trimmed)) return trimmed;
  const m = /T\s*([1-4]).*?(\d{4})/i.exec(trimmed);
  return m ? `${m[2]}-Q${m[1]}` : null;
}

// Same quarter, one year later — the index used for the annual revision.
function nextYearSameQuarter(period: string): string {
  const [year, q] = period.split("-Q");
  return `${Number(year) + 1}-Q${q}`;
}

function eurosToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

/**
 * IRL rent-revision fields: reference-quarter picker (fed live from INSEE),
 * annual revision date, and a computed "revised rent" preview with one-click
 * apply. Renders `irl_reference` and `revision_date` form fields itself.
 */
export function RentRevision({
  locale,
  bv,
  defaultReference,
  defaultRevisionDate,
  currentRentEuros,
  onApply,
}: {
  locale: Locale;
  bv: Bv;
  defaultReference: string | null;
  defaultRevisionDate: string | null;
  /** Current monthly rent in euros, as typed in the rent field. */
  currentRentEuros: string;
  /** Called with the revised rent (euros) when the user applies it. */
  onApply: (euros: string) => void;
}) {
  const [quarters, setQuarters] = useState<IrlQuarter[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<string>(
    defaultReference ? (labelToPeriod(defaultReference) ?? "") : "",
  );
  const [revisionDate, setRevisionDate] = useState<string>(
    defaultRevisionDate ?? "",
  );
  // The rent value that was applied, if any. Frozen so the preview doesn't
  // recompute (and compound) off the newly-raised rent after applying.
  const [appliedEuros, setAppliedEuros] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/irl")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("irl"))))
      .then((d: { quarters?: IrlQuarter[] }) => {
        if (!cancelled) setQuarters(d.quarters ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nf = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );
  const cf = useMemo(
    () =>
      new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }),
    [locale],
  );

  const byPeriod = useMemo(() => {
    const map = new Map<string, number>();
    (quarters ?? []).forEach((q) => map.set(q.period, q.value));
    return map;
  }, [quarters]);

  // Revision math: revised rent = current rent × (new index / base index),
  // where base is the selected reference quarter and new is the same quarter a
  // year later (the value that applies at the annual revision).
  const revision = useMemo(() => {
    const base = period ? byPeriod.get(period) : undefined;
    if (!period || base == null) return { state: "needs_quarter" as const };
    const newPeriod = nextYearSameQuarter(period);
    const newValue = byPeriod.get(newPeriod);
    if (newValue == null) return { state: "no_new_index" as const, base };
    const currentCents = eurosToCents(currentRentEuros);
    if (currentCents == null) return { state: "needs_quarter" as const };
    const revisedCents = Math.round((currentCents * newValue) / base);
    return {
      state: "ready" as const,
      base,
      newValue,
      newPeriod,
      revisedCents,
      revisedEuros: (revisedCents / 100).toFixed(2),
    };
  }, [period, byPeriod, currentRentEuros]);

  // Read-only text submitted as irl_reference so contracts keep a human label.
  const referenceLabel = period
    ? formatQuarter(period)
    : (defaultReference ?? "");

  // Graceful degradation: if INSEE is unreachable, fall back to the original
  // free-text reference field so the lease can still be saved.
  if (failed) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{bv.irlReference}</label>
          <input
            name="irl_reference"
            type="text"
            defaultValue={defaultReference ?? ""}
            placeholder={bv.irlReferencePlaceholder}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-amber-600">{bv.irlUnavailable}</p>
        </div>
        <div>
          <label className={labelClass}>{bv.revisionDate}</label>
          <input
            name="revision_date"
            type="date"
            defaultValue={defaultRevisionDate ?? ""}
            className={inputClass}
          />
        </div>
      </div>
    );
  }

  const loading = quarters === null;

  return (
    <div className="space-y-3">
      <input type="hidden" name="irl_reference" value={referenceLabel} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>{bv.irlReference}</label>
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setAppliedEuros(null);
            }}
            disabled={loading}
            className={selectClass}
          >
            <option value="">
              {loading ? bv.irlLoading : bv.irlSelectPlaceholder}
            </option>
            {(quarters ?? []).map((q) => (
              <option key={q.period} value={q.period}>
                {formatQuarter(q.period)} — {nf.format(q.value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{bv.irlBaseIndex}</label>
          <input
            type="text"
            readOnly
            value={
              revision.state !== "needs_quarter" && revision.base != null
                ? nf.format(revision.base)
                : "—"
            }
            className={`${inputClass} cursor-default bg-slate-100 text-slate-600`}
          />
        </div>
        <div>
          <label className={labelClass}>{bv.revisionDate}</label>
          <input
            name="revision_date"
            type="date"
            value={revisionDate}
            onChange={(e) => setRevisionDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Revised-rent preview */}
      <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {bv.revisedRentGroup}
        </p>
        {appliedEuros != null ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-2xl font-semibold text-slate-900">
              {cf.format(Number(appliedEuros))}
            </p>
            <span className="text-sm font-medium text-emerald-700">
              {bv.revisedRentApplied}
            </span>
          </div>
        ) : revision.state === "ready" ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {cf.format(revision.revisedCents / 100)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {bv.revisedRentBasis
                  .replace("{new}", nf.format(revision.newValue))
                  .replace("{base}", nf.format(revision.base))}
                {revisionDate
                  ? ` · ${bv.revisedRentEffective.replace("{date}", revisionDate)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onApply(revision.revisedEuros);
                setAppliedEuros(revision.revisedEuros);
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              {bv.applyRevisedRent}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            {revision.state === "no_new_index"
              ? bv.revisedRentNoNewIndex
              : bv.revisedRentNeedsQuarter}
          </p>
        )}
      </div>
    </div>
  );
}
