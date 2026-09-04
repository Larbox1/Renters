import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
import { locales, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        "https://www.meskasas.com",
    ),
    title: dict.meta.siteTitle,
    description: dict.meta.siteDescription,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  const session = hasSupabaseEnv() ? await getCurrentSession() : null;
  const signedIn = session !== null;

  // Set by proxy.ts. The dashboard renders its own full-height shell + top
  // bar, so the global navbar/footer are only for public pages — regardless
  // of whether the visitor happens to be signed in.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isDashboard = pathname.startsWith(`/${locale}/dashboard`);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        {!isDashboard && (
          <Navbar
            locale={locale as Locale}
            dict={dict.nav}
            signedIn={signedIn}
          />
        )}
        <main className="flex-1">{children}</main>
        {!isDashboard && <Footer locale={locale as Locale} dict={dict.footer} />}
        <Analytics />
      </body>
    </html>
  );
}
