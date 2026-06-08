import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { isPlanId, planPropertyLimit, type PlanId } from "@/lib/plans";
import { PropertyForm, type OwnerOption } from "../property-form";

type ListedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

export default async function NewPropertyPage({
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

  let owners: OwnerOption[] | undefined;
  if (session.role === "admin") {
    const { data } = await session.supabase.rpc("list_users");
    owners = ((data ?? []) as ListedUser[])
      .filter((u) => u.role === "owner")
      .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email }));
  }

  // Owners are capped by their plan; admins are not.
  let atPlanLimit = false;
  if (session.role === "owner") {
    const { data: planRow } = await session.supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .maybeSingle<{ plan: string }>();
    const plan: PlanId = isPlanId(planRow?.plan ?? "")
      ? (planRow!.plan as PlanId)
      : "free";
    const limit = planPropertyLimit(plan);
    if (limit !== null) {
      const { count } = await session.supabase
        .from("properties")
        .select("id", { count: "exact", head: true });
      atPlanLimit = (count ?? 0) >= limit;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/properties`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.properties.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.properties.form.createTitle}
        </h1>
      </div>
      {atPlanLimit ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-amber-800">
            {dict.properties.form.planLimit}
          </p>
          <Link
            href={`/${locale}/dashboard/settings`}
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            {dict.properties.form.upgrade}
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <PropertyForm
            locale={locale as Locale}
            dict={dict.properties}
            owners={owners}
          />
        </div>
      )}
    </div>
  );
}
