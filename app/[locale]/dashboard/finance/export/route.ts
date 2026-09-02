import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentSession } from "@/lib/auth/current-user";
import { currencyFor } from "@/lib/currency";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Quote for CSV and neutralize spreadsheet formula injection (leading = + - @
// in user-entered text becomes an inert string in Excel/Sheets).
function csvCell(raw: string): string {
  const defused = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${defused.replace(/"/g, '""')}"`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const session = await getCurrentSession();
  if (!session || session.role !== "owner") {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const property = url.searchParams.get("property") ?? "";
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return new Response("Bad range", { status: 400 });
  }

  let query = session.supabase
    .from("finance_transactions")
    .select("property_id, kind, category, amount_cents, occurred_on, note")
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: true });
  if (property) query = query.eq("property_id", property);

  const [txRes, propsRes] = await Promise.all([
    query,
    session.supabase.from("properties").select("id, label, address, city, country"),
  ]);
  if (txRes.error) return new Response(txRes.error.message, { status: 500 });

  const props = new Map(
    (propsRes.data ?? []).map((p) => [
      p.id,
      {
        label: p.label ?? `${p.address}, ${p.city}`,
        currency: currencyFor(p.country === "US" ? "US" : "FR"),
      },
    ]),
  );

  const dict = getDictionary(locale);
  const tx = dict.finance.transactions;
  const categoryLabel = (kind: string, category: string | null): string => {
    if (!category) return "";
    const map: Record<string, string> =
      kind === "income" ? tx.incomeCategories : tx.expenseCategories;
    return map[category] ?? category;
  };

  const header = [
    tx.cols.date,
    tx.cols.property,
    tx.kind.income + "/" + tx.kind.expense,
    tx.cols.category,
    tx.cols.amount,
    "Currency",
    tx.fields.note,
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const t of txRes.data ?? []) {
    const p = props.get(t.property_id);
    lines.push(
      [
        csvCell(t.occurred_on),
        csvCell(p?.label ?? ""),
        csvCell(t.kind === "income" ? tx.kind.income : tx.kind.expense),
        csvCell(categoryLabel(t.kind, t.category)),
        // Signed decimal with a dot — parses in any spreadsheet locale.
        ((t.kind === "income" ? 1 : -1) * (t.amount_cents / 100)).toFixed(2),
        csvCell(p?.currency ?? ""),
        csvCell(t.note ?? ""),
      ].join(","),
    );
  }

  // BOM so Excel opens the file as UTF-8.
  const body = "\uFEFF" + lines.join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions_${from}_${to}.csv"`,
    },
  });
}
