import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { LandingPricingGrid } from "@/components/landing-pricing";

const LOGOS = [
  { kind: "round", label: "Maisonette" },
  { kind: "square", label: "SCI Verlaine" },
  { kind: "tri", label: "Brique & Co" },
  { kind: "round", label: "Foncière 36" },
  { kind: "square", label: "Logé" },
  { kind: "round", label: "Latoit" },
] as const;

const TABLE_ROWS = [
  { ini: "JM", name: "Bastille T2 · J. Mercier", due: "05 nov.", amount: "910 €", status: "collected" as const },
  { ini: "CR", name: "Vauban T3 · C. Roux", due: "05 nov.", amount: "1 240 €", status: "collected" as const },
  { ini: "LP", name: "Capucins Studio · L. Petit", due: "05 nov.", amount: "620 €", status: "reminder" as const },
  { ini: "AT", name: "République T2 · A. Thibault", due: "10 nov.", amount: "880 €", status: "unpaid" as const },
];

const CheckIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale as Locale).home;

  return (
    <div className="bg-paper text-ink">
      {/* Hero */}
      <section className="relative pt-16 pb-12 md:pt-20">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-elev py-1 pl-1 pr-3 text-[12.5px] text-ink-3">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent-deep">
                  {d.hero.eyebrowPill}
                </span>
                {d.hero.eyebrowText}
              </span>
              <h1 className="mt-6 font-semibold tracking-[-0.035em] text-ink text-[44px] leading-[0.98] sm:text-[64px] lg:text-[88px]">
                {d.hero.title1}
                <br />
                <span className="font-serif italic font-normal tracking-[-0.015em] text-accent-deep">
                  {d.hero.titleSerif}
                </span>
                .
              </h1>
              <p className="mt-7 max-w-[56ch] text-[18.5px] leading-[1.55] text-ink-2">
                {d.hero.lede}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/${locale}/signup`}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-[18px] py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-accent-deep"
                >
                  {d.hero.ctaPrimary}
                  <ArrowIcon />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper-elev px-[18px] py-3 text-[15px] font-medium text-ink shadow-sm transition hover:border-ink-3"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 3.5v9l7-4.5-7-4.5Z" />
                  </svg>
                  {d.hero.ctaDemo}
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-5 text-[13px] text-ink-3">
                <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-accent" />{d.hero.metaNoCard}</span>
                <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-accent" />{d.hero.metaFreeUnits}</span>
                <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-3 w-3 text-accent" />{d.hero.metaHosted}</span>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-elev shadow-[0_24px_60px_-12px_rgba(20,20,15,.18)]">
              <div className="flex h-9 items-center gap-2 border-b border-line bg-paper-sunk px-3.5">
                <div className="flex gap-1.5">
                  <i className="block h-2.5 w-2.5 rounded-full bg-line" />
                  <i className="block h-2.5 w-2.5 rounded-full bg-line" />
                  <i className="block h-2.5 w-2.5 rounded-full bg-line" />
                </div>
                <div className="mx-16 flex-1 rounded border border-line bg-paper-elev py-1 text-center font-mono text-[11.5px] text-ink-3">
                  {d.mock.url}
                </div>
              </div>
              <div className="grid min-h-[460px] grid-cols-[168px_1fr]">
                <aside className="border-r border-line bg-paper-sunk px-2.5 py-3.5">
                  <div className="flex items-center gap-2 px-1.5 pb-3.5 pt-1">
                    <Image
                      src={
                        locale === "fr"
                          ? "/meskasas_logo_fr.png"
                          : "/meskasas_logo_en.png"
                      }
                      alt=""
                      width={1493}
                      height={374}
                      className="h-[18px] w-auto mix-blend-multiply"
                    />
                  </div>
                  <p className="px-2 pb-1.5 pt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-4">
                    {d.mock.pilotage}
                  </p>
                  <NavMockItem active label={d.mock.dashboard} icon="grid" />
                  <NavMockItem label={d.mock.properties} icon="building" />
                  <NavMockItem label={d.mock.tenants} icon="users" />
                  <NavMockItem label={d.mock.rents} icon="calendar" badge="3" />
                  <NavMockItem label={d.mock.documents} icon="doc" />
                  <p className="px-2 pb-1.5 pt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-4">
                    {d.mock.compta}
                  </p>
                  <NavMockItem label={d.mock.revenue} icon="bars" />
                  <NavMockItem label={d.mock.taxStatement} icon="clock" />
                </aside>
                <main className="flex flex-col gap-4 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold tracking-tight">{d.mock.greeting}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{d.mock.occupancy}</p>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-md border border-line bg-paper-sunk px-2.5 py-1 font-mono text-[12px] text-ink-3 md:flex">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {d.mock.search}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Stat label={d.mock.statCollectedLabel} value={d.mock.statCollectedValue} delta={d.mock.statCollectedDelta} />
                    <Stat label={d.mock.statOccupancyLabel} value={d.mock.statOccupancyValue} delta={d.mock.statOccupancyDelta} />
                    <Stat label={d.mock.statToCollectLabel} value={d.mock.statToCollectValue} delta={d.mock.statToCollectDelta} warn />
                    <Stat label={d.mock.statChargesLabel} value={d.mock.statChargesValue} delta={d.mock.statChargesDelta} />
                  </div>
                  <div className="overflow-hidden rounded-[10px] border border-line">
                    <table className="w-full border-collapse">
                      <thead className="bg-paper-sunk">
                        <tr>
                          <Th>{d.mock.thProperty}</Th>
                          <Th>{d.mock.thDue}</Th>
                          <Th>{d.mock.thAmount}</Th>
                          <Th>{d.mock.thStatus}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {TABLE_ROWS.map((r) => (
                          <tr key={r.ini} className="[&:not(:last-child)>td]:border-b [&>td]:border-line">
                            <td className="px-3 py-2 text-[12.5px]">
                              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line bg-paper-sunk text-[10px] font-semibold text-ink-2">
                                {r.ini}
                              </span>
                              {r.name}
                            </td>
                            <td className="px-3 py-2 font-mono text-[12.5px]">{r.due}</td>
                            <td className="px-3 py-2 text-[12.5px]">{r.amount}</td>
                            <td className="px-3 py-2 text-[12.5px]">
                              <StatusBadge status={r.status}>
                                {r.status === "collected"
                                  ? d.mock.statusCollected
                                  : r.status === "reminder"
                                    ? d.mock.statusReminder
                                    : d.mock.statusUnpaid}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </main>
              </div>
              {/* floating mobile mock */}
              <div className="pointer-events-none absolute -bottom-8 -right-8 hidden h-[410px] w-[200px] rotate-[4deg] rounded-[28px] border border-ink bg-ink p-1.5 shadow-[0_24px_60px_-12px_rgba(20,20,15,.18)] lg:block">
                <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-paper">
                  <div className="flex justify-between px-3.5 pb-1 pt-2 font-mono text-[10px] text-ink-2">
                    <span>9:41</span>
                    <span>● ● ●</span>
                  </div>
                  <p className="px-3.5 pb-2 pt-1.5 text-[13px] font-semibold">{d.mock.mobileTitle}</p>
                  <MobCard l={d.mock.mobileMonthLabel} v={d.mock.mobileMonthValue} meta={d.mock.mobileMonthMeta} />
                  <MobCard l={d.mock.mobileOkLabel} v={d.mock.mobileOkValue} meta={d.mock.mobileOkMeta} />
                  <MobCard l={d.mock.mobileLateLabel} v={d.mock.mobileLateValue} meta={d.mock.mobileLateMeta} />
                  <div className="mx-3 mb-3 mt-1.5 rounded-[10px] bg-accent p-2.5 text-center text-[11.5px] font-medium text-white">
                    {d.mock.mobileCta}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logos strip */}
        <div className="mt-14 border-y border-line bg-paper py-7">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-8 px-7">
            <p className="max-w-[200px] whitespace-nowrap text-xs text-ink-3">{d.logos.tagline}</p>
            <div className="flex flex-wrap items-center gap-9 opacity-80">
              {LOGOS.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-2 text-[15.5px] font-semibold tracking-[-0.02em] text-ink-2">
                  {l.kind === "round" && <span className="h-2 w-2 rounded-full bg-ink-2" />}
                  {l.kind === "square" && <span className="h-2 w-2 rounded-[2px] bg-ink-2" />}
                  {l.kind === "tri" && (
                    <span
                      className="h-0 w-0"
                      style={{
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderBottom: "8px solid #2F3D6B",
                      }}
                    />
                  )}
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="mb-14 max-w-[720px]">
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent-deep">{d.features.kicker}</span>
            <h2 className="font-semibold tracking-[-0.028em] text-ink text-[34px] leading-[1.02] sm:text-[42px] lg:text-[56px]">
              {d.features.h2A} <span className="font-serif italic font-normal text-ink-2">{d.features.h2Serif}</span>
            </h2>
            <p className="mt-4 max-w-[56ch] text-[17px] text-ink-2">{d.features.lede}</p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {d.features.items.map((f, i) => (
              <article key={i} className="flex min-h-[220px] flex-col gap-3 bg-paper-elev p-7">
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-deep">
                  <FeatIcon i={i} />
                </div>
                <h3 className="text-base font-semibold tracking-[-0.01em]">{f.title}</h3>
                <p className="text-[14px] leading-[1.55] text-ink-3">{f.description}</p>
                <span className="mt-auto pt-4 font-mono text-[11px] text-ink-4">{f.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Showcases */}
      <section id="audience" className="pb-24">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-24 px-7">
          {/* Showcase 1 — receipts */}
          <Showcase
            tag={d.show1.tag}
            h3={d.show1.h3}
            p={d.show1.p}
            items={d.show1.items}
            visual={
              <Visual head1={d.show1.illusHead1} head2={d.show1.illusHead2}>
                <div className="relative rounded-[10px] border border-dashed border-line bg-paper p-5 font-mono text-xs">
                  <div className="absolute right-6 top-7 -rotate-[8deg] rounded border-2 border-emerald-700 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-emerald-700">
                    {d.show1.stamp}
                  </div>
                  <h4 className="mb-1 font-sans text-sm font-semibold tracking-[-0.01em]">{d.show1.receiptTitle}</h4>
                  <p className="mb-2.5 text-ink-3">{d.show1.receiptAddress}</p>
                  <ReceiptRow label={d.show1.receiptLandlord} value={d.show1.receiptLandlordName} />
                  <ReceiptRow label={d.show1.receiptTenant} value={d.show1.receiptTenantName} />
                  <ReceiptRow label={d.show1.receiptPeriod} value={d.show1.receiptPeriodValue} />
                  <div className="mt-2 flex justify-between border-t border-line pt-2 text-[10.5px] uppercase tracking-[0.05em] text-ink-3">
                    <span>{d.show1.receiptDetail}</span>
                    <span>{d.show1.receiptAmountHead}</span>
                  </div>
                  <ReceiptRow label={d.show1.receiptRent} value={d.show1.receiptRentValue} />
                  <ReceiptRow label={d.show1.receiptCharges} value={d.show1.receiptChargesValue} />
                  <div className="mt-1.5 flex justify-between border-t border-line pt-2 text-[13px] font-semibold text-ink">
                    <span>{d.show1.receiptTotal}</span>
                    <span>{d.show1.receiptTotalValue}</span>
                  </div>
                  <p className="mt-2.5 text-[10.5px] leading-[1.5] text-ink-3">{d.show1.receiptFooter}</p>
                </div>
              </Visual>
            }
          />

          {/* Showcase 2 — état des lieux */}
          <Showcase
            flip
            tag={d.show2.tag}
            h3={d.show2.h3}
            p={d.show2.p}
            items={d.show2.items}
            visual={
              <Visual head1={d.show2.illusHead1} head2={d.show2.illusHead2}>
                <div className="rounded-[10px] bg-paper-sunk p-4">
                  <Room name={d.show2.room1Name} note={d.show2.room1Note} status="ok" />
                  <Room name={d.show2.room2Name} note={d.show2.room2Note} status="warn" />
                  <Room name={d.show2.room3Name} note={d.show2.room3Note} status="ok" />
                  <Room name={d.show2.room4Name} note={d.show2.room4Note} status="todo" />
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-ink-3">{d.show2.progressLabel}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper">
                      <div className="h-full w-[70%] bg-accent" />
                    </div>
                    <span className="font-mono text-[11px]">{d.show2.progressValue}</span>
                  </div>
                </div>
              </Visual>
            }
          />

          {/* Showcase 3 — espace locataire */}
          <Showcase
            tag={d.show3.tag}
            h3={d.show3.h3}
            p={d.show3.p}
            items={d.show3.items}
            visual={
              <Visual head1={d.show3.illusHead1} head2={d.show3.illusHead2}>
                <div className="flex flex-col gap-2.5">
                  <Msg from="JM">{d.show3.msg1Body}</Msg>
                  <p className="ml-10 font-mono text-[10.5px] text-ink-4">{d.show3.msg1Meta}</p>
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-line bg-paper-sunk text-[11px] font-semibold text-ink-2">JM</div>
                    <div className="rounded-xl rounded-tl bg-paper-sunk p-1.5">
                      <div className="flex h-[90px] w-44 items-center justify-center rounded-lg bg-paper font-mono text-[11px] text-ink-4">
                        {d.show3.msgPhotoCaption}
                      </div>
                    </div>
                  </div>
                  <p className="ml-10 font-mono text-[10.5px] text-ink-4">{d.show3.msgPhotoMeta}</p>
                  <MsgMe>{d.show3.msg3Body}</MsgMe>
                  <p className="mr-10 text-right font-mono text-[10.5px] text-ink-4">{d.show3.msg3Meta}</p>
                </div>
              </Visual>
            }
          />
        </div>
      </section>

      {/* Numbers band */}
      <section className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="mb-14 max-w-[720px]">
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent">{d.numbers.kicker}</span>
            <h2 className="font-semibold tracking-[-0.028em] text-paper text-[34px] leading-[1.02] sm:text-[42px] lg:text-[56px]">
              {d.numbers.h2A} <span className="font-serif italic font-normal text-paper">{d.numbers.h2Brand}</span> {d.numbers.h2B}
            </h2>
            <p className="mt-4 max-w-[56ch] text-[17px] text-paper/75">{d.numbers.lede}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {d.numbers.stats.map((s, i) => (
              <div key={i} className="border-t border-paper/20 pt-5">
                <div className="text-[40px] font-medium leading-none tracking-[-0.03em] sm:text-[56px] lg:text-[64px]">
                  {s.value1}
                  <span className="font-serif italic font-normal text-accent">{s.value2}</span>
                  {s.value3}
                </div>
                <p className="mt-2.5 max-w-[22ch] text-[13.5px] text-paper/65">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="mb-14 max-w-[720px]">
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent-deep">{d.testimonials.kicker}</span>
            <h2 className="font-semibold tracking-[-0.028em] text-ink text-[34px] leading-[1.02] sm:text-[42px] lg:text-[56px]">
              {d.testimonials.h2A} <span className="font-serif italic font-normal text-ink-2">{d.testimonials.h2Serif}</span>
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
            {d.testimonials.items.map((q, i) => (
              <article
                key={i}
                className={`flex flex-col gap-4 rounded-2xl border border-line bg-paper-elev ${i === 0 ? "p-9" : "p-7"}`}
              >
                <p className={`leading-[1.4] text-ink ${i === 0 ? "text-[22px] tracking-[-0.015em]" : "text-base"}`}>
                  « {q.quote} »
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-line pt-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-gradient-to-br from-accent-soft to-paper-sunk font-semibold text-accent-deep">
                    {q.author.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <div className="text-[13px]">
                    <b className="block font-semibold">{q.author}</b>
                    <span className="text-[12.5px] text-ink-3">{q.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-line bg-paper-sunk py-24">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="mb-14 max-w-[720px]">
            <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent-deep">{d.pricing.kicker}</span>
            <h2 className="font-semibold tracking-[-0.028em] text-ink text-[34px] leading-[1.02] sm:text-[42px] lg:text-[56px]">
              {d.pricing.h2A} <span className="font-serif italic font-normal text-ink-2">{d.pricing.h2Serif}</span>
            </h2>
            <p className="mt-4 max-w-[56ch] text-[17px] text-ink-2">{d.pricing.lede}</p>
          </div>
          <LandingPricingGrid locale={locale as Locale} dict={d.pricing} />
          <p className="mt-7 text-center text-[13px] text-ink-3">{d.pricing.note}</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="resources" className="py-24">
        <div className="mx-auto max-w-[1360px] px-7">
          <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.12em] text-accent-deep">{d.faq.kicker}</span>
              <h2 className="font-semibold tracking-[-0.028em] text-ink text-[28px] leading-[1.02] sm:text-[36px] lg:text-[44px]">
                {d.faq.h2}
              </h2>
              <p className="mt-4 text-[15px] text-ink-2">
                {d.faq.ledeBefore}{" "}
                <a href={`mailto:${d.faq.ledeEmail}`} className="border-b border-accent text-accent-deep">{d.faq.ledeEmail}</a>
                {d.faq.ledeAfter}
              </p>
            </div>
            <div className="border-t border-line">
              {d.faq.items.map((item, i) => (
                <details key={i} {...(i === 0 ? { open: true } : {})} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[16.5px] font-medium tracking-[-0.005em] text-ink">
                    {item.q}
                    <span className="text-lg text-ink-3 transition-transform group-open:rotate-45 group-open:text-accent">+</span>
                  </summary>
                  <p className="mt-3.5 max-w-[60ch] text-[14.5px] leading-[1.6] text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="border-y border-line bg-accent-soft">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-7 py-20 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            <h2 className="font-semibold tracking-[-0.03em] text-ink text-[34px] leading-none sm:text-[44px] lg:text-[60px]">
              {d.finalCta.h2A} <span className="font-serif italic font-normal text-accent-deep">{d.finalCta.h2Serif}</span>
            </h2>
            <p className="mt-4 max-w-[50ch] text-base text-ink-2">{d.finalCta.p}</p>
          </div>
          <div className="flex flex-col items-stretch gap-2.5">
            <Link
              href={`/${locale}/signup`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-[18px] py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-accent-deep"
            >
              {d.finalCta.primary}
              <ArrowIcon />
            </Link>
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-paper-elev px-[18px] py-3 text-[15px] font-medium text-ink hover:border-ink-3"
            >
              {d.finalCta.demo}
            </a>
            <small className="mt-1 text-center text-[12px] text-ink-3">{d.finalCta.note}</small>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------- helper components ----------

function NavMockItem({
  label,
  active,
  icon,
  badge,
}: {
  label: string;
  active?: boolean;
  icon: "grid" | "building" | "users" | "calendar" | "doc" | "bars" | "clock";
  badge?: string;
}) {
  const Icon = {
    grid: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    building: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M2 6 8 2l6 4v8H2V6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    users: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    calendar: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="3" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 6h11M5 2v3M11 2v3" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    doc: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h7l3 3v9H3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    bars: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M2 13V3M14 3v10M2 13h12M5 10V7m3 3V5m3 5V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    clock: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  }[icon];

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
        active ? "bg-paper-elev text-ink shadow-sm" : "text-ink-2"
      }`}
    >
      <span className={active ? "text-accent" : "text-ink-3"}>{Icon}</span>
      {label}
      {badge && (
        <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-white">{badge}</span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  warn,
}: {
  label: string;
  value: string;
  delta: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-paper-elev p-3">
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className="mt-1 text-[19px] font-semibold tracking-[-0.02em]">{value}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${warn ? "text-amber-700" : "text-emerald-700"}`}>{delta}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-line px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3">
      {children}
    </th>
  );
}

function StatusBadge({
  status,
  children,
}: {
  status: "collected" | "reminder" | "unpaid";
  children: React.ReactNode;
}) {
  const cls = {
    collected: "bg-emerald-100 text-emerald-800",
    reminder: "bg-amber-100 text-amber-800",
    unpaid: "bg-red-100 text-red-800",
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function MobCard({ l, v, meta }: { l: string; v: string; meta: string }) {
  return (
    <div className="mx-3 my-1 flex flex-col gap-0.5 rounded-[10px] border border-line bg-paper-elev px-3 py-2.5">
      <span className="text-[9.5px] uppercase tracking-[0.05em] text-ink-3">{l}</span>
      <span className="text-sm font-semibold tracking-[-0.01em]">{v}</span>
      <span className="text-[10px] text-ink-3">{meta}</span>
    </div>
  );
}

function FeatIcon({ i }: { i: number }) {
  const Icons = [
    <svg key="0" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><path d="M3 4h11l3 3v9H3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M6 9h8M6 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="1" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><path d="M3 16V4M17 4v12M3 16h14M6 13V9m4 4V6m4 7v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="2" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="3" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M6 9h8M6 12h5M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="4" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><path d="M5 3h7l4 4v10H5V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m8 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    <svg key="5" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><path d="M3 6h14v9H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3 6 10 12 17 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
    <svg key="6" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><path d="M3 12h14M5 8h10M7 4h6M5 16h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="7" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    <svg key="8" viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]"><rect x="6" y="2" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="15" r=".7" fill="currentColor" /></svg>,
  ];
  return Icons[i] ?? Icons[0];
}

function Showcase({
  tag,
  h3,
  p,
  items,
  visual,
  flip,
}: {
  tag: string;
  h3: string;
  p: string;
  items: readonly string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={`grid items-center gap-12 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <span className="inline-block rounded font-mono text-[11.5px] tracking-[0.04em] text-accent-deep bg-accent-soft px-2.5 py-1">{tag}</span>
        <h3 className="mt-4 font-semibold tracking-[-0.025em] text-ink text-[28px] leading-[1.05] sm:text-[34px] lg:text-[40px]">{h3}</h3>
        <p className="mt-4 max-w-[48ch] text-[15.5px] text-ink-2">{p}</p>
        <ul className="mt-5 list-none border-b border-line p-0">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 border-t border-line py-2.5 text-[14.5px] text-ink-2">
              <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-accent" />
              {it}
            </li>
          ))}
        </ul>
      </div>
      {visual}
    </div>
  );
}

function Visual({
  head1,
  head2,
  children,
}: {
  head1: string;
  head2: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-elev p-6 shadow-[0_8px_24px_-8px_rgba(20,20,15,.10)]">
      <div className="mb-4 flex items-center justify-between text-xs text-ink-3">
        <span className="font-mono">{head1}</span>
        <span className="font-mono text-ink-4">{head2}</span>
      </div>
      {children}
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-ink-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Room({
  name,
  note,
  status,
}: {
  name: string;
  note: string;
  status: "ok" | "warn" | "todo";
}) {
  const icon = {
    ok: (
      <svg className="h-4 w-4 text-emerald-700" viewBox="0 0 16 16" fill="none">
        <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    warn: (
      <svg className="h-4 w-4 text-amber-700" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    todo: (
      <svg className="h-4 w-4 text-ink-4" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  }[status];

  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-line bg-paper-elev px-3.5 py-3 last:mb-0">
      <span className="flex h-8 w-9 items-center justify-center rounded border border-line bg-paper-sunk text-ink-4">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="6" cy="7" r="1.4" stroke="currentColor" strokeWidth="1.4" />
          <path d="m4 12 3-3 3 2 4-4v5H4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <span className="text-[11.5px] text-ink-3">{note}</span>
      {icon}
    </div>
  );
}

function Msg({ from, children }: { from: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-line bg-paper-sunk text-[11px] font-semibold text-ink-2">
        {from}
      </div>
      <div className="max-w-[80%] rounded-xl rounded-tl bg-paper-sunk px-3.5 py-2.5 text-[13.5px] text-ink">
        {children}
      </div>
    </div>
  );
}

function MsgMe({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row-reverse items-start gap-2.5">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-accent bg-accent text-[11px] font-semibold text-white">
        SO
      </div>
      <div className="max-w-[80%] rounded-xl rounded-tr bg-ink px-3.5 py-2.5 text-[13.5px] text-paper">
        {children}
      </div>
    </div>
  );
}
