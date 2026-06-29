"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  PLANS,
  planPriceCents,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import { openBillingPortalAction, startCheckoutAction } from "./actions";

export function PlanSelector({
  locale,
  currentPlan,
  currentInterval,
  isSubscribed,
  dict,
  descriptions,
}: {
  locale: Locale;
  currentPlan: PlanId;
  currentInterval: BillingInterval | null;
  isSubscribed: boolean;
  dict: Dictionary["settings"]["plan"];
  descriptions: Record<PlanId, string>;
}) {
  // Default the toggle to whatever the owner is already billed on, else monthly.
  const [interval, setInterval] = useState<BillingInterval>(
    currentInterval ?? "month",
  );

  const fmt = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  // Stable tier ordering by monthly price, so up/down styling doesn't flip
  // when the annual toggle is on.
  const currentMonthly = planPriceCents(currentPlan, "month");

  return (
    <>
      {/* Monthly / annual toggle */}
      <div className="mb-5 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            interval === "month"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {dict.billingMonthly}
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
            interval === "year"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {dict.billingAnnual}
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
            {dict.billingSave}
          </span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const price = planPriceCents(p.id, interval);
          // Highlight the tier the owner is on. If their cadence is unknown
          // (legacy rows synced before plan_interval existed) fall back to
          // matching on tier alone so the badge still shows.
          const isCurrent =
            p.id === currentPlan &&
            (!isSubscribed ||
              currentInterval == null ||
              interval === currentInterval);
          const isUpgrade = planPriceCents(p.id, "month") > currentMonthly;
          const showAnnualEquiv =
            interval === "year" && p.id !== "free" && price > 0;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-xl border p-5 ${
                isCurrent
                  ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              {isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {dict.currentBadge}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-900">
                  {dict.names[p.id]}
                </p>
                <span className="group relative inline-flex">
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={descriptions[p.id]}
                    className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold leading-none text-slate-600"
                  >
                    ?
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {descriptions[p.id]}
                  </span>
                </span>
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {fmt(price)}
                </span>
                <span className="text-xs text-slate-500">
                  {interval === "year" ? dict.perYear : dict.perMonth}
                </span>
              </p>
              <p className="mt-1 min-h-[16px] text-xs text-slate-500">
                {showAnnualEquiv
                  ? dict.monthlyEquivalent.replace(
                      "{price}",
                      fmt(Math.round(price / 12)),
                    )
                  : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{dict.scopes[p.id]}</p>
              <div className="mt-4">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-default rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-400"
                  >
                    {dict.currentBadge}
                  </button>
                ) : isSubscribed ? (
                  // Already paying — every change (tier, cadence, cancel) runs
                  // through the Stripe Customer Portal.
                  <form action={openBillingPortalAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isUpgrade
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isUpgrade ? dict.upgrade : dict.switchPlan}
                    </button>
                  </form>
                ) : (
                  // Free user picking a paid tier — straight to Checkout with
                  // the selected cadence.
                  <form action={startCheckoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="plan" value={p.id} />
                    <input type="hidden" name="interval" value={interval} />
                    <button
                      type="submit"
                      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isUpgrade
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isUpgrade ? dict.upgrade : dict.switchPlan}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
