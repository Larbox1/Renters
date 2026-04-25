import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
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

  const [{ data: lease }, { data: properties }, { data: tenants }] = await Promise.all([
    supabase.from("leases").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("properties")
      .select("id, label, address, city")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select("id, full_name")
      .order("full_name", { ascending: true }),
  ]);

  if (!lease) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
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
