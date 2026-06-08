import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { PrintButton } from "./print-button";
import { ContractDocument } from "./contract-document";
import { saveLeaseContractAction } from "./actions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function ContractPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { saved } = await searchParams;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const { data: lease } = await supabase
    .from("leases")
    .select("*, properties(*), tenants(*)")
    .eq("id", id)
    .maybeSingle();

  if (!lease) notFound();
  if (lease.type !== "bail_vide" && lease.type !== "bail_meuble") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href={`/${locale}/dashboard/leases/${id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.leases.backToList}
        </Link>
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          The contract template currently only supports <strong>Bail vide</strong>{" "}
          and <strong>Bail meublé</strong>. Switch the lease type to generate the
          document.
        </p>
      </div>
    );
  }

  const property = Array.isArray(lease.properties)
    ? lease.properties[0]
    : lease.properties;
  const tenant = Array.isArray(lease.tenants)
    ? lease.tenants[0]
    : lease.tenants;

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select(
      "full_name, first_name, last_name, address, city, postal_code, country, phone",
    )
    .eq("id", property?.owner_id)
    .maybeSingle<{
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
      address: string | null;
      city: string | null;
      postal_code: string | null;
      country: string | null;
      phone: string | null;
    }>();

  return (
    <>
      <style>{`
        @media print {
          nav, aside, .no-print { display: none !important; }
          body { background: white !important; }
          .contract-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="bg-slate-100 py-6">
        <div className="mx-auto max-w-[210mm] px-6">
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/${locale}/dashboard/leases/${id}`}
              className="text-sm text-brand-600 hover:underline"
            >
              ← {dict.leases.backToList}
            </Link>
            <div className="flex items-center gap-2">
              {saved === "1" && (
                <span className="text-sm font-medium text-emerald-700">
                  {dict.leases.contractSaved}
                </span>
              )}
              <form action={saveLeaseContractAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="lease_id" value={id} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {dict.leases.saveContract}
                </button>
              </form>
              <PrintButton label={dict.leases.printContract} />
            </div>
          </div>

          <ContractDocument
            data={{ lease, property, tenant, ownerProfile }}
          />
        </div>
      </div>
    </>
  );
}