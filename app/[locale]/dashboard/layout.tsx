import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
      {session && (
        <aside className="border-b border-slate-200 bg-slate-50 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <DashboardSidebar
            locale={locale as Locale}
            role={session.role}
            dict={dict.dashboard.sidebar}
          />
        </aside>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
