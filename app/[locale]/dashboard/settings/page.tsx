import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession } from "@/lib/auth/current-user";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  StorageUsageTable,
  type StorageUsageRow,
} from "@/components/storage-usage-table";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PLANS, planPriceCents, type PlanId } from "@/lib/plans";
import { deleteOwnAccountAction, updatePlanAction } from "./actions";
import { ProfileForm } from "./profile-form";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
};

export default async function SettingsPage({
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

  const isAdmin = session.role === "admin";
  const isOwner = session.role === "owner";

  // Current subscription plan (owners only).
  let currentPlan: PlanId = "free";
  if (isOwner) {
    const { data: planRow } = await session.supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .maybeSingle<{ plan: PlanId }>();
    currentPlan = planRow?.plan ?? "free";
  }
  const currentPriceCents = planPriceCents(currentPlan);

  const fmtPlanPrice = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  const { data: profileRow } = await session.supabase
    .from("profiles")
    .select("first_name, last_name, address, city, postal_code, country, phone")
    .eq("id", session.user.id)
    .maybeSingle<ProfileRow>();
  const profile: ProfileRow = profileRow ?? {
    first_name: null,
    last_name: null,
    address: null,
    city: null,
    postal_code: null,
    country: null,
    phone: null,
  };

  // Personal storage usage — non-admins only. Admin's global storage now
  // lives on the dashboard overview.
  let personalStorage: StorageUsageRow[] = [];
  if (!isAdmin) {
    const { data, error } = await session.supabase.rpc(
      "get_my_storage_usage",
    );
    if (error) {
      console.error("[settings] get_my_storage_usage failed:", error);
    } else {
      personalStorage = (data ?? []) as StorageUsageRow[];
    }
  }

  return (
    <div className="px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        {dict.settings.title}
      </h1>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {dict.settings.account.heading}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.settings.account.email}
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {session.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.settings.account.role}
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {dict.roles[session.role]}
            </dd>
          </div>
        </dl>
      </section>

      {isOwner && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            {dict.settings.plan.heading}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {dict.settings.plan.subtitle}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => {
              const isCurrent = p.id === currentPlan;
              const isUpgrade = p.priceCents > currentPriceCents;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    isCurrent
                      ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {dict.settings.plan.currentBadge}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-slate-900">
                    {dict.settings.plan.names[p.id]}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {fmtPlanPrice(p.priceCents)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {dict.settings.plan.perMonth}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dict.settings.plan.scopes[p.id]}
                  </p>
                  <div className="mt-4">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="w-full cursor-default rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-400"
                      >
                        {dict.settings.plan.currentBadge}
                      </button>
                    ) : (
                      <form action={updatePlanAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="plan" value={p.id} />
                        <button
                          type="submit"
                          className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            isUpgrade
                              ? "bg-brand-600 text-white hover:bg-brand-700"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isUpgrade
                            ? dict.settings.plan.upgrade
                            : dict.settings.plan.switchPlan}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {dict.settings.profile.heading}
        </h2>
        <ProfileForm
          locale={locale as Locale}
          dict={dict.settings.profile}
          profile={profile}
        />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          {dict.settings.language.heading}
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          {dict.settings.language.hint}
        </p>
        <LanguageSwitcher current={locale as Locale} />
      </section>

      {!isAdmin && (
        <StorageUsageTable
          heading={dict.settings.storage.myHeading}
          rows={personalStorage}
          dict={dict.settings.storage}
        />
      )}

      <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-red-800">
          {dict.settings.dangerZone.heading}
        </h2>
        <p className="mb-4 text-sm text-red-700">
          {dict.settings.dangerZone.deleteAccountDescription}
        </p>
        <form action={deleteOwnAccountAction}>
          <input type="hidden" name="locale" value={locale} />
          <ConfirmSubmit
            message={dict.settings.dangerZone.confirmDeleteAccount}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
          >
            {dict.settings.dangerZone.deleteAccount}
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}