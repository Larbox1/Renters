import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession } from "@/lib/auth/current-user";
import { LanguageSwitcher } from "@/components/language-switcher";

type StorageRow = {
  bucket_id: string;
  file_count: number;
  total_bytes: number;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

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

  // Admins see global storage; everyone else sees only their own usage.
  const rpcName = isAdmin ? "get_storage_usage" : "get_my_storage_usage";
  const { data, error } = await session.supabase.rpc(rpcName);
  if (error) {
    console.error(`[settings] ${rpcName} failed:`, error);
  }
  const storage = (data ?? []) as StorageRow[];

  const totalBytes = storage.reduce((s, r) => s + (r.total_bytes ?? 0), 0);
  const totalFiles = storage.reduce((s, r) => s + (r.file_count ?? 0), 0);

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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isAdmin
              ? dict.settings.storage.heading
              : dict.settings.storage.myHeading}
          </h2>
          <p className="text-sm text-slate-500">
            {dict.settings.storage.total}:{" "}
            <span className="font-semibold text-slate-900">
              {formatBytes(totalBytes)}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              ({totalFiles} {dict.settings.storage.files.toLowerCase()})
            </span>
          </p>
        </div>
        {storage.length === 0 ? (
          <p className="text-sm text-slate-600">
            {dict.settings.storage.empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">
                    {dict.settings.storage.bucket}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.settings.storage.files}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">
                    {dict.settings.storage.size}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storage.map((row) => (
                  <tr key={row.bucket_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {row.bucket_id}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {row.file_count}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700">
                      {formatBytes(row.total_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
