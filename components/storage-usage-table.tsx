import type { Dictionary } from "@/i18n/dictionaries/en";

export type StorageUsageRow = {
  bucket_id: string;
  file_count: number;
  total_bytes: number;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

export function StorageUsageTable({
  heading,
  rows,
  dict,
}: {
  heading: string;
  rows: StorageUsageRow[];
  dict: Dictionary["settings"]["storage"];
}) {
  const totalBytes = rows.reduce((s, r) => s + (r.total_bytes ?? 0), 0);
  const totalFiles = rows.reduce((s, r) => s + (r.file_count ?? 0), 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        <p className="text-sm text-slate-500">
          {dict.total}:{" "}
          <span className="font-semibold text-slate-900">
            {formatBytes(totalBytes)}
          </span>
          <span className="ml-2 text-xs text-slate-400">
            ({totalFiles} {dict.files.toLowerCase()})
          </span>
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {dict.bucket}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">
                  {dict.files}
                </th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">
                  {dict.size}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.bucket_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {row.bucket_id}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {row.file_count}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">
                    {formatBytes(row.total_bytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}