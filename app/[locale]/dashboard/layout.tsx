import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";
import { isPlanId, planPropertyLimit, type PlanId } from "@/lib/plans";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { AddMenu, type AddMenuItem } from "@/components/add-menu";
import {
  NotificationsBell,
  type NotificationItem,
} from "@/components/notifications-bell";
import { PollRefresh } from "@/components/poll-refresh";

type ConversationRow = {
  counterpart_id: string;
  counterpart_name: string | null;
  counterpart_email: string | null;
  last_message_body: string;
  unread_count: number;
};

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
  // skip the chrome when the user isn't authenticated yet.
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

  // Header chrome data: the role-aware "+" menu and the notifications feed.
  // These live in the dashboard top bar (the global navbar only renders for
  // logged-out marketing pages).
  const addItems: AddMenuItem[] = [];
  const notifications: NotificationItem[] = [];
  if (session) {
    if (session.role === "owner" || session.role === "admin") {
      addItems.push(
        {
          href: `/${locale}/dashboard/properties/new`,
          label: dict.properties.newProperty,
        },
        {
          href: `/${locale}/dashboard/tenants/new`,
          label: dict.tenants.newTenant,
        },
        {
          href: `/${locale}/dashboard/leases/new`,
          label: dict.leases.newLease,
        },
      );
    }
    addItems.push({
      href: `/${locale}/dashboard/messages/new`,
      label: dict.messages.newConversation,
    });

    // Notifications: unread conversations + (owners) properties flagged to rent
    // that still have no active lease.
    const isOwner = session.role === "owner";
    const [convRes, propsRes, activeLeasesRes] = await Promise.all([
      session.supabase.rpc("list_my_conversations"),
      isOwner
        ? session.supabase
            .from("properties")
            .select("id, label, address, city")
            .eq("to_rent", true)
        : Promise.resolve({
            data: [] as {
              id: string;
              label: string | null;
              address: string;
              city: string;
            }[],
            error: null,
          }),
      isOwner
        ? session.supabase
            .from("leases")
            .select("property_id")
            .eq("status", "active")
        : Promise.resolve({
            data: [] as { property_id: string }[],
            error: null,
          }),
    ]);

    if (convRes.error) {
      console.error(
        "[dashboard.notifications] list_my_conversations failed:",
        convRes.error,
      );
    } else {
      const rows = (convRes.data ?? []) as ConversationRow[];
      for (const c of rows) {
        if (c.unread_count > 0 && notifications.length < 5) {
          notifications.push({
            id: `msg:${c.counterpart_id}`,
            name: c.counterpart_name ?? c.counterpart_email ?? c.counterpart_id,
            preview: c.last_message_body,
            unreadCount: c.unread_count,
            href: `/${locale}/dashboard/messages/${c.counterpart_id}`,
          });
        }
      }
    }

    if (!propsRes.error && !activeLeasesRes.error && isOwner) {
      const rentedIds = new Set(
        (activeLeasesRes.data ?? []).map((l) => l.property_id),
      );
      let added = 0;
      for (const p of propsRes.data ?? []) {
        if (added >= 5) break;
        if (rentedIds.has(p.id)) continue;
        notifications.push({
          id: `prop:${p.id}`,
          name: p.label ?? `${p.address}, ${p.city}`,
          preview: dict.nav.propertyNotRented,
          unreadCount: 1,
          href: `/${locale}/dashboard/properties/${p.id}`,
          icon: "🏠",
        });
        added++;
      }
    }
  }

  const logoSrc =
    locale === "fr" ? "/meskasas_logo_fr.png" : "/meskasas_logo_en.png";

  // Path-segment → label map for the breadcrumb. Unmapped segments (record ids)
  // fall back to the generic "details" label.
  const crumbLabels: Record<string, string> = {
    dashboard: dict.dashboard.sidebar.overview,
    properties: dict.dashboard.sidebar.properties,
    tenants: dict.dashboard.sidebar.tenants,
    leases: dict.dashboard.sidebar.leases,
    documents: dict.dashboard.sidebar.documents,
    finance: dict.dashboard.sidebar.finance,
    messages: dict.dashboard.sidebar.messages,
    users: dict.dashboard.sidebar.users,
    settings: dict.dashboard.sidebar.settings,
    "my-lease": dict.myLease.title,
    "the-hub": "The Hub",
    search: dict.dashboard.sidebar.search.replace("…", "").trim(),
    new: dict.dashboard.breadcrumb.new,
    edit: dict.dashboard.breadcrumb.edit,
    contract: dict.dashboard.breadcrumb.contract,
  };

  return (
    <div className="flex w-full flex-col md:h-screen md:flex-row md:overflow-hidden">
      {session && (
        <DashboardSidebarShell
          toggleLabel={dict.dashboard.sidebar.toggleSidebar}
          logoSrc={logoSrc}
          homeHref={`/${locale}`}
        >
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

      <div className="flex min-w-0 flex-1 flex-col md:h-full">
        {session && (
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6 print:hidden">
            <DashboardBreadcrumb
              labels={crumbLabels}
              fallback={dict.dashboard.breadcrumb.details}
            />
            <div className="flex shrink-0 items-center gap-2">
              <AddMenu items={addItems} ariaLabel={dict.nav.addMenu} />
              <NotificationsBell
                items={notifications}
                ariaLabel={dict.nav.notifications}
                emptyLabel={dict.nav.notificationsEmpty}
                viewAllLabel={dict.nav.notificationsViewAll}
                viewAllHref={`/${locale}/dashboard/messages`}
              />
            </div>
          </header>
        )}
        <div className="min-w-0 flex-1 md:overflow-y-auto">{children}</div>
      </div>

      {session && <PollRefresh />}
    </div>
  );
}
