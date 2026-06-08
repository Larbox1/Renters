import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
import { locales, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";
import type { AddMenuItem } from "@/components/add-menu";
import type { NotificationItem } from "@/components/notifications-bell";

type ConversationRow = {
  counterpart_id: string;
  counterpart_name: string | null;
  counterpart_email: string | null;
  last_message_body: string;
  unread_count: number;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.siteTitle,
    description: dict.meta.siteDescription,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  const session = hasSupabaseEnv() ? await getCurrentSession() : null;
  const userEmail = session?.user.email ?? null;

  // Build the role-aware "+" menu items (only items the user can act on).
  const addItems: AddMenuItem[] = [];
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
  }

  // Notifications: unread conversations + (for managers) properties flagged
  // for rent that have no active lease yet. Both sources are merged into a
  // single list; the bell sums their unreadCount values for its badge.
  const notifications: NotificationItem[] = [];
  if (session) {
    // Property notifications are owner-only. Admins, tenants, and service
    // providers only receive message notifications at this stage.
    const isOwner = session.role === "owner";

    const [convRes, propsRes, activeLeasesRes] = await Promise.all([
      session.supabase.rpc("list_my_conversations"),
      isOwner
        ? session.supabase
            .from("properties")
            .select("id, label, address, city")
            .eq("to_rent", true)
        : Promise.resolve({ data: [] as { id: string; label: string | null; address: string; city: string }[], error: null }),
      isOwner
        ? session.supabase
            .from("leases")
            .select("property_id")
            .eq("status", "active")
        : Promise.resolve({ data: [] as { property_id: string }[], error: null }),
    ]);

    if (convRes.error) {
      console.error(
        "[layout.notifications] list_my_conversations failed:",
        convRes.error,
      );
    } else {
      const rows = (convRes.data ?? []) as ConversationRow[];
      for (const c of rows) {
        if (c.unread_count > 0 && notifications.length < 5) {
          notifications.push({
            id: `msg:${c.counterpart_id}`,
            name:
              c.counterpart_name ?? c.counterpart_email ?? c.counterpart_id,
            preview: c.last_message_body,
            unreadCount: c.unread_count,
            href: `/${locale}/dashboard/messages/${c.counterpart_id}`,
          });
        }
      }
    }

    if (propsRes.error) {
      console.error(
        "[layout.notifications] properties query failed:",
        propsRes.error,
      );
    } else if (activeLeasesRes.error) {
      console.error(
        "[layout.notifications] active leases query failed:",
        activeLeasesRes.error,
      );
    } else if (isOwner) {
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

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        <Navbar
          locale={locale as Locale}
          dict={dict.nav}
          userEmail={userEmail}
          addItems={addItems}
          notifications={notifications}
          utility={dict.home.utility}
        />
        <main className="flex-1">{children}</main>
        {!userEmail && <Footer locale={locale as Locale} dict={dict.footer} />}
      </body>
    </html>
  );
}
