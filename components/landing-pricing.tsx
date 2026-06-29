"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { BillingInterval } from "@/lib/plans";

const CheckIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8.5 6.5 12 13 4.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function LandingPricingGrid({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["home"]["pricing"];
}) {
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <>
      {/* Monthly / annual toggle — centered above the grid */}
      <div className="mb-10 flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-elev p-1 text-[13.5px]">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            interval === "month"
              ? "bg-ink text-paper"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          {dict.billingMonthly}
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition ${
            interval === "year" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"
          }`}
        >
          {dict.billingAnnual}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
              interval === "year"
                ? "bg-paper/20 text-paper"
                : "bg-accent-soft text-accent-deep"
            }`}
          >
            {dict.billingSave}
          </span>
        </button>
      </div>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dict.plans.map((plan, i) => {
          const featured = "featured" in plan && plan.featured;
          const price = interval === "year" ? plan.priceAnnual : plan.price;
          const per = interval === "year" ? plan.perAnnual : plan.per;
          return (
            <div
              key={i}
              className={`relative flex flex-col gap-5 rounded-2xl border bg-paper-elev p-8 ${
                featured
                  ? "border-ink shadow-[0_8px_24px_-8px_rgba(20,20,15,.18)]"
                  : "border-line"
              }`}
            >
              {featured && (
                <span className="absolute right-6 -top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-white">
                  {dict.badgePopular}
                </span>
              )}
              <div className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    plan.dot === "free"
                      ? "bg-emerald-600"
                      : plan.dot === "plus"
                        ? "bg-accent"
                        : plan.dot === "pro"
                          ? "bg-accent-deep"
                          : "bg-ink"
                  }`}
                />
                {plan.name}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-semibold leading-none tracking-[-0.03em]">
                  {price}
                </span>
                <span className="text-[12px] text-ink-3">{per}</span>
              </div>
              <p className="min-h-[42px] text-[14px] text-ink-3">{plan.desc}</p>
              <Link
                href={`/${locale}/signup`}
                className={`inline-flex items-center justify-center rounded-lg py-3 text-sm font-medium ${
                  featured
                    ? "bg-accent text-white shadow-sm hover:bg-accent-deep"
                    : "border border-line bg-paper-elev text-ink hover:border-ink-3"
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="flex flex-col gap-3 border-t border-line pt-4 text-[13.5px] text-ink-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-accent" />
                    <span
                      dangerouslySetInnerHTML={{
                        __html: f.replace(
                          /\*\*(.+?)\*\*/g,
                          '<strong class="font-medium text-ink">$1</strong>',
                        ),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
