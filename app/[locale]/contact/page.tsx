import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ContactForm } from "@/components/contact-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.contactTitle,
    description: dict.meta.contactDescription,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale as Locale).contact;

  return (
    <div className="bg-paper text-ink">
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="max-w-[720px]">
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent-deep">
              {d.kicker}
            </span>
            <h1 className="font-semibold tracking-[-0.028em] text-ink text-[38px] leading-[1.02] sm:text-[48px] lg:text-[60px]">
              {d.h1A}{" "}
              <span className="font-serif italic font-normal text-accent-deep">
                {d.h1Serif}
              </span>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.55] text-ink-2">
              {d.lede}
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <ContactForm locale={locale as Locale} dict={d.form} />

            <div className="flex flex-col gap-4">
              {/* Email */}
              <article className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-paper-elev p-7">
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-deep">
                  <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
                    <path d="M3 6h14v9H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M3 6 10 12 17 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold tracking-[-0.01em]">{d.emailTitle}</h2>
                <p className="text-[14px] leading-[1.55] text-ink-3">{d.emailBody}</p>
                <a
                  href={`mailto:${d.emailAddress}`}
                  className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[14.5px] font-medium text-accent-deep hover:underline"
                >
                  {d.emailAddress}
                </a>
              </article>

              {/* Response times */}
              <article className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-paper-elev p-7">
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-deep">
                  <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold tracking-[-0.01em]">{d.hoursTitle}</h2>
                <p className="text-[14px] leading-[1.55] text-ink-3">{d.hoursBody}</p>
                <span className="mt-auto pt-3 font-mono text-[11px] text-ink-4">{d.hoursNote}</span>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
