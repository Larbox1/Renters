import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.pricingTitle,
    description: dict.meta.pricingDescription,
  };
}

const planHrefs = ["/signup", "/signup?plan=starter", "/signup?plan=pro"];

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale).pricing;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-24">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            {dict.header.title}
          </h1>
          <p className="mt-5 text-lg text-slate-600">{dict.header.subtitle}</p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {dict.plans.map((plan, idx) => {
            const featured = idx === 1;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 ${
                  featured
                    ? "border-2 border-brand-600 bg-white shadow-xl"
                    : "border border-slate-200 bg-white shadow-sm"
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    {dict.mostPopular}
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  {plan.cadence && (
                    <span className="text-slate-600">{plan.cadence}</span>
                  )}
                  {plan.priceSuffix && (
                    <span className="text-sm text-slate-500">
                      {plan.priceSuffix}
                    </span>
                  )}
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-700"
                    >
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}${planHrefs[idx]}`}
                  className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${
                    featured
                      ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">{dict.note}</p>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {dict.faq.heading}
          </h2>
          <div className="mt-12 space-y-6">
            {dict.faq.items.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl bg-white p-6 ring-1 ring-slate-200"
              >
                <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
