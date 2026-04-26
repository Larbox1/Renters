import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";

type Recipient = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
};

export default async function NewConversationPage({
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

  const { data, error } = await session.supabase.rpc("messageable_recipients");
  if (error) {
    console.error("[messages.new] messageable_recipients failed:", error);
  }
  const recipients = (data ?? []) as Recipient[];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/messages`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.messages.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.messages.startConversation}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {dict.messages.pickRecipient}
        </p>
      </div>

      {recipients.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.messages.noContacts}</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {recipients.map((r) => {
            const name = r.full_name ?? r.email ?? "—";
            return (
              <li key={r.id}>
                <Link
                  href={`/${locale}/dashboard/messages/${r.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold uppercase text-brand-700">
                    {name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {name}
                    </p>
                    {r.email && r.email !== name && (
                      <p className="truncate text-xs text-slate-500">
                        {r.email}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {dict.roles[r.role]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
