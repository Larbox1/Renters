import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { signDocument } from "@/lib/documents/storage";
import { UploadDocumentForm } from "./upload-form";
import { deleteDocumentAction } from "./actions";

type DocumentRow = {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  source: "uploaded" | "generated";
  created_at: string;
  property_id: string | null;
  lease_id: string | null;
  properties:
    | { id: string; label: string | null; address: string; city: string }
    | { id: string; label: string | null; address: string; city: string }[]
    | null;
};

type PropertySummary = {
  id: string;
  label: string | null;
  address: string;
  city: string;
};

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const [{ data: docs }, { data: props }] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, name, path, mime_type, size, source, created_at, property_id, lease_id, properties(id, label, address, city)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, label, address, city")
      .order("created_at", { ascending: false }),
  ]);

  const documents = (docs ?? []) as DocumentRow[];
  const properties = (props ?? []) as PropertySummary[];

  // Sign URLs for all documents up-front so the table stays click-to-download.
  const signedUrls = new Map<string, string | null>();
  await Promise.all(
    documents.map(async (d) => {
      signedUrls.set(d.id, await signDocument(d.path));
    }),
  );

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const propertyLabel = (
    p:
      | { label: string | null; address: string; city: string }
      | null
      | undefined,
  ) => (p ? (p.label ?? `${p.address}, ${p.city}`) : "—");

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: p.label ?? `${p.address}, ${p.city}`,
  }));

  return (
    <div className="px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        {dict.documents.title}
      </h1>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {dict.documents.upload.heading}
        </h2>
        <UploadDocumentForm
          locale={locale as Locale}
          dict={dict.documents}
          properties={propertyOptions}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {dict.documents.list.heading}
        </h2>

        {documents.length === 0 ? (
          <p className="text-sm text-slate-600">{dict.documents.list.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{dict.documents.list.name}</th>
                  <th className="px-4 py-3">{dict.documents.list.source}</th>
                  <th className="px-4 py-3">{dict.documents.list.property}</th>
                  <th className="px-4 py-3">{dict.documents.list.size}</th>
                  <th className="px-4 py-3">{dict.documents.list.created}</th>
                  <th className="px-4 py-3 text-right">
                    {dict.documents.list.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => {
                  const property = Array.isArray(d.properties)
                    ? d.properties[0]
                    : d.properties;
                  const url = signedUrls.get(d.id);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {url ? (
                          <a
                            href={url}
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
                            ? dict.documents.list.sourceGenerated
                            : dict.documents.list.sourceUploaded}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {property ? (
                          <Link
                            href={`/${locale}/dashboard/properties/${property.id}`}
                            className="text-brand-600 hover:underline"
                          >
                            {propertyLabel(property)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {fmtSize(d.size)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {fmtDate(d.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {d.lease_id && (
                            <Link
                              href={`/${locale}/dashboard/leases/${d.lease_id}`}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {dict.documents.list.viewLease}
                            </Link>
                          )}
                          <form action={deleteDocumentAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={d.id} />
                            <ConfirmSubmit
                              message={dict.documents.list.confirmDelete}
                              className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              {dict.documents.list.delete}
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}