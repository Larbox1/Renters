import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { PropertyForm, type OwnerOption } from "../../property-form";
import { signPhotos, type PropertyPhoto } from "@/lib/properties/photos";

type ListedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

export default async function EditPropertyPage({
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

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  let owners: OwnerOption[] | undefined;
  if (session.role === "admin") {
    const { data } = await supabase.rpc("list_users");
    owners = ((data ?? []) as ListedUser[])
      .filter((u) => u.role === "owner")
      .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email }));
  }

  const existingPhotos = await signPhotos(
    (property.photos ?? []) as PropertyPhoto[],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
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
        <PropertyForm
          locale={locale as Locale}
          dict={dict.properties}
          property={property}
          owners={owners}
          existingPhotos={existingPhotos}
        />
      </div>
    </div>
  );
}
