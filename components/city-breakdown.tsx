// Users-per-city breakdown table, shown beside the plan donut. Server
// component — the rows are computed once on the page.
export function CityBreakdown({
  rows,
  title,
  subtitle,
  cityHeader,
  usersHeader,
  emptyLabel,
}: {
  rows: { city: string; count: number }[];
  title: string;
  subtitle: string;
  cityHeader: string;
  usersHeader: string;
  emptyLabel: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyLabel}</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">
                  {cityHeader}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-600">
                  {usersHeader}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.city} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{r.city}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">
                    {r.count}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-2.5 font-semibold text-slate-600">
                  {usersHeader}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                  {total}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
