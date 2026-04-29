"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Role } from "@/lib/auth/current-user";

export type ConversationRow = {
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
  const sameDay = d.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: sameDay ? undefined : "medium",
    timeStyle: sameDay ? "short" : undefined,
  } as Intl.DateTimeFormatOptions).format(d);
}

export function ConversationsList({
  locale,
  conversations,
  dict,
}: {
  locale: Locale;
  conversations: ConversationRow[];
  dict: Dictionary["messages"];
}) {
  const params = useParams<{ id?: string }>();
  const activeId = typeof params?.id === "string" ? params.id : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900">
          {dict.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/messages/new`}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.newConversation}
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-600">{dict.empty}</p>
      ) : (
        <ul className="flex-1 divide-y divide-slate-200 overflow-y-auto">
          {conversations.map((c) => {
            const name = c.counterpart_name ?? c.counterpart_email ?? "—";
            const isActive = c.counterpart_id === activeId;
            const isUnread = c.unread_count > 0;
            return (
              <li key={c.counterpart_id}>
                <Link
                  href={`/${locale}/dashboard/messages/${c.counterpart_id}`}
                  className={`flex items-start gap-3 px-4 py-3 transition ${
                    isActive
                      ? "bg-brand-50"
                      : isUnread
                        ? "bg-brand-50/30 hover:bg-brand-50"
                        : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold uppercase text-brand-700">
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
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {formatRelativeTime(
                          c.last_message_at,
                          locale,
                        )}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        isUnread
                          ? "font-medium text-slate-700"
                          : "text-slate-500"
                      }`}
                    >
                      {!c.last_message_inbound && `${dict.you}: `}
                      {c.last_message_body}
                    </p>
                  </div>
                  {isUnread && (
                    <span className="ml-1 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
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
