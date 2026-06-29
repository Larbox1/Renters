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
import {
  planStorageLimit,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import {
  cancelSubscriptionAction,
  deleteOwnAccountAction,
  openBillingPortalAction,
  resumeSubscriptionAction,
} from "./actions";
import { ProfileForm } from "./profile-form";
import { PlanSelector } from "./plan-selector";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
};

type BillingRow = {
  plan: PlanId;
  plan_interval: BillingInterval | null;
  subscription_status: string | null;
  plan_current_period_end: string | null;
  plan_cancel_at_period_end: boolean | null;
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const { billing } = await searchParams;

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const isAdmin = session.role === "admin";
  const isOwner = session.role === "owner";

  // Current subscription plan + Stripe state (owners only).
  let currentPlan: PlanId = "free";
  let billingState: BillingRow | null = null;
  if (isOwner) {
    const { data } = await session.supabase
      .from("profiles")
      .select(
        "plan, plan_interval, subscription_status, plan_current_period_end, plan_cancel_at_period_end",
      )
      .eq("id", session.user.id)
      .maybeSingle<BillingRow>();
    billingState = data;
    currentPlan = data?.plan ?? "free";
  }
  // Subscribed = on a paid tier. Switches/cancellations then go through the
  // Stripe Customer Portal; only free users see Checkout buttons.
  const isSubscribed = isOwner && currentPlan !== "free";
  const periodEnd = billingState?.plan_current_period_end
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "long",
      }).format(new Date(billingState.plan_current_period_end))
    : null;

  // Plan descriptions reuse the copy shown on the public landing page
  // (pricing section), keyed by the plan id stored in each plan's `dot`.
  const planDescriptions = Object.fromEntries(
    dict.home.pricing.plans.map((pl) => [pl.dot, pl.desc]),
  ) as Record<PlanId, string>;

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

      {isOwner && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            {dict.settings.plan.heading}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {dict.settings.plan.subtitle}
          </p>

          {billing === "success" && (
            <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
              {dict.settings.plan.billingSuccess}
            </p>
          )}
          {billing === "canceled" && (
            <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {dict.settings.plan.billingCanceled}
            </p>
          )}
          {(billing === "error" || billing === "unconfigured") && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {dict.settings.plan.billingError}
            </p>
          )}
          {billing === "cancel_scheduled" && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {dict.settings.plan.cancelScheduled}
            </p>
          )}
          {billing === "resumed" && (
            <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
              {dict.settings.plan.resumed}
            </p>
          )}

          {isSubscribed && (
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {dict.settings.plan.currentBadge}: {dict.settings.plan.names[currentPlan]}
                  {billingState?.plan_interval && (
                    <span className="ml-1.5 font-normal text-slate-500">
                      ·{" "}
                      {billingState.plan_interval === "year"
                        ? dict.settings.plan.billingAnnual
                        : dict.settings.plan.billingMonthly}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {billingState?.plan_cancel_at_period_end && periodEnd
                    ? dict.settings.plan.cancelsOn.replace("{date}", periodEnd)
                    : periodEnd
                      ? dict.settings.plan.renewsOn.replace("{date}", periodEnd)
                      : dict.settings.plan.manageHint}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={openBillingPortalAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {dict.settings.plan.manageBilling}
                  </button>
                </form>
                {billingState?.plan_cancel_at_period_end ? (
                  <form action={resumeSubscriptionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                    >
                      {dict.settings.plan.resumeSubscription}
                    </button>
                  </form>
                ) : (
                  <form action={cancelSubscriptionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <ConfirmSubmit
                      message={dict.settings.plan.confirmCancel}
                      className="whitespace-nowrap rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
                    >
                      {dict.settings.plan.cancelSubscription}
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </div>
          )}

          <PlanSelector
            locale={locale as Locale}
            currentPlan={currentPlan}
            currentInterval={billingState?.plan_interval ?? null}
            isSubscribed={isSubscribed}
            dict={dict.settings.plan}
            descriptions={planDescriptions}
          />
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
          email={session.user.email ?? ""}
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
          limitBytes={isOwner ? planStorageLimit(currentPlan) : undefined}
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