import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";
import {
  signAttachments,
  type StoredAttachment,
  type SignedAttachment,
} from "@/lib/messages/attachments";
import { markConversationReadAction } from "../actions";
import { ReplyForm } from "./reply-form";
import { MessageBubble } from "./message-bubble";

type Counterpart = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
};

type RawMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  attachments: StoredAttachment[] | null;
  read_at: string | null;
  created_at: string;
};

type HydratedMessage = Omit<RawMessageRow, "attachments"> & {
  attachments: SignedAttachment[];
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: counterpartId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  // Header: who am I talking to?
  const { data: cpData, error: cpErr } = await session.supabase.rpc(
    "get_counterpart_info",
    { other_user_id: counterpartId },
  );
  if (cpErr) {
    console.error("[messages.conversation] counterpart lookup failed:", cpErr);
  }
  const counterpart = ((cpData ?? []) as Counterpart[])[0];
  if (!counterpart) notFound();

  // Mark unread received messages from this counterpart as read.
  await markConversationReadAction(counterpartId);

  // Fetch conversation messages.
  const { data: msgData, error: msgErr } = await session.supabase.rpc(
    "list_conversation_messages",
    { other_user_id: counterpartId },
  );
  if (msgErr) {
    console.error("[messages.conversation] list failed:", msgErr);
  }
  const rawMessages = (msgData ?? []) as RawMessageRow[];

  // Sign all attachments in one pass so the bubbles can render images inline.
  const messages: HydratedMessage[] = await Promise.all(
    rawMessages.map(async (m) => ({
      ...m,
      attachments: await signAttachments(m.attachments ?? []),
    })),
  );

  const myId = session.user.id;
  const cpName = counterpart.full_name ?? counterpart.email ?? "—";

  // Index of the most recent outbound message — used by the bubble to decide
  // whether to show the read indicator.
  let lastOutboundIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === myId) {
      lastOutboundIndex = i;
      break;
    }
  }

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      timeStyle: "short",
    }).format(new Date(iso));
  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-6 py-6">
      <div className="mb-3">
        <Link
          href={`/${locale}/dashboard/messages`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.messages.backToList}
        </Link>
      </div>

      {/* Header */}
      <header className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-slate-200 bg-white px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold uppercase text-brand-700">
          {cpName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {cpName}
          </p>
          {counterpart.email && counterpart.email !== cpName && (
            <p className="truncate text-xs text-slate-500">
              {counterpart.email}
            </p>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          {dict.roles[counterpart.role]}
        </span>
      </header>

      {/* Message bubbles */}
      <div className="flex-1 space-y-3 overflow-y-auto border-x border-slate-200 bg-slate-50 px-4 py-5">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {dict.messages.empty}
          </p>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              locale={locale as Locale}
              isOutbound={m.sender_id === myId}
              isLastOutbound={i === lastOutboundIndex}
              createdAtLabel={fmtTime(m.created_at)}
              readAtLabel={m.read_at ? fmtDateTime(m.read_at) : null}
              dict={dict.messages}
              message={{
                id: m.id,
                subject: m.subject,
                body: m.body,
                attachments: m.attachments,
                read_at: m.read_at,
                created_at: m.created_at,
              }}
            />
          ))
        )}
      </div>

      {/* Inline reply form */}
      <div className="rounded-b-2xl border border-t-0 border-slate-200">
        <ReplyForm
          locale={locale as Locale}
          recipientId={counterpartId}
          dict={dict.messages}
        />
      </div>
    </div>
  );
}
