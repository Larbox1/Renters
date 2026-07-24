import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { signDocument, reportPhotoPrefix } from "@/lib/documents/storage";
import { reopenConditionReportAction } from "../actions";
import { ReportEditor } from "../report-editor";
import {
  coerceReportData,
  collectPhotoPaths,
  type ReportType,
} from "../report-shared";

export default async function ConditionReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string; reportId: string }>;
  searchParams: Promise<{ finalized?: string }>;
}) {
  const { locale, id, reportId } = await params;
  const { finalized } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  const { data: report } = await session.supabase
    .from("condition_reports")
    .select(
      "*, leases(id, properties(label, address, city), tenants(full_name)), documents(path)",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (!report || report.lease_id !== id) notFound();

  const lease = Array.isArray(report.leases) ? report.leases[0] : report.leases;
  const property = lease
    ? Array.isArray(lease.properties)
      ? lease.properties[0]
      : lease.properties
    : null;
  const tenant = lease
    ? Array.isArray(lease.tenants)
      ? lease.tenants[0]
      : lease.tenants
    : null;

  const type = report.type as ReportType;
  const crDict = dict.leases.conditionReports;
  const editorDict = crDict.editor;
  const title =
    type === "move_in" ? editorDict.titleMoveIn : editorDict.titleMoveOut;

  const data = coerceReportData(
    {
      report_date: report.report_date,
      meters: report.meters,
      keys: report.keys,
      rooms: report.rooms,
      notes: report.notes ?? "",
    },
    type,
    report.report_date as string,
    `${reportPhotoPrefix(report.owner_id as string, report.id as string)}/`,
  );

  // Signed display URLs for the element photos (1h TTL — plenty for an
  // editing session; fresh ones are minted on each render).
  const photoPaths = collectPhotoPaths(data.rooms);
  const photoUrls: Record<string, string | null> = Object.fromEntries(
    await Promise.all(
      photoPaths.map(
        async (p) => [p, await signDocument(p)] as [string, string | null],
      ),
    ),
  );

  // A move-out report without any carried-over entry state means no completed
  // move-in report existed when it was created — surface that.
  const hasEntryData =
    type === "move_out" &&
    data.rooms.some((room) =>
      room.elements.some((element) => element.entry_condition != null),
    );

  const doc = Array.isArray(report.documents)
    ? report.documents[0]
    : report.documents;
  const docPath = (doc as { path: string } | null)?.path ?? null;
  const documentUrl = docPath ? await signDocument(docPath) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/leases/${id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {editorDict.backToLease}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-slate-600">
          {property?.label ?? `${property?.address}, ${property?.city}`}
          {tenant?.full_name ? ` — ${tenant.full_name}` : ""}
        </p>
      </div>

      {finalized === "1" && (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {editorDict.finalized}
        </p>
      )}

      {type === "move_out" && report.status === "draft" && !hasEntryData && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {editorDict.noMoveIn}
        </p>
      )}

      {report.status === "completed" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">{editorDict.completedNotice}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {crDict.download}
              </a>
            )}
            <form action={reopenConditionReportAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="report_id" value={report.id} />
              <ConfirmSubmit
                message={editorDict.confirmReopen}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {editorDict.reopen}
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      ) : (
        <ReportEditor
          locale={locale as Locale}
          reportId={report.id as string}
          type={type}
          initial={data}
          photoUrls={photoUrls}
          dict={editorDict}
        />
      )}
    </div>
  );
}
