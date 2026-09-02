import type { Dictionary } from "@/i18n/dictionaries/en";
import type { CurrencyCode } from "@/lib/currency";
import type { MoneyFormatter } from "@/lib/money";

export type RentRollProperty = {
  id: string;
  label: string | null;
  address: string;
  city: string;
};

export type RentRollLease = {
  property_id: string;
  monthly_rent_cents: number;
  tenants:
    | { full_name: string }
    | { full_name: string }[]
    | null;
};

function tenantName(t: RentRollLease["tenants"]): string | null {
  if (!t) return null;
  if (Array.isArray(t)) return t[0]?.full_name ?? null;
  return t.full_name;
}

export function RentRollTable({
  properties,
  leasesByProperty,
  currencyOf,
  money,
  totalFormatted,
  dict,
}: {
  properties: RentRollProperty[];
  leasesByProperty: Map<string, RentRollLease[]>;
  currencyOf: (propertyId: string) => CurrencyCode;
  money: MoneyFormatter;
  /** Cross-property monthly total, preformatted in the display currency. */
  totalFormatted: string;
  dict: Dictionary["finance"]["breakdown"];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {dict.heading}
        </h2>
      </div>
      {properties.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-600">{dict.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.property}
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.status}
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.tenant}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">
                  {dict.rent}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((p) => {
                const leases = leasesByProperty.get(p.id) ?? [];
                const propertyRent = leases.reduce(
                  (s, l) => s + (l.monthly_rent_cents ?? 0),
                  0,
                );
                const tenants = leases
                  .map((l) => tenantName(l.tenants))
                  .filter((n): n is string => Boolean(n));
                const isVacant = leases.length === 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {p.label ?? p.address}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.address}, {p.city}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          isVacant
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isVacant ? dict.vacant : dict.rented}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {tenants.length > 0 ? tenants.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {isVacant ? "—" : money(propertyRent, currencyOf(p.id))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-700"
                >
                  {dict.total}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                  {totalFormatted}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
