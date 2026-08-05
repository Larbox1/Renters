import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.meskasas.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind auth or plumbing — nothing indexable there.
      disallow: [
        ...locales.map((l) => `/${l}/dashboard/`),
        "/api/",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
