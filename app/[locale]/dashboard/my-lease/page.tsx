import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession } from "@/lib/auth/current-user";
import { signDocument } from "@/lib/documents/storage";
import { LeaseDetailCards } from "../leases/lease-detail-cards";
import {
  LeaseDocumentsTable,
  type LeaseDocumentRow,
} from "../leases/lease-documents-table";

type PropertyRef = {
  id: string;
  label: string | null;
  address: string;
  city: string;
} | null;

type TenantRef = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
} | null;

/**
 * Tenant-facing read-only view of their own lease(s). It mirrors the owner's
 * lease detail screen (same field cards) but drops the edit / delete / contract
 * actions and the links to owner-only property and tenant pages. Row Level
 * Security scopes the returned leases to those whose tenant record is linked to
 * the current auth user (see migration 0041).
 */
export default async function MyLeasePage({
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
  const { supabase } = session;

  const { data: leasesData } = await supabase
    .from("leases")
    .select(
      "*, properties(id, label, address, city), tenants(id, full_name, email, phone)",
    )
    .order("start_date", { ascending: false });
  const leases = leasesData ?? [];

  // For each lease, gather the documents available to the tenant — generated
  // contracts (lease_id) plus documents uploaded against the lease's property
  // (property_id) — and sign each path for download. RLS (migration 0042)
  // scopes these to the tenant's own lease.
  const blocks = await Promise.all(
    leases.map(async (lease) => {
      const property = (
        Array.isArray(lease.properties)
          ? lease.properties[0]
          : lease.properties
      ) as PropertyRef;
      const tenant = (
        Array.isArray(lease.tenants) ? lease.tenants[0] : lease.tenants
      ) as TenantRef;

      const { data: docs } = await supabase
        .from("documents")
        .select("id, name, path, source, size, created_at")
        .or(`lease_id.eq.${lease.id},property_id.eq.${lease.property_id}`)
        .order("created_at", { ascending: false });

      const documents: LeaseDocumentRow[] = await Promise.all(
        (docs ?? []).map(async (d) => ({
          id: d.id as string,
          name: d.name as string,
          source: d.source as "uploaded" | "generated",
          size: d.size as number,
          created_at: d.created_at as string,
          url: await signDocument(d.path as string),
        })),
      );

      return { lease, property, tenant, documents };
    }),
  );

  return (
    <div className="px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        {dict.myLease.title}
      </h1>

      {blocks.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.myLease.empty}</p>
      ) : (
        <div className="space-y-10">
          {blocks.map(({ lease, property, tenant, documents }) => (
            <section key={lease.id}>
              {blocks.length > 1 && property && (
                <h2 className="mb-4 text-xl font-semibold text-slate-900">
                  {property.label ?? `${property.address}, ${property.city}`}
                </h2>
              )}
              <LeaseDetailCards
                lease={lease}
                property={property}
                tenant={tenant}
                dict={dict.leases}
                locale={locale as Locale}
                linkRefs={false}
              />
              <LeaseDocumentsTable
                documents={documents}
                dict={dict.documents.list}
                heading={dict.myLease.documents}
                emptyLabel={dict.myLease.noDocuments}
                locale={locale as Locale}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
