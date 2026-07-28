// PDF snapshot of the US lease agreement. Mirrors contract-us-document.tsx
// (same deriveUs data + clause text) using @react-pdf/renderer primitives.
// Loaded via dynamic import from the save action so react-pdf never enters a
// page's static module graph.

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { type ContractData } from "./contract-shared";
import {
  deriveUs,
  usBlank,
  fmtUsd,
  fmtDateUs,
  US_LEGAL_NOTICE,
  US_ART_OCCUPANCY_TEXT,
  US_ART_OCCUPANCY_COMMERCIAL_TEXT,
  US_ART_MAINTENANCE_ITEMS,
  US_ART_ENTRY_TEXT,
  US_ART_INSURANCE_TEXT,
  US_ART_DEFAULT_TEXT,
  US_ART_LEAD_PAINT_TEXT,
  US_ART_SEVERABILITY_TEXT,
  US_SIGN_NOTE,
} from "./contract-us-shared";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.4,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
  },
  notice: {
    marginTop: 12,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#78350f",
  },
  h2: { marginTop: 14, fontSize: 11, fontWeight: 700 },
  h3: { marginTop: 8, fontWeight: 700 },
  para: { marginTop: 4, textAlign: "justify" },
  italic: { fontStyle: "italic" },
  bold: { fontWeight: 700 },
  listItem: { marginTop: 3, marginLeft: 10 },
  signRow: { marginTop: 24, flexDirection: "row", gap: 40 },
  signCol: { flex: 1 },
  signLine: { marginTop: 36, height: 0.5, backgroundColor: "#94a3b8" },
  signHint: { marginTop: 2, fontSize: 7.5, color: "#64748b" },
});

function ordinalSuffix(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return "st";
  if (rem10 === 2 && rem100 !== 12) return "nd";
  if (rem10 === 3 && rem100 !== 13) return "rd";
  return "th";
}

function ContractUsPdfDoc({ data }: { data: ContractData }) {
  const d = deriveUs(data);
  const { p, t, ownerProfile } = d;
  const paymentDay = d.paymentDay != null ? d.paymentDay : 1;
  const noticeDays = d.noticePeriodDays != null ? d.noticePeriodDays : 30;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{d.title}</Text>
        <Text style={styles.notice}>{US_LEGAL_NOTICE}</Text>

        <Text style={styles.h2}>PARTIES</Text>
        <Text style={styles.h3}>{d.landlordLabel}:</Text>
        <Text style={styles.para}>
          Name: <Text style={styles.bold}>{usBlank(d.ownerName)}</Text>
          {"\n"}Address: {usBlank(d.ownerAddress)}
          {"\n"}Phone: {usBlank(ownerProfile?.phone ?? null)}
        </Text>
        <Text style={styles.h3}>{d.tenantLabel}:</Text>
        <Text style={styles.para}>
          Name: <Text style={styles.bold}>{usBlank(d.tenantName)}</Text>
          {"\n"}Phone: {usBlank((t?.phone as string | null) ?? null)} — Email:{" "}
          {usBlank((t?.email as string | null) ?? null)}
        </Text>

        <Text style={styles.h2}>1. Premises</Text>
        <Text style={styles.para}>
          {d.landlordLabel} leases to {d.tenantLabel}, and {d.tenantLabel}{" "}
          leases from {d.landlordLabel}, the premises located at:{" "}
          <Text style={styles.bold}>{usBlank(d.propertyAddress)}</Text> (the
          &quot;Premises&quot;). Type of property:{" "}
          <Text style={styles.bold}>{usBlank(d.nature)}</Text>
          {p?.surface_sqm != null
            ? ` — approximate area: ${String(p.surface_sqm)} sq ft`
            : ""}
        </Text>

        <Text style={styles.h2}>2. Term</Text>
        <Text style={styles.para}>
          {d.isMonthToMonth
            ? `This Agreement begins on ${fmtDateUs(d.startDate)} and continues on a month-to-month basis until terminated by either party with at least ${noticeDays} days' prior written notice, or any longer notice period required by applicable state law.`
            : `This Agreement is for a fixed term beginning on ${fmtDateUs(d.startDate)} and ending on ${fmtDateUs(d.endDate)}. If Tenant remains in possession after the end of the term with Landlord's consent, the tenancy converts to month-to-month on the same terms, terminable by either party with ${noticeDays} days' written notice.`}
        </Text>

        <Text style={styles.h2}>3. Rent</Text>
        <Text style={styles.para}>
          Tenant shall pay rent of{" "}
          <Text style={styles.bold}>{fmtUsd(d.monthlyRentCents)}</Text> per
          month, payable in advance on the {paymentDay}
          {ordinalSuffix(paymentDay)} day of each month.
          {d.lateFeeCents != null
            ? ` If rent is not received within ${
                d.lateFeeGraceDays != null ? d.lateFeeGraceDays : 5
              } days of the due date, Tenant shall pay a late fee of ${fmtUsd(
                d.lateFeeCents,
              )}, to the extent permitted by applicable state law.`
            : ""}
        </Text>

        <Text style={styles.h2}>4. Security deposit</Text>
        <Text style={styles.para}>
          Upon execution of this Agreement, Tenant shall deposit with Landlord
          the sum of <Text style={styles.bold}>{fmtUsd(d.depositCents)}</Text>{" "}
          as a security deposit, to be held and returned in accordance with
          applicable state law after deduction of any lawful charges.
          {d.petsAllowed && d.petDepositCents != null
            ? ` In addition, Tenant shall deposit ${fmtUsd(
                d.petDepositCents,
              )} as a pet deposit, subject to the same conditions.`
            : ""}
        </Text>

        <Text style={styles.h2}>5. Utilities</Text>
        <Text style={styles.para}>
          The following utilities and services are included in the rent:{" "}
          <Text style={styles.bold}>
            {d.utilitiesIncluded ? d.utilitiesIncluded : "none"}
          </Text>
          . Tenant is responsible for arranging and paying for all other
          utilities and services supplied to the Premises.
        </Text>

        <Text style={styles.h2}>6. Occupancy and use</Text>
        <Text style={styles.para}>
          {d.isCommercial
            ? US_ART_OCCUPANCY_COMMERCIAL_TEXT
            : US_ART_OCCUPANCY_TEXT}
        </Text>

        <Text style={styles.h2}>7. Pets</Text>
        <Text style={styles.para}>
          {d.petsAllowed
            ? "Pets are permitted on the Premises with Landlord's prior written approval of each animal."
            : "No pets are permitted on the Premises without the prior written consent of the Landlord."}
        </Text>

        <Text style={styles.h2}>8. Maintenance and repairs</Text>
        {US_ART_MAINTENANCE_ITEMS.map((item, i) => (
          <Text key={i} style={styles.listItem}>
            • {item}
          </Text>
        ))}

        <Text style={styles.h2}>9. Landlord&apos;s right of entry</Text>
        <Text style={styles.para}>{US_ART_ENTRY_TEXT}</Text>

        <Text style={styles.h2}>10. Insurance</Text>
        <Text style={styles.para}>{US_ART_INSURANCE_TEXT}</Text>

        <Text style={styles.h2}>11. Default</Text>
        <Text style={styles.para}>{US_ART_DEFAULT_TEXT}</Text>

        {d.requiresLeadDisclosure && (
          <>
            <Text style={styles.h2}>12. Lead-based paint disclosure</Text>
            <Text style={styles.para}>{US_ART_LEAD_PAINT_TEXT}</Text>
          </>
        )}

        <Text style={styles.h2}>
          {d.requiresLeadDisclosure ? "13" : "12"}. Governing law;
          severability; entire agreement
        </Text>
        <Text style={styles.para}>
          This Agreement is governed by the laws of the State of{" "}
          <Text style={styles.bold}>{usBlank(d.usState)}</Text>.{" "}
          {US_ART_SEVERABILITY_TEXT}
        </Text>

        <Text style={[styles.para, styles.italic, { marginTop: 16 }]}>
          {US_SIGN_NOTE}
        </Text>
        <View style={styles.signRow} wrap={false}>
          <View style={styles.signCol}>
            <Text style={styles.bold}>{d.landlordLabel}</Text>
            <Text style={styles.signHint}>Date and signature</Text>
            <View style={styles.signLine} />
          </View>
          <View style={styles.signCol}>
            <Text style={styles.bold}>{d.tenantLabel}</Text>
            <Text style={styles.signHint}>Date and signature</Text>
            <View style={styles.signLine} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderUsContractPdf(data: ContractData): Promise<Buffer> {
  return await renderToBuffer(<ContractUsPdfDoc data={data} />);
}
