import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export type LeaseDocumentRow = {
  id: string;
  name: string;
  source: "uploaded" | "generated";
  size: number;
  created_at: string;
  url: string | null;
};

/**
 * Read-only table of the documents attached to a lease (generated contracts +
 * documents uploaded against the lease's property). Each name links to a signed
 * download URL. Used on the tenant-facing "My Lease" screen; reuses the owner
 * Documents dictionary for the column labels.
 */
export function LeaseDocumentsTable({
  documents,
  dict,
  heading,
  emptyLabel,
  locale,
}: {
  documents: LeaseDocumentRow[];
  dict: Dictionary["documents"]["list"];
  heading: string;
  emptyLabel: string;
  locale: Locale;
}) {
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {heading}
      </p>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{dict.name}</th>
                <th className="px-4 py-3">{dict.source}</th>
                <th className="px-4 py-3">{dict.size}</th>
                <th className="px-4 py-3">{dict.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {d.name}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-900">
                        {d.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        d.source === "generated"
                          ? "bg-brand-100 text-brand-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {d.source === "generated"
                        ? dict.sourceGenerated
                        : dict.sourceUploaded}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtSize(d.size)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
