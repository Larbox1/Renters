import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { visitorDisplayCurrency } from "@/lib/geo";
import { LandingPricingGrid } from "@/components/landing-pricing";

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

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale).pricing;
  const home = getDictionary(locale as Locale).home;
  const displayCurrency = await visitorDisplayCurrency(locale as Locale);

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

      {/* Plans — the same 4-tier grid as the landing page (single source for
          amounts and currency handling; USD default for US visitors). */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <LandingPricingGrid
          locale={locale as Locale}
          dict={home.pricing}
          initialCurrency={displayCurrency}
        />
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
