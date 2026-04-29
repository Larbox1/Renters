import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession } from "@/lib/auth/current-user";
import { ConversationsList, type ConversationRow } from "./conversations-list";
import { MessagesShell } from "./messages-shell";

export default async function MessagesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    console.error("[messages.layout] list_my_conversations failed:", error);
  }
  const conversations = (data ?? []) as ConversationRow[];

  return (
    <MessagesShell
      list={
        <ConversationsList
          locale={locale as Locale}
          conversations={conversations}
          dict={dict.messages}
        />
      }
    >
      {children}
    </MessagesShell>
  );
}
