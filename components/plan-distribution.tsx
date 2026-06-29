import type { Locale } from "@/i18n/config";
import { PLAN_IDS, type PlanId } from "@/lib/plans";

// Slice colors: neutral for free, then a light-to-dark brand-blue ramp so the
// paid tiers read as increasing commitment.
const COLORS: Record<PlanId, string> = {
  free: "#cbd5e1",
  plus: "#60a5fa",
  pro: "#2563eb",
  unlimited: "#1e3a8a",
};

const SIZE = 168;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const CENTER = SIZE / 2;

/**
 * Dependency-free SVG donut showing how owners split across subscription
 * tiers. Server component — the data is static once rendered.
 */
export function PlanDistribution({
  counts,
  names,
  title,
  subtitle,
  unit,
  emptyLabel,
  locale,
}: {
  counts: Record<PlanId, number>;
  names: Record<PlanId, string>;
  title: string;
  subtitle: string;
  unit: string;
  emptyLabel: string;
  locale: Locale;
}) {
  const total = PLAN_IDS.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const pct = (n: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(total === 0 ? 0 : n / total);

  // Build the donut segments, each offset by the running total before it.
  let acc = 0;
  const segments = PLAN_IDS.map((id) => {
    const value = counts[id] ?? 0;
    const len = total === 0 ? 0 : (value / total) * C;
    const seg = { id, value, len, offset: -acc };
    acc += len;
    return seg;
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>

      {total === 0 ? (
        <p className="text-sm text-slate-600">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
          <div className="relative flex-none">
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={title}
            >
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                {/* track */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={R}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth={STROKE}
                />
                {segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <circle
                      key={s.id}
                      cx={CENTER}
                      cy={CENTER}
                      r={R}
                      fill="none"
                      stroke={COLORS[s.id]}
                      strokeWidth={STROKE}
                      strokeDasharray={`${s.len} ${C - s.len}`}
                      strokeDashoffset={s.offset}
                    />
                  ))}
              </g>
              <text
                x={CENTER}
                y={CENTER - 4}
                textAnchor="middle"
                className="fill-slate-900 text-2xl font-bold"
              >
                {total}
              </text>
              <text
                x={CENTER}
                y={CENTER + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] font-medium uppercase tracking-wide"
              >
                {unit}
              </text>
            </svg>
          </div>

          <ul className="flex-1 space-y-2">
            {PLAN_IDS.map((id) => (
              <li key={id} className="flex items-center gap-3 text-sm">
                <span
                  className="h-3 w-3 flex-none rounded-sm"
                  style={{ backgroundColor: COLORS[id] }}
                />
                <span className="flex-1 font-medium text-slate-700">
                  {names[id]}
                </span>
                <span className="tabular-nums text-slate-500">
                  {counts[id] ?? 0}
                </span>
                <span className="w-12 text-right tabular-nums text-slate-400">
                  {pct(counts[id] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
