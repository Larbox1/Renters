import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { currencyFor } from "@/lib/currency";
import {
  Calendar,
  type CalendarEvent,
} from "@/components/calendar";
import {
  CashflowChart,
  type MonthlyCashflow,
} from "@/components/cashflow-chart";
import {
  StorageUsageTable,
  type StorageUsageRow,
} from "@/components/storage-usage-table";

function parseMonth(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Aggregate finance transactions into the trailing 12 monthly buckets, oldest
// first. Empty months are kept so the chart shows a continuous axis.
function buildCashflow(
  rows: { kind: string; amount_cents: number; occurred_on: string }[],
  year: number,
  month0: number, // 0-based month of the most recent bucket
): MonthlyCashflow[] {
  const months: MonthlyCashflow[] = [];
  const byMonth = new Map<string, MonthlyCashflow>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month0 - i, 1);
    const bucket: MonthlyCashflow = {
      month: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      incomeCents: 0,
      expenseCents: 0,
    };
    months.push(bucket);
    byMonth.set(bucket.month, bucket);
  }
  for (const r of rows) {
    const bucket = byMonth.get(r.occurred_on.slice(0, 7));
    if (!bucket) continue;
    if (r.kind === "income") bucket.incomeCents += r.amount_cents;
    else if (r.kind === "expense") bucket.expenseCents += r.amount_cents;
  }
  return months;
}

type LeaseCalendarRow = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  revision_date: string | null;
  payment_day_of_month: number | null;
  tenants:
    | { full_name: string | null; date_of_birth: string | null }
    | { full_name: string | null; date_of_birth: string | null }[]
    | null;
  properties:
    | { label: string | null; address: string | null }
    | { label: string | null; address: string | null }[]
    | null;
};

// Supabase returns a many-to-one embed as an object, but the generated types
// (and older PostgREST versions) can surface it as a one-element array.
function pickOne<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

// Expand each lease into the calendar events that fall in the displayed month.
// Recurring events (revision, birthday, rent payment) are projected onto the
// month; one-off events (start/end) are only emitted when they land in it.
function buildCalendarEvents(
  leases: LeaseCalendarRow[],
  asOwner: boolean,
  year: number,
  month: number, // 0-based
): CalendarEvent[] {
  const monthKey = `${year}-${pad2(month + 1)}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events: CalendarEvent[] = [];
  const birthdaysSeen = new Set<string>();

  const inThisMonth = (iso: string) => iso.slice(0, 7) === monthKey;
  const withinLease = (iso: string, start: string | null, end: string | null) =>
    (!start || iso >= start) && (!end || iso <= end);
  // Same month/day as `iso`, projected into the displayed month/year (clamped
  // so e.g. Feb 29 lands on the 28th in non-leap years).
  const annualOccurrence = (iso: string): string | null => {
    if (Number(iso.slice(5, 7)) - 1 !== month) return null;
    const day = Math.min(Number(iso.slice(8, 10)), daysInMonth);
    return `${monthKey}-${pad2(day)}`;
  };

  for (const l of leases) {
    const tenant = pickOne(l.tenants);
    const property = pickOne(l.properties);
    const tenantName = tenant?.full_name ?? null;
    const propLabel = property?.label ?? property?.address ?? null;
    const counterpart = (asOwner ? tenantName ?? propLabel : propLabel) ?? "";

    if (l.start_date && inThisMonth(l.start_date))
      events.push({ date: l.start_date, kind: "lease_start", label: counterpart, leaseId: l.id });

    if (l.end_date && inThisMonth(l.end_date))
      events.push({ date: l.end_date, kind: "lease_end", label: counterpart, leaseId: l.id });

    if (l.revision_date) {
      const occ = annualOccurrence(l.revision_date);
      if (occ && withinLease(occ, l.start_date, l.end_date))
        events.push({ date: occ, kind: "lease_revision", label: counterpart, leaseId: l.id });
    }

    if (tenant?.date_of_birth) {
      const occ = annualOccurrence(tenant.date_of_birth);
      // A tenant can hold several leases — show their birthday once.
      if (occ && !birthdaysSeen.has(`${tenantName ?? l.id}-${occ}`)) {
        birthdaysSeen.add(`${tenantName ?? l.id}-${occ}`);
        events.push({ date: occ, kind: "tenant_birthday", label: tenantName ?? counterpart, leaseId: l.id });
      }
    }

    if (l.payment_day_of_month != null) {
      const day = Math.min(Math.max(l.payment_day_of_month, 1), daysInMonth);
      const occ = `${monthKey}-${pad2(day)}`;
      if (withinLease(occ, l.start_date, l.end_date))
        events.push({ date: occ, kind: "rent_payment", label: counterpart, leaseId: l.id });
    }
  }
  return events;
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) {
    return <SetupNotice locale={locale as Locale} />;
  }

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const { role, fullName } = session;
  const showOwnerNav = isOwnerOrAdmin(role);
  const showCalendar = role !== "admin";

  // Stats — fetched in parallel. RLS already restricts what each role sees.
  let propertiesCount = 0;
  let occupiedCount = 0;
  let activeLeasesCount = 0;
  let portfolioValueCents = 0;

  if (showOwnerNav) {
    const [propsRes, propsValues, activeLeases] = await Promise.all([
      session.supabase
        .from("properties")
        .select("*", { count: "exact", head: true }),
      session.supabase.from("properties").select("value_cents"),
      session.supabase
        .from("leases")
        .select("property_id")
        .eq("status", "active"),
    ]);

    propertiesCount = propsRes.count ?? 0;
    portfolioValueCents = (propsValues.data ?? []).reduce(
      (sum, p) => sum + (p.value_cents ?? 0),
      0,
    );
    const leases = activeLeases.data ?? [];
    activeLeasesCount = leases.length;
    occupiedCount = new Set(leases.map((l) => l.property_id)).size;
  }

  const occupancyPct =
    propertiesCount > 0
      ? Math.round((occupiedCount / propertiesCount) * 100)
      : 0;

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: currencyFor(session.operationCountry),
      maximumFractionDigits: 0,
    }).format(cents / 100);

  // Calendar (non-admin only). Resolve month from URL param.
  const sp = await searchParams;
  const monthDate = parseMonth(sp.month);

  // Admins see global storage usage on the overview.
  let storageRows: StorageUsageRow[] = [];
  if (role === "admin") {
    const { data, error } = await session.supabase.rpc("get_storage_usage");
    if (error) {
      console.error("[dashboard.storage] get_storage_usage failed:", error);
    } else {
      storageRows = (data ?? []) as StorageUsageRow[];
    }
  }

  let calendarEvents: CalendarEvent[] = [];
  if (showCalendar) {
    // RLS scopes this per role: owners/admins see every lease, tenants only
    // their own. We expand each lease into calendar events client-side.
    const { data, error } = await session.supabase
      .from("leases")
      .select(
        "id, start_date, end_date, revision_date, payment_day_of_month, tenants(full_name, date_of_birth), properties(label, address)",
      );
    if (error) {
      console.error("[dashboard.calendar] leases fetch failed:", error);
    } else {
      calendarEvents = buildCalendarEvents(
        (data ?? []) as LeaseCalendarRow[],
        isOwnerOrAdmin(role),
        monthDate.getFullYear(),
        monthDate.getMonth(),
      );
    }
  }

  // Cash flow (owners): trailing 12 months of recorded income / expense. The
  // chart's range selector (3/6/12) slices this client-side, so we fetch the
  // full window once.
  let cashflow: MonthlyCashflow[] = [];
  if (role === "owner") {
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const { data, error } = await session.supabase
      .from("finance_transactions")
      .select("kind, amount_cents, occurred_on")
      .gte(
        "occurred_on",
        `${windowStart.getFullYear()}-${pad2(windowStart.getMonth() + 1)}-01`,
      );
    if (error) {
      console.error("[dashboard.cashflow] finance fetch failed:", error);
    } else {
      cashflow = buildCashflow(
        (data ?? []) as {
          kind: string;
          amount_cents: number;
          occurred_on: string;
        }[],
        now.getFullYear(),
        now.getMonth(),
      );
    }
  }

  return (
    <div className="px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {dict.dashboard.title}
          </h1>
          <p className="mt-1 text-slate-600">
            {dict.dashboard.greeting.replace("{name}", fullName)}
          </p>
        </div>

        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
        </form>
      </div>

      {showOwnerNav && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.properties}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {propertiesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/leases`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.activeLeases}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {activeLeasesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.occupancy}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {occupancyPct}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {occupiedCount} / {propertiesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.portfolioValue}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {fmtCurrency(portfolioValueCents)}
            </p>
          </Link>
        </div>
      )}

      {role === "owner" && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-3">
            <CashflowChart
              locale={locale as Locale}
              data={cashflow}
              dict={dict.dashboard.cashflow}
            />
          </div>
        </div>
      )}

      {showCalendar && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-3">
            <Calendar
              locale={locale as Locale}
              monthDate={monthDate}
              events={calendarEvents}
              baseUrl={`/${locale}/dashboard`}
              dict={dict.dashboard.calendar}
            />
          </div>
        </div>
      )}

      {role === "admin" && (
        <div className="mt-8">
          <StorageUsageTable
            heading={dict.settings.storage.heading}
            rows={storageRows}
            dict={dict.settings.storage}
          />
        </div>
      )}
    </div>
  );
}
