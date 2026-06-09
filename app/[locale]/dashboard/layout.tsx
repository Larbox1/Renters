import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";
import { isPlanId, planPropertyLimit, type PlanId } from "@/lib/plans";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import { PollRefresh } from "@/components/poll-refresh";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  // Resolve the session here only to render a role-aware sidebar. The
  // page-level checks still own redirects / setup notices, so we silently
  // skip the sidebar when the user isn't authenticated yet.
  const session = hasSupabaseEnv() ? await getCurrentSession() : null;

  // Lightweight count of unread received messages for the sidebar badge.
  let unreadMessages = 0;
  if (session) {
    const { count } = await session.supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .is("read_at", null);
    unreadMessages = count ?? 0;
  }

  // Subscription quota for the sidebar plan card (owners only — only owners
  // carry a plan and hold properties against it). RLS scopes the property
  // count to this owner, matching the create-property guard.
  let plan:
    | { name: string; used: number; limit: number | null; canUpgrade: boolean }
    | undefined;
  if (session && session.role === "owner") {
    const { data: planRow } = await session.supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .maybeSingle<{ plan: string }>();
    const planId: PlanId = isPlanId(planRow?.plan ?? "")
      ? (planRow!.plan as PlanId)
      : "free";
    const { count } = await session.supabase
      .from("properties")
      .select("id", { count: "exact", head: true });
    plan = {
      name: dict.settings.plan.names[planId],
      used: count ?? 0,
      limit: planPropertyLimit(planId),
      canUpgrade: planId !== "unlimited",
    };
  }

  return (
    <div className="flex w-full flex-col md:h-[calc(100vh-4rem)] md:flex-row md:overflow-hidden">
      {session && (
        <DashboardSidebarShell toggleLabel={dict.dashboard.sidebar.toggleSidebar}>
          <DashboardSidebar
            locale={locale as Locale}
            role={session.role}
            dict={dict.dashboard.sidebar}
            unreadMessages={unreadMessages}
            fullName={session.fullName}
            email={session.user.email ?? ""}
            roleLabel={dict.roles[session.role]}
            plan={plan}
          />
        </DashboardSidebarShell>
      )}
      <div className="min-w-0 flex-1 md:h-full md:overflow-y-auto">{children}</div>
      {session && <PollRefresh />}
    </div>
  );
}
