import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/i18n/config";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.meskasas.com";

// Public (marketing/legal/auth) routes only — the dashboard is behind auth
// and disallowed in robots.ts. The default-locale homepage lives at the bare
// domain (proxy rewrite), so its URL is "/" rather than "/en".
const PUBLIC_PATHS = [
  "",
  "/pricing",
  "/contact",
  "/signup",
  "/login",
  "/terms",
  "/privacy",
  "/legal-notice",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of PUBLIC_PATHS) {
    for (const locale of locales) {
      const prefix = locale === defaultLocale && path === "" ? "" : `/${locale}`;
      entries.push({
        url: `${SITE_URL}${prefix}${path}`,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }
  return entries;
}
