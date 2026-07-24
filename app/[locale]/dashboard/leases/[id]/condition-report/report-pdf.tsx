// PDF version of the condition report (état des lieux). Loaded via dynamic
// import from the finalize action so @react-pdf/renderer never enters a page's
// static module graph. Like the quittance, the document itself is in French —
// it is a French legal document (art. 3-2, loi n° 89-462 du 6 juillet 1989) —
// while room/element names come from the stored report data.

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
import { fmtDate } from "../contract/contract-shared";
import type { Condition, ReportData, ReportType } from "./report-shared";

type PropertyRow = {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
} | null;

type TenantRow = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
} | null;

type OwnerContact = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
} | null;

export type PhotoAnnexEntry = {
  room: string;
  element: string;
  images: Buffer[];
};

export type ConditionReportPdfInput = {
  type: ReportType;
  data: ReportData;
  property: PropertyRow;
  tenant: TenantRow;
  ownerProfile: OwnerContact;
  photoAnnex?: PhotoAnnexEntry[];
};

const CONDITION_FR: Record<Condition, string> = {
  new: "Neuf",
  good: "Bon état",
  used: "État d'usage",
  poor: "Mauvais état",
};

const conditionLabel = (c: Condition | null | undefined) =>
  c ? CONDITION_FR[c] : "—";

const BLANK = "_______________________";
const blank = (v: string | null | undefined) => (v && v.trim() ? v : BLANK);

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.35,
  },
  header: { position: "relative", minHeight: 32, justifyContent: "center" },
  logo: { position: "absolute", left: 0, top: 0, height: 30 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center" },
  subtitle: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 3,
    color: "#334155",
  },
  parties: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  partyCol: { width: "48%" },
  label: { fontSize: 8, fontWeight: 700, color: "#475569", marginBottom: 2 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
  },
  roomTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 10,
    fontWeight: 700,
  },
  table: { borderWidth: 0.5, borderColor: "#94a3b8" },
  thead: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    fontWeight: 700,
    fontSize: 8.5,
  },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderColor: "#cbd5e1" },
  cell: { padding: 4, flex: 1 },
  cellBorder: { borderLeftWidth: 0.5, borderColor: "#cbd5e1" },
  cellElement: { padding: 4, width: "26%" },
  cellCondition: { padding: 4, width: "18%" },
  muted: { color: "#64748b" },
  notes: { marginTop: 4, textAlign: "justify" },
  legal: {
    marginTop: 16,
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#64748b",
    textAlign: "justify",
  },
  signRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signCol: { width: "45%" },
  signLabel: { fontSize: 9, fontWeight: 700 },
  signHint: { fontSize: 7.5, color: "#64748b", marginTop: 2 },
  signLine: {
    marginTop: 34,
    width: "100%",
    height: 0.5,
    backgroundColor: "#cbd5e1",
  },
  annexTitle: { fontSize: 14, fontWeight: 700, textAlign: "center" },
  annexNote: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 3,
    color: "#64748b",
  },
  photoCaption: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 9.5,
    fontWeight: 700,
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap" },
  photoImg: {
    width: 158,
    maxHeight: 210,
    objectFit: "cover",
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
});

function joinAddress(
  address?: string | null,
  postalCode?: string | null,
  city?: string | null,
  country?: string | null,
) {
  return (
    [address, [postalCode, city].filter(Boolean).join(" "), country]
      .filter((part) => part && part.trim())
      .join(", ") || null
  );
}

function ConditionReportPdfDoc({
  input,
  logo,
}: {
  input: ConditionReportPdfInput;
  logo: Buffer | null;
}) {
  const { type, data, property, tenant, ownerProfile } = input;
  const photoAnnex = input.photoAnnex ?? [];
  const isMoveOut = type === "move_out";

  const ownerName =
    ownerProfile?.first_name && ownerProfile?.last_name
      ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
      : (ownerProfile?.full_name ?? null);
  const ownerAddress = joinAddress(
    ownerProfile?.address,
    ownerProfile?.postal_code,
    ownerProfile?.city,
    ownerProfile?.country,
  );
  const propertyAddress = joinAddress(
    property?.address,
    property?.postal_code,
    property?.city,
  );

  const meterRows: Array<{ label: string; value: string }> = [
    { label: "Électricité", value: data.meters.electricity },
    { label: "Gaz", value: data.meters.gas },
    { label: "Eau froide", value: data.meters.cold_water },
    { label: "Eau chaude", value: data.meters.hot_water },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logo && (
            <Image src={{ data: logo, format: "png" }} style={styles.logo} />
          )}
          <Text style={styles.title}>
            {isMoveOut
              ? "ÉTAT DES LIEUX DE SORTIE"
              : "ÉTAT DES LIEUX D'ENTRÉE"}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Établi contradictoirement le {fmtDate(data.report_date)}
          {propertyAddress ? ` — ${propertyAddress}` : ""}
        </Text>

        <View style={styles.parties}>
          <View style={styles.partyCol}>
            <Text style={styles.label}>BAILLEUR</Text>
            <Text>{blank(ownerName)}</Text>
            {ownerAddress && <Text>{ownerAddress}</Text>}
            {ownerProfile?.phone && <Text>{ownerProfile.phone}</Text>}
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.label}>LOCATAIRE</Text>
            <Text>{blank(tenant?.full_name)}</Text>
            {tenant?.email && <Text>{tenant.email}</Text>}
            {tenant?.phone && <Text>{tenant.phone}</Text>}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Relevés de compteurs</Text>
        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cell}>Compteur</Text>
            <Text style={[styles.cell, styles.cellBorder]}>Relevé</Text>
          </View>
          {meterRows.map((m) => (
            <View key={m.label} style={styles.row}>
              <Text style={styles.cell}>{m.label}</Text>
              <Text style={[styles.cell, styles.cellBorder]}>
                {m.value || "—"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Clés remises</Text>
        <View style={styles.table} wrap={false}>
          <View style={styles.thead}>
            <Text style={styles.cell}>Type</Text>
            <Text style={[styles.cell, styles.cellBorder]}>Nombre</Text>
            <Text style={[styles.cell, styles.cellBorder]}>Commentaire</Text>
          </View>
          {data.keys.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.muted]}>—</Text>
              <Text style={[styles.cell, styles.cellBorder, styles.muted]}>
                —
              </Text>
              <Text style={[styles.cell, styles.cellBorder, styles.muted]}>
                —
              </Text>
            </View>
          ) : (
            data.keys.map((k, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.cell}>{k.type || "—"}</Text>
                <Text style={[styles.cell, styles.cellBorder]}>{k.count}</Text>
                <Text style={[styles.cell, styles.cellBorder]}>
                  {k.comment || "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>État détaillé par pièce</Text>
        {data.rooms.map((room, roomIndex) => (
          <View key={roomIndex} wrap={false}>
            <Text style={styles.roomTitle}>{room.name || "—"}</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={styles.cellElement}>Élément</Text>
                {isMoveOut && (
                  <Text style={[styles.cellCondition, styles.cellBorder]}>
                    État à l&apos;entrée
                  </Text>
                )}
                <Text style={[styles.cellCondition, styles.cellBorder]}>
                  {isMoveOut ? "État à la sortie" : "État"}
                </Text>
                <Text style={[styles.cell, styles.cellBorder]}>
                  Observations
                </Text>
              </View>
              {room.elements.map((element, elementIndex) => (
                <View key={elementIndex} style={styles.row}>
                  <Text style={styles.cellElement}>{element.name || "—"}</Text>
                  {isMoveOut && (
                    <View style={[styles.cellCondition, styles.cellBorder]}>
                      <Text>{conditionLabel(element.entry_condition)}</Text>
                      {element.entry_comment ? (
                        <Text style={[styles.muted, { fontSize: 7.5 }]}>
                          {element.entry_comment}
                        </Text>
                      ) : null}
                    </View>
                  )}
                  <Text style={[styles.cellCondition, styles.cellBorder]}>
                    {conditionLabel(element.condition)}
                  </Text>
                  <Text style={[styles.cell, styles.cellBorder]}>
                    {element.comment || "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {data.notes ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Observations générales</Text>
            <Text style={styles.notes}>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.legal}>
          État des lieux établi contradictoirement et amiablement entre les
          parties conformément à l&apos;article 3-2 de la loi n° 89-462 du 6
          juillet 1989 et au décret n° 2016-382 du 30 mars 2016. Chaque partie
          en conserve un exemplaire.
          {isMoveOut
            ? " Le dépôt de garantie est restitué dans les conditions de l'article 22 de la même loi, déduction faite le cas échéant des sommes justifiées par la comparaison avec l'état des lieux d'entrée."
            : " Le locataire peut demander la modification de l'état des lieux dans les dix jours suivant son établissement (premier mois de chauffe pour les éléments de chauffage)."}
        </Text>

        <View style={styles.signRow} wrap={false}>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Le bailleur</Text>
            <Text style={styles.signHint}>
              Signature précédée de la mention « lu et approuvé »
            </Text>
            <View style={styles.signLine} />
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>Le locataire</Text>
            <Text style={styles.signHint}>
              Signature précédée de la mention « lu et approuvé »
            </Text>
            <View style={styles.signLine} />
          </View>
        </View>
      </Page>

      {photoAnnex.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.annexTitle}>ANNEXE — PHOTOGRAPHIES</Text>
          <Text style={styles.annexNote}>
            Photographies prises lors de l&apos;établissement de l&apos;état des
            lieux du {fmtDate(data.report_date)}, faisant partie intégrante du
            présent document.
          </Text>
          {photoAnnex.map((entry, entryIndex) => (
            <View key={entryIndex}>
              <Text style={styles.photoCaption}>
                {entry.room || "—"} — {entry.element || "—"}
              </Text>
              <View style={styles.photoRow}>
                {entry.images.map((image, imageIndex) => (
                  <Image
                    key={imageIndex}
                    src={{ data: image, format: "jpg" }}
                    style={styles.photoImg}
                  />
                ))}
              </View>
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}

async function loadLogo(locale: string): Promise<Buffer | null> {
  const file = locale === "fr" ? "meskasas_logo_fr.png" : "meskasas_logo_en.png";
  try {
    return await readFile(path.join(process.cwd(), "public", file));
  } catch (err) {
    console.error("[condition-report.pdf] logo load failed:", err);
    return null;
  }
}

export async function renderConditionReportPdf(
  input: ConditionReportPdfInput,
  locale: string,
): Promise<Buffer> {
  const logo = await loadLogo(locale);
  return await renderToBuffer(
    <ConditionReportPdfDoc input={input} logo={logo} />,
  );
}
