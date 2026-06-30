import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteRentReceiptAction } from "./[id]/receipts/actions";

export type RentReceiptRow = {
  id: string;
  period_start: string;
  period_end: string;
  rent_cents: number;
  charges_cents: number;
  total_cents: number;
  created_at: string;
  url: string | null;
};

/**
 * Read-only table of the rent receipts (quittances de loyer) generated for a
 * lease, newest first. Each total links to a signed download URL for the
 * generated PDF when one is available.
 */
export function LeaseReceiptsTable({
  receipts,
  dict,
  locale,
  leaseId,
}: {
  receipts: RentReceiptRow[];
  dict: Dictionary["leases"]["receipts"];
  locale: Locale;
  leaseId: string;
}) {
  const fmtEuros = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(cents / 100);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  if (receipts.length === 0) {
    return <p className="text-sm text-slate-600">{dict.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{dict.period}</th>
            <th className="px-4 py-3 text-right">{dict.rent}</th>
            <th className="px-4 py-3 text-right">{dict.charges}</th>
            <th className="px-4 py-3 text-right">{dict.total}</th>
            <th className="px-4 py-3">{dict.created}</th>
            <th className="px-4 py-3 text-right">{dict.document}</th>
            <th className="px-4 py-3 text-right">{dict.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {receipts.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
              </td>
              <td className="px-4 py-3 text-right text-slate-700">
                {fmtEuros(r.rent_cents)}
              </td>
              <td className="px-4 py-3 text-right text-slate-700">
                {fmtEuros(r.charges_cents)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                {fmtEuros(r.total_cents)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fmtDateTime(r.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {dict.download}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <form action={deleteRentReceiptAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="lease_id" value={leaseId} />
                  <input type="hidden" name="receipt_id" value={r.id} />
                  <ConfirmSubmit
                    message={dict.confirmDelete}
                    className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    {dict.delete}
                  </ConfirmSubmit>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
