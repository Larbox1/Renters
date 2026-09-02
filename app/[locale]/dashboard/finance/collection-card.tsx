import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Expected-vs-collected rent for the selected range: recorded "rent" income
 * against the active rent roll × months in range. Server-rendered progress
 * bar — the numbers are in the text, the bar is reinforcement.
 */
export function CollectionCard({
  collected,
  expected,
  fraction,
  outstanding,
  months,
  dict,
}: {
  /** Preformatted amounts in the display currency. */
  collected: string;
  expected: string;
  /** collected / expected, clamped to [0, 1]. */
  fraction: number;
  /** Preformatted shortfall, or null when fully collected. */
  outstanding: string | null;
  months: number;
  dict: Dictionary["finance"]["collection"];
}) {
  const pctWidth = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.heading}
        </h2>
        {outstanding ? (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {dict.outstanding.replace("{amount}", outstanding)}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {dict.complete}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-700">
        {dict.summary
          .replace("{collected}", collected)
          .replace("{expected}", expected)}
      </p>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={dict.heading}
      >
        <div
          className={`h-full rounded-full ${outstanding ? "bg-brand-600" : "bg-emerald-600"}`}
          style={{ width: pctWidth }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {dict.hint.replace("{months}", String(months))}
      </p>
    </section>
  );
}
