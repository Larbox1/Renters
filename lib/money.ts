import type { Locale } from "@/i18n/config";
import type { CurrencyCode } from "@/lib/currency";

export type MoneyFormatter = (
  cents: number,
  currency: CurrencyCode,
  opts?: { precise?: boolean },
) => string;

/**
 * One currency formatter for a whole page render. Rounds to whole units by
 * default (stat cards, tables); `precise: true` keeps cents (transaction
 * amounts). Formatter instances are cached per currency/precision.
 */
export function makeMoneyFormatter(locale: Locale): MoneyFormatter {
  const intl = locale === "fr" ? "fr-FR" : "en-US";
  const cache = new Map<string, Intl.NumberFormat>();
  return (cents, currency, opts) => {
    const key = `${currency}:${opts?.precise ? "p" : "r"}`;
    let f = cache.get(key);
    if (!f) {
      f = new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        ...(opts?.precise ? {} : { maximumFractionDigits: 0 }),
      });
      cache.set(key, f);
    }
    return f.format(cents / 100);
  };
}
