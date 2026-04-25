import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  const { data: properties } = await supabase
    .from("properties")
    .select("id, label, address, city, postal_code, monthly_rent_cents")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.properties.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/properties/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.properties.newProperty}
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.properties.noProperties}</p>
      ) : (
        <ul className="space-y-3">
          {properties.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${locale}/dashboard/properties/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {p.label ?? `${p.address}, ${p.city}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {p.address}, {p.city}
                    {p.postal_code ? ` ${p.postal_code}` : ""}
                  </p>
                </div>
                {p.monthly_rent_cents != null && (
                  <span className="text-sm font-medium text-slate-700">
                    {(p.monthly_rent_cents / 100).toFixed(2)} €/mo
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
