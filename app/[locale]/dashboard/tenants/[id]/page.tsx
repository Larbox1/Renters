import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { deleteTenantAction } from "../actions";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "tenant";
  if (role !== "owner" && role !== "admin") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">{dict.accessDenied.title}</h1>
        <p className="mt-2 text-slate-600">{dict.accessDenied.message}</p>
      </div>
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/tenants`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.tenants.backToList}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {tenant.full_name}
          </h1>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/${locale}/dashboard/tenants/${id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {dict.tenants.editTenant}
            </Link>
            <form action={deleteTenantAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm(dict.tenants.confirmDelete)) e.preventDefault();
                }}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                {dict.tenants.deleteTenant}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tenant.email && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.tenants.fields.email}
            </p>
            <p className="mt-1 text-sm text-slate-900">{tenant.email}</p>
          </div>
        )}
        {tenant.phone && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.tenants.fields.phone}
            </p>
            <p className="mt-1 text-sm text-slate-900">{tenant.phone}</p>
          </div>
        )}
        {tenant.notes && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.tenants.fields.notes}
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-900">{tenant.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
