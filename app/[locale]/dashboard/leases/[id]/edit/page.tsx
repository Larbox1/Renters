import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { LeaseForm } from "../../lease-form";

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const [{ data: lease }, { data: properties }, { data: tenants }] = await Promise.all([
    supabase.from("leases").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("properties")
      .select("id, label, address, city, monthly_rent_cents")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select("id, full_name")
      .order("full_name", { ascending: true }),
  ]);

  if (!lease) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/leases/${id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.leases.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.leases.form.editTitle}
        </h1>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <LeaseForm
          locale={locale as Locale}
          dict={dict.leases}
          properties={properties ?? []}
          tenants={tenants ?? []}
          lease={lease}
        />
      </div>
    </div>
  );
}
