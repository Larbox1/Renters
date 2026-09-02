import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

// Hero-share ring: one metric (occupied share), not a categorical pie — the
// track is deliberately neutral and the counts below carry the identities, so
// nothing depends on telling gray from blue.
const R = 70;
const STROKE = 22;
const C = 2 * Math.PI * R;

export function OccupancyDonut({
  locale,
  occupied,
  total,
  dict,
}: {
  locale: Locale;
  occupied: number;
  total: number;
  dict: Dictionary["dashboard"]["occupancy"];
}) {
  const vacant = Math.max(0, total - occupied);
  const fraction = total > 0 ? occupied / total : 0;
  const fmtPct = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{dict.heading}</h2>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-slate-500">
          {dict.empty}
        </p>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-2">
          <div className="relative">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              role="img"
              aria-label={`${dict.heading}: ${fmtPct.format(fraction)}`}
            >
              <circle
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={STROKE}
              />
              {fraction > 0 && (
                <circle
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={STROKE}
                  strokeLinecap={fraction < 1 ? "round" : "butt"}
                  strokeDasharray={`${fraction * C} ${C}`}
                  transform="rotate(-90 90 90)"
                />
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-900">
                {fmtPct.format(fraction)}
              </p>
              <p className="text-xs text-slate-500">
                {occupied} / {total}
              </p>
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <p className="flex items-center gap-2 text-slate-700">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm bg-brand-600"
              />
              {dict.occupied}
              <span className="font-semibold text-slate-900 tabular-nums">
                {occupied}
              </span>
            </p>
            <p className="flex items-center gap-2 text-slate-700">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm bg-slate-200"
              />
              {dict.vacant}
              <span className="font-semibold text-slate-900 tabular-nums">
                {vacant}
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
