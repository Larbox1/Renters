import type { Dictionary } from "@/i18n/dictionaries/en";

export function AccessDenied({
  dict,
}: {
  dict: Dictionary["accessDenied"];
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">{dict.title}</h1>
      <p className="mt-2 text-slate-600">{dict.message}</p>
    </div>
  );
}
