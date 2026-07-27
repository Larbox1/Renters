// PDF rent receipt for US leases — English wording, USD amounts, no French
// legal boilerplate. Mirrors quittance-pdf.tsx (same ReceiptData input, same
// dynamic-import loading) so the generate action can pick either renderer by
// lease type. The ownerIban/ownerBic fields carry the US owner's routing /
// account numbers (same profile columns, relabeled for US operators).

import { readFile } from "fs/promises";
import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReceiptData } from "./quittance-pdf";

const BLANK = "_______________________";
const blank = (v: string | null | undefined) => (v && v.trim() ? v : BLANK);

const fmt = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(cents / 100)
    : BLANK;

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return BLANK;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? BLANK
    : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(d);
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.35,
  },
  header: { position: "relative", minHeight: 32, justifyContent: "center" },
  logo: { position: "absolute", left: 0, top: 0, height: 30 },
  title: { fontSize: 17, fontWeight: 700, textAlign: "center" },
  contact: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 3,
    color: "#334155",
  },
  parties: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  partyCol: { width: "48%" },
  label: { fontSize: 8, fontWeight: 700, color: "#475569", marginBottom: 2 },
  table: { marginTop: 18, borderWidth: 0.5, borderColor: "#94a3b8" },
  thead: { flexDirection: "row", backgroundColor: "#dbeafe", fontWeight: 700 },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderColor: "#cbd5e1" },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderColor: "#94a3b8",
    backgroundColor: "#f1f5f9",
    fontWeight: 700,
  },
  cellLabel: { flex: 1, padding: 5 },
  cellAmount: {
    width: 110,
    padding: 5,
    textAlign: "right",
    borderLeftWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  statement: { marginTop: 18, textAlign: "justify" },
  sectionTitle: {
    marginTop: 18,
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
  },
  noticeNote: { marginTop: 3, fontSize: 8, color: "#64748b" },
  paymentBox: {
    marginTop: 12,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    backgroundColor: "#f8fafc",
  },
  paymentTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 4,
  },
  bold: { fontWeight: 700 },
  signBlock: { marginTop: 22, alignItems: "flex-end" },
  signLabel: { fontSize: 9, fontWeight: 700 },
  signLine: { marginTop: 28, width: 180, height: 0.5, backgroundColor: "#cbd5e1" },
  legal: {
    marginTop: 18,
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#64748b",
    textAlign: "justify",
  },
});

function ReceiptUsPdfDoc({
  data,
  logo,
}: {
  data: ReceiptData;
  logo: Buffer | null;
}) {
  const contactLine = [data.ownerEmail, data.ownerPhone]
    .filter((v) => v && v.trim())
    .join(" — ");

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logo && <Image src={{ data: logo, format: "png" }} style={styles.logo} />}
          <Text style={styles.title}>RENT RECEIPT</Text>
        </View>
        {data.ownerName && (
          <Text style={styles.contact}>Landlord contact: {data.ownerName}</Text>
        )}
        {contactLine !== "" && <Text style={styles.contact}>{contactLine}</Text>}

        <View style={styles.parties}>
          <View style={styles.partyCol}>
            <Text style={styles.label}>RENTAL PROPERTY ADDRESS</Text>
            <Text>{blank(data.propertyAddress)}</Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.label}>TENANT</Text>
            <Text>{blank(data.tenantName)}</Text>
            {data.tenantAddress && <Text>{data.tenantAddress}</Text>}
            {data.propertyAddress && <Text>{data.propertyAddress}</Text>}
          </View>
        </View>

        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cellLabel}>
              Receipt for the period {fmtDate(data.periodStart)} through{" "}
              {fmtDate(data.periodEnd)}
            </Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Base rent</Text>
            <Text style={styles.cellAmount}>{fmt(data.rentCents)}</Text>
          </View>
          {data.chargesCents > 0 && (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Additional charges</Text>
              <Text style={styles.cellAmount}>{fmt(data.chargesCents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.cellLabel}>Total for the period</Text>
            <Text style={styles.cellAmount}>{fmt(data.totalCents)}</Text>
          </View>
        </View>

        <Text style={styles.statement}>
          I, <Text style={styles.bold}>{blank(data.ownerName)}</Text>, landlord
          (or authorized agent) of the property identified above, acknowledge
          receipt from <Text style={styles.bold}>{blank(data.tenantName)}</Text>{" "}
          of the sum of <Text style={styles.bold}>{fmt(data.totalCents)}</Text>{" "}
          in payment of rent and charges for the period from{" "}
          <Text style={styles.bold}>{fmtDate(data.periodStart)}</Text> through{" "}
          <Text style={styles.bold}>{fmtDate(data.periodEnd)}</Text>, with all
          rights reserved.
        </Text>

        <Text style={styles.sectionTitle}>Upcoming payment notice</Text>
        <Text style={styles.noticeNote}>
          For information only — next rent due; this notice is not a receipt.
        </Text>
        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cellLabel}>
              Rent due for the period {fmtDate(data.nextPeriodStart)} through{" "}
              {fmtDate(data.nextPeriodEnd)}
            </Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Base rent</Text>
            <Text style={styles.cellAmount}>{fmt(data.rentCents)}</Text>
          </View>
          {data.chargesCents > 0 && (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Additional charges</Text>
              <Text style={styles.cellAmount}>{fmt(data.chargesCents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.cellLabel}>
              Net amount due
              {data.paymentDay != null
                ? ` — payable on day ${data.paymentDay} of the month`
                : ""}
            </Text>
            <Text style={styles.cellAmount}>{fmt(data.totalCents)}</Text>
          </View>
        </View>

        {(data.ownerName || data.ownerIban || data.ownerBic) && (
          <View style={styles.paymentBox} wrap={false}>
            <Text style={styles.paymentTitle}>PAYMENT INFORMATION</Text>
            {data.ownerName && <Text>{data.ownerName}</Text>}
            {data.ownerIban && <Text>Routing number: {data.ownerIban}</Text>}
            {data.ownerBic && <Text>Account number: {data.ownerBic}</Text>}
          </View>
        )}

        <View style={styles.signBlock} wrap={false}>
          <Text>
            Issued at <Text style={styles.bold}>{blank(data.issuedAt)}</Text>, on{" "}
            <Text style={styles.bold}>{fmtDate(data.issuedOn)}</Text>
          </Text>
          <Text style={[styles.signLabel, { marginTop: 18 }]}>
            Landlord signature
          </Text>
          <View style={styles.signLine} />
        </View>

        <Text style={styles.legal}>
          This receipt supersedes any partial receipts previously issued for the
          same rental period. It is provided to the tenant upon request.
        </Text>
      </Page>
    </Document>
  );
}

async function loadLogo(locale: string): Promise<Buffer | null> {
  const file = locale === "fr" ? "meskasas_logo_fr.png" : "meskasas_logo_en.png";
  try {
    return await readFile(path.join(process.cwd(), "public", file));
  } catch (err) {
    console.error("[receipt.pdf] logo load failed:", err);
    return null;
  }
}

export async function renderReceiptPdf(
  data: ReceiptData,
  locale: string,
): Promise<Buffer> {
  const logo = await loadLogo(locale);
  return await renderToBuffer(<ReceiptUsPdfDoc data={data} logo={logo} />);
}
