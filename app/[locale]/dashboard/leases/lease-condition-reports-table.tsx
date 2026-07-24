import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteConditionReportAction } from "./[id]/condition-report/actions";
import type { ReportType } from "./[id]/condition-report/report-shared";

export type ConditionReportListRow = {
  id: string;
  type: ReportType;
  status: "draft" | "completed";
  report_date: string;
  created_at: string;
  url: string | null;
};

/**
 * Table of the condition reports (états des lieux) attached to a lease,
 * newest first. Drafts open in the editor; completed reports link to their
 * generated PDF via a signed download URL.
 */
export function LeaseConditionReportsTable({
  reports,
  dict,
  locale,
  leaseId,
}: {
  reports: ConditionReportListRow[];
  dict: Dictionary["leases"]["conditionReports"];
  locale: Locale;
  leaseId: string;
}) {
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  if (reports.length === 0) {
    return <p className="text-sm text-slate-600">{dict.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{dict.title}</th>
            <th className="px-4 py-3">{dict.date}</th>
            <th className="px-4 py-3">{dict.created}</th>
            <th className="px-4 py-3 text-right">{dict.document}</th>
            <th className="px-4 py-3 text-right">{dict.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reports.map((report) => (
            <tr key={report.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/${locale}/dashboard/leases/${leaseId}/condition-report/${report.id}`}
                  className="font-medium text-slate-900 hover:text-brand-700"
                >
                  {report.type === "move_in" ? dict.moveIn : dict.moveOut}
                </Link>
                <span
                  className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    report.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {report.status === "completed"
                    ? dict.statusCompleted
                    : dict.statusDraft}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {fmtDate(report.report_date)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fmtDateTime(report.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                {report.url ? (
                  <a
                    href={report.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {dict.download}
                  </a>
                ) : (
                  <Link
                    href={`/${locale}/dashboard/leases/${leaseId}/condition-report/${report.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {dict.open}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <form action={deleteConditionReportAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="lease_id" value={leaseId} />
                  <input type="hidden" name="report_id" value={report.id} />
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
