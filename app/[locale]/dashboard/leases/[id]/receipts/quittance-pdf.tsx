// PDF version of the rent receipt (quittance de loyer). Loaded via dynamic
// import from the generate action so @react-pdf/renderer never enters a page's
// static module graph. Reuses the pure fmt/fmtDate helpers from the contract
// module so currency / dates render identically across documents.

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
import { fmt, fmtDate } from "../contract/contract-shared";

export type ReceiptData = {
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  ownerIban: string | null;
  ownerBic: string | null;
  tenantName: string | null;
  tenantAddress: string | null;
  propertyAddress: string | null;
  periodStart: string;
  periodEnd: string;
  rentCents: number;
  chargesCents: number;
  totalCents: number;
  // Upcoming term shown as an "avis d'échéance" (payment notice).
  nextPeriodStart: string;
  nextPeriodEnd: string;
  paymentDay: number | null;
  issuedOn: string;
  issuedAt: string | null;
};

const BLANK = "_______________________";
const blank = (v: string | null | undefined) => (v && v.trim() ? v : BLANK);

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

function ReceiptPdfDoc({
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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logo && <Image src={{ data: logo, format: "png" }} style={styles.logo} />}
          <Text style={styles.title}>QUITTANCE DE LOYER</Text>
        </View>
        {data.ownerName && (
          <Text style={styles.contact}>
            Contact propriétaire : {data.ownerName}
          </Text>
        )}
        {contactLine !== "" && <Text style={styles.contact}>{contactLine}</Text>}

        <View style={styles.parties}>
          <View style={styles.partyCol}>
            <Text style={styles.label}>ADRESSE DU BIEN LOUÉ</Text>
            <Text>{blank(data.propertyAddress)}</Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.label}>LOCATAIRE</Text>
            <Text>{blank(data.tenantName)}</Text>
            {data.tenantAddress && <Text>{data.tenantAddress}</Text>}
            {data.propertyAddress && <Text>{data.propertyAddress}</Text>}
          </View>
        </View>

        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cellLabel}>
              Quittance pour la période du {fmtDate(data.periodStart)} au{" "}
              {fmtDate(data.periodEnd)}
            </Text>
            <Text style={styles.cellAmount}>Montant</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Loyer principal</Text>
            <Text style={styles.cellAmount}>{fmt(data.rentCents)}</Text>
          </View>
          {data.chargesCents > 0 && (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Provision sur charges</Text>
              <Text style={styles.cellAmount}>{fmt(data.chargesCents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.cellLabel}>Total de la période</Text>
            <Text style={styles.cellAmount}>{fmt(data.totalCents)}</Text>
          </View>
        </View>

        <Text style={styles.statement}>
          Je soussigné(e) <Text style={styles.bold}>{blank(data.ownerName)}</Text>
          , propriétaire (ou mandataire) du logement désigné ci-dessus, déclare
          avoir reçu de <Text style={styles.bold}>{blank(data.tenantName)}</Text>{" "}
          la somme de <Text style={styles.bold}>{fmt(data.totalCents)}</Text>{" "}
          au titre du paiement du loyer et des charges pour la période du{" "}
          <Text style={styles.bold}>{fmtDate(data.periodStart)}</Text> au{" "}
          <Text style={styles.bold}>{fmtDate(data.periodEnd)}</Text>, et lui en
          donne quittance, sous réserve de tous mes droits.
        </Text>

        <Text style={styles.sectionTitle}>Avis d&apos;échéance</Text>
        <Text style={styles.noticeNote}>
          Pour information — prochaine échéance à venir, ne valant pas quittance.
        </Text>
        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cellLabel}>
              Échéance pour la période du {fmtDate(data.nextPeriodStart)} au{" "}
              {fmtDate(data.nextPeriodEnd)}
            </Text>
            <Text style={styles.cellAmount}>Montant</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Loyer principal</Text>
            <Text style={styles.cellAmount}>{fmt(data.rentCents)}</Text>
          </View>
          {data.chargesCents > 0 && (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Provision sur charges</Text>
              <Text style={styles.cellAmount}>{fmt(data.chargesCents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.cellLabel}>
              Montant net à payer
              {data.paymentDay != null
                ? ` — payable au ${data.paymentDay} du mois`
                : ""}
            </Text>
            <Text style={styles.cellAmount}>{fmt(data.totalCents)}</Text>
          </View>
        </View>

        {(data.ownerName || data.ownerIban || data.ownerBic) && (
          <View style={styles.paymentBox} wrap={false}>
            <Text style={styles.paymentTitle}>
              INFORMATION RELATIVE AU PAIEMENT
            </Text>
            {data.ownerName && <Text>{data.ownerName}</Text>}
            {data.ownerIban && <Text>IBAN : {data.ownerIban}</Text>}
            {data.ownerBic && <Text>BIC : {data.ownerBic}</Text>}
          </View>
        )}

        <View style={styles.signBlock} wrap={false}>
          <Text>
            Fait à <Text style={styles.bold}>{blank(data.issuedAt)}</Text>, le{" "}
            <Text style={styles.bold}>{fmtDate(data.issuedOn)}</Text>
          </Text>
          <Text style={[styles.signLabel, { marginTop: 18 }]}>
            Signature du bailleur
          </Text>
          <View style={styles.signLine} />
        </View>

        <Text style={styles.legal}>
          Cette quittance annule tous les reçus qui auraient pu être établis
          précédemment en cas de paiement échelonné du présent terme. Elle est
          délivrée au locataire qui en fait la demande (art. 21 de la loi n°
          89-462 du 6 juillet 1989).
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
  return await renderToBuffer(<ReceiptPdfDoc data={data} logo={logo} />);
}
