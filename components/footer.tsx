import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function Footer({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["footer"];
}) {
  const columns = [
    { title: dict.product, links: dict.productLinks },
    { title: dict.audience, links: dict.audienceLinks },
    { title: dict.resources, links: dict.resourcesLinks },
    { title: dict.company, links: dict.companyLinks },
  ];

  return (
    <footer className="bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src={
                  locale === "fr"
                    ? "/meskasas_logo_fr.png"
                    : "/meskasas_logo_en.png"
                }
                alt="Meskasas"
                width={1493}
                height={374}
                className="h-[42px] w-auto"
              />
            </Link>
            <p className="mt-4 max-w-[30ch] text-[13.5px] text-ink-3">
              {dict.tagline}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h5 className="mb-3.5 text-xs font-medium uppercase tracking-[0.08em] text-ink-3">
                {col.title}
              </h5>
              <ul className="flex flex-col gap-2">
                {col.links.map((label) => (
                  <li key={label}>
                    <a
                      href="#"
                      className="text-[13.5px] text-ink-2 transition hover:text-accent-deep"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[12.5px] text-ink-3">
          <span>
            © {new Date().getFullYear()} Meskasas SAS · {dict.rights}
          </span>
          <div className="flex flex-wrap gap-[18px]">
            {dict.legal.map((label) => (
              <a key={label} href="#" className="transition hover:text-accent-deep">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
