import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";
import { EditUserForm } from "./edit-user-form";

type EditableUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
};

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== "admin") {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  const { data: rows, error } = await session.supabase.rpc("list_users");
  if (error) {
    console.error("[users.edit] list_users failed:", error);
  }
  const user = ((rows ?? []) as EditableUser[]).find((u) => u.id === id);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/users`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.users.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.users.form.editTitle}
        </h1>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <EditUserForm
          locale={locale as Locale}
          dict={dict.users}
          rolesDict={dict.roles}
          user={user}
        />
      </div>
    </div>
  );
}
