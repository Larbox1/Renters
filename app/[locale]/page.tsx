import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

const icons = ["🏠", "👥", "📄", "💶", "🛠️", "🔐"];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale).home;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Image
              src="/logo.png"
              alt="Renters"
              width={320}
              height={400}
              priority
              className="mx-auto mb-8 h-auto w-48 md:w-64"
            />
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              {dict.hero.badge}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              {dict.hero.titlePrefix}
              <span className="text-brand-600">{dict.hero.titleHighlight}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 md:text-xl">
              {dict.hero.description}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/${locale}/signup`}
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {dict.hero.primaryCta}
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {dict.hero.secondaryCta}
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">{dict.hero.note}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {dict.features.heading}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {dict.features.subheading}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {dict.features.items.map((feature, idx) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                {icons[idx]}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* User types */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              {dict.users.heading}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              {dict.users.subheading}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dict.users.items.map((user) => (
              <div
                key={user.role}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {user.role}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {user.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl bg-brand-600 px-8 py-16 text-center shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            {dict.cta.heading}
          </h2>
          <p className="mt-4 text-lg text-brand-100">{dict.cta.subheading}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${locale}/signup`}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
            >
              {dict.cta.primary}
            </Link>
            <Link
              href={`/${locale}/pricing`}
              className="rounded-lg border border-brand-400 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {dict.cta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
