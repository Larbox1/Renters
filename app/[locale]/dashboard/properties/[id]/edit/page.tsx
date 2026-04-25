import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { PropertyForm } from "../../property-form";

export default async function EditPropertyPage({
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

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/properties/${id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.properties.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.properties.form.editTitle}
        </h1>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <PropertyForm locale={locale as Locale} dict={dict.properties} property={property} />
      </div>
    </div>
  );
}
