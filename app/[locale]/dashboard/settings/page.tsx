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
import { deleteOwnAccountAction } from "./actions";

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
    <div className="mx-auto max-w-4xl px-6 py-12">
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