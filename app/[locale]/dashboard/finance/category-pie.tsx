"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PieSlice } from "@/lib/category-colors";

const CX = 100;
const OUTER_R = 88;
const INNER_R = 58;

/** Annular sector from a0 to a1 (radians, clockwise, 12 o'clock = -π/2). */
function arcPath(a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = CX + OUTER_R * Math.cos(a0);
  const y0 = CX + OUTER_R * Math.sin(a0);
  const x1 = CX + OUTER_R * Math.cos(a1);
  const y1 = CX + OUTER_R * Math.sin(a1);
  const u0 = CX + INNER_R * Math.cos(a1);
  const v0 = CX + INNER_R * Math.sin(a1);
  const u1 = CX + INNER_R * Math.cos(a0);
  const v1 = CX + INNER_R * Math.sin(a0);
  return (
    `M ${x0.toFixed(2)} ${y0.toFixed(2)} ` +
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `L ${u0.toFixed(2)} ${v0.toFixed(2)} ` +
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${u1.toFixed(2)} ${v1.toFixed(2)} Z`
  );
}

export function CategoryPie({
  locale,
  slices,
  totalFormatted,
  totalLabel,
  emptyLabel,
}: {
  locale: Locale;
  slices: PieSlice[];
  totalFormatted: string;
  totalLabel: string;
  emptyLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  // Tooltip position as a % of the chart box so it survives any render size.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const total = slices.reduce((s, x) => s + x.cents, 0);

  if (slices.length === 0 || total <= 0) {
    return <p className="py-6 text-sm text-slate-600">{emptyLabel}</p>;
  }

  const fmtPct = (fraction: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(fraction);

  // Slice geometry in fixed category order (stable adjacency, stable colors).
  let cum = 0;
  const arcs = slices.map((s) => {
    const a0 = -Math.PI / 2 + (cum / total) * 2 * Math.PI;
    cum += s.cents;
    const a1 = -Math.PI / 2 + (cum / total) * 2 * Math.PI;
    return { ...s, a0, a1, fraction: s.cents / total };
  });

  const moveTip = (e: React.PointerEvent<SVGElement>) => {
    const rect = e.currentTarget.closest("svg")!.getBoundingClientRect();
    setTip({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // Keyboard focus gets the same tooltip, anchored on the slice's centroid.
  const focusTip = (a0: number, a1: number) => {
    const mid = (a0 + a1) / 2;
    const r = (OUTER_R + INNER_R) / 2;
    setTip({
      x: ((CX + r * Math.cos(mid)) / 200) * 100,
      y: ((CX + r * Math.sin(mid)) / 200) * 100,
    });
  };

  const active = hovered != null ? arcs[hovered] : null;

  return (
    <div>
      <div className="relative mx-auto w-44">
        <svg
          viewBox="0 0 200 200"
          className="block w-full"
          onPointerLeave={() => {
            setHovered(null);
            setTip(null);
          }}
        >
          {arcs.length === 1 ? (
            // A lone category is a full ring; the sector path degenerates.
            <circle
              cx={CX}
              cy={CX}
              r={(OUTER_R + INNER_R) / 2}
              fill="none"
              stroke={arcs[0].color}
              strokeWidth={OUTER_R - INNER_R}
              tabIndex={0}
              aria-label={`${arcs[0].label}: ${arcs[0].formatted} (${fmtPct(1)})`}
              onPointerMove={(e) => {
                setHovered(0);
                moveTip(e);
              }}
              onFocus={() => {
                setHovered(0);
                focusTip(arcs[0].a0, arcs[0].a1);
              }}
              onBlur={() => {
                setHovered(null);
                setTip(null);
              }}
            />
          ) : (
            arcs.map((a, i) => (
              <path
                key={a.key}
                d={arcPath(a.a0, a.a1)}
                fill={a.color}
                // 2px gap in the surface color separates touching slices —
                // the spacer, not a border.
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinejoin="round"
                tabIndex={0}
                aria-label={`${a.label}: ${a.formatted} (${fmtPct(a.fraction)})`}
                className="cursor-pointer transition-opacity duration-150 focus:outline-none"
                opacity={hovered == null || hovered === i ? 1 : 0.45}
                onPointerMove={(e) => {
                  setHovered(i);
                  moveTip(e);
                }}
                onFocus={() => {
                  setHovered(i);
                  focusTip(a.a0, a.a1);
                }}
                onBlur={() => {
                  setHovered(null);
                  setTip(null);
                }}
              />
            ))
          )}
        </svg>

        {/* Center total — the headline; HTML so it wraps and scales cleanly. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-lg font-semibold leading-tight text-slate-900">
            {totalFormatted}
          </p>
          <p className="text-xs text-slate-500">{totalLabel}</p>
        </div>

        {/* Tooltip: value leads, label follows. */}
        {active && tip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-lg"
            style={{ left: `${tip.x}%`, top: `${tip.y}%`, marginTop: "-6px" }}
          >
            <p className="text-sm font-semibold text-white">
              {active.formatted}
            </p>
            <p className="text-xs text-slate-300">
              {active.label} · {fmtPct(active.fraction)}
            </p>
          </div>
        )}
      </div>

      {/* Legend — always present, and the relief channel for sub-3:1 fills:
          every value and share is readable without hovering. */}
      <ul className="mt-4 space-y-1.5">
        {arcs.map((a, i) => (
          <li
            key={a.key}
            className="flex items-center gap-2 rounded px-1 py-0.5 text-sm transition-opacity duration-150"
            style={{
              opacity: hovered == null || hovered === i ? 1 : 0.45,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: a.color }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-700">
              {a.label}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">
              {a.formatted}
            </span>
            <span className="w-12 text-right text-xs text-slate-500 tabular-nums">
              {fmtPct(a.fraction)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
