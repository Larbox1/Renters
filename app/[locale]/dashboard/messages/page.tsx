import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";

type ConversationRow = {
  counterpart_id: string;
  counterpart_name: string | null;
  counterpart_email: string | null;
  counterpart_role: Role;
  last_message_id: string;
  last_message_body: string;
  last_message_at: string;
  last_message_inbound: boolean;
  unread_count: number;
};

function formatRelativeTime(value: string, locale: Locale): string {
  const d = new Date(value);
  const now = new Date();
  const sameDay =
    d.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: sameDay ? undefined : "medium",
    timeStyle: sameDay ? "short" : undefined,
  } as Intl.DateTimeFormatOptions).format(d);
}

export default async function MessagesPage({
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

  const { data, error } = await session.supabase.rpc("list_my_conversations");
  if (error) {
    console.error("[messages] list_my_conversations failed:", error);
  }
  const conversations = (data ?? []) as ConversationRow[];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.messages.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/messages/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.messages.newConversation}
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.messages.empty}</p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {conversations.map((c) => {
            const name = c.counterpart_name ?? c.counterpart_email ?? "—";
            const isUnread = c.unread_count > 0;
            return (
              <li key={c.counterpart_id}>
                <Link
                  href={`/${locale}/dashboard/messages/${c.counterpart_id}`}
                  className={`flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50 ${
                    isUnread ? "bg-brand-50/40" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold uppercase text-brand-700">
                    {name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          isUnread
                            ? "font-semibold text-slate-900"
                            : "font-medium text-slate-800"
                        }`}
                      >
                        {name}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatRelativeTime(
                          c.last_message_at,
                          locale as Locale,
                        )}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-sm ${
                        isUnread
                          ? "font-medium text-slate-800"
                          : "text-slate-500"
                      }`}
                    >
                      {!c.last_message_inbound && `${dict.messages.you}: `}
                      {c.last_message_body}
                    </p>
                  </div>
                  {isUnread && (
                    <span className="ml-2 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
