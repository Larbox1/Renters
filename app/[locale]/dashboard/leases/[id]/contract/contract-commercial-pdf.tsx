// PDF version of the Bail commercial 3/6/9 (articles L.145-1 et s. du code de
// commerce) — used by the Save action only. Loaded via dynamic import so
// @react-pdf/renderer never enters the page's static module graph. Mirrors
// contract-commercial-document.tsx; both share contract-shared.ts.

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  type ContractData,
  deriveCommercial,
  blank,
  fmt,
  fmtDate,
  COM_INTRO_NOTICE,
  COM_ART1_ACCEPT_TEXT,
  COM_ART1_DEST_TEXT,
  COM_ART2_CONGE_ITEMS,
  COM_ART3_INTRO,
  COM_ART3_ITEMS,
  COM_ART4_ITEMS,
  COM_ART5_TEXT,
  COM_ART6_TEXT,
  COM_ART8_TVA_TEXT,
  COM_ART9_REVISION_TEXT,
  COM_ART11_RESOLUTOIRE_TEXT,
  COM_ART12_ETAT_TEXT,
  COM_ART13_RESTITUTION_TEXT,
  COM_ART14_REGLEMENTATION_TEXT,
  COM_ART15_FRAIS_TEXT,
  COM_SIGN_NOTE,
} from "./contract-shared";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.35 },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 8.5, fontStyle: "italic", textAlign: "center", marginTop: 4, color: "#475569" },
  legal: { fontSize: 7.5, fontStyle: "italic", color: "#475569", marginTop: 6, textAlign: "justify" },
  section: { marginTop: 14 },
  h2: { fontSize: 10, fontWeight: 700 },
  label: { fontWeight: 700, marginTop: 6 },
  p: { marginTop: 4 },
  justify: { marginTop: 4, textAlign: "justify" },
  item: { marginTop: 3, textAlign: "justify" },
  italic: { fontStyle: "italic" },
  bold: { fontWeight: 700 },
  signRow: { marginTop: 24, flexDirection: "row", gap: 24 },
  signCol: { flex: 1 },
  signLine: { marginTop: 36, height: 0.5, backgroundColor: "#cbd5e1" },
  small: { fontSize: 7.5, fontStyle: "italic", color: "#64748b", marginTop: 4 },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1, textAlign: "justify" },
});

function tenantSiege(t: Record<string, unknown> | null): string | null {
  return (
    [
      t?.previous_address as string | null,
      [
        t?.previous_postal_code as string | null,
        t?.previous_city as string | null,
      ]
        .filter(Boolean)
        .join(" "),
    ]
      .filter(Boolean)
      .join(", ") || null
  );
}

function ContractCommercialPdfDoc({ data }: { data: ContractData }) {
  const d = deriveCommercial(data);
  const { p, t, l, ownerProfile } = d;

  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>BAIL COMMERCIAL</Text>
        <Text style={styles.subtitle}>
          Bail commercial de neuf ans — régi par les articles L.145-1 et
          suivants du code de commerce
        </Text>
        <Text style={styles.legal}>{COM_INTRO_NOTICE}</Text>

        <View style={styles.section}>
          <Text style={styles.h2}>ENTRE LES SOUSSIGNÉS</Text>

          <Text style={styles.label}>Le bailleur :</Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>
              Nom, Prénom (ou dénomination sociale) :{" "}
            </Text>
            {blank(d.ownerName)}
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Demeurant : </Text>
            {blank(d.ownerAddress)}
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Téléphone : </Text>
            {blank(ownerProfile?.phone ?? null)}
          </Text>
          <Text style={[styles.p, styles.italic]}>
            Ci-après désigné « le Bailleur », d&apos;une part,
          </Text>

          <Text style={styles.label}>Et le preneur :</Text>
          {d.tenantRep ? (
            <>
              <Text style={styles.p}>
                <Text style={styles.bold}>Dénomination sociale : </Text>
                {blank(d.tenantDisplayName)}
              </Text>
              <Text style={styles.p}>
                Capital social : {fmt(t?.capital_cents as number | null)} —
                Siège social : {blank(tenantSiege(t))}
              </Text>
              <Text style={styles.p}>
                Immatriculée au RCS sous le numéro :{" "}
                {blank(t?.siren as string | null)}
              </Text>
              <Text style={styles.p}>Représentée par {blank(d.tenantRep)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.p}>
                <Text style={styles.bold}>Nom, Prénom : </Text>
                {blank(d.tenantDisplayName)}
              </Text>
              <Text style={styles.p}>Demeurant : {blank(tenantSiege(t))}</Text>
              <Text style={styles.p}>
                Profession : {blank(t?.profession as string | null)} —
                Nationalité : {blank(t?.nationality as string | null)}
              </Text>
            </>
          )}
          <Text style={styles.p}>
            Téléphone : {blank((t?.phone as string | null) ?? null)} — Adresse
            e-mail : {blank((t?.email as string | null) ?? null)}
          </Text>
          <Text style={[styles.p, styles.italic]}>
            Ci-après désigné « le Preneur », d&apos;autre part.
          </Text>

          <Text style={[styles.p, styles.bold]}>
            Il a été convenu ce qui suit :
          </Text>
          <Text style={styles.p}>
            Par les présentes, {blank(d.ownerName)} fait bail et donne à loyer à{" "}
            {blank(d.tenantDisplayName)}, qui accepte, les lieux ci-après
            désignés, dépendant d&apos;un immeuble dont il est propriétaire à{" "}
            <Text style={styles.bold}>{blank(d.city)}</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 1 – Désignation des locaux</Text>
          <Text style={styles.label}>1.1 Adresse</Text>
          <Text style={styles.p}>
            Le Bailleur donne à bail au Preneur, qui accepte, les locaux
            ci-après désignés :{" "}
            <Text style={styles.bold}>{blank(d.propertyAddress)}</Text>
          </Text>
          <Text style={styles.justify}>{COM_ART1_ACCEPT_TEXT}</Text>

          <Text style={styles.label}>1.2 Description des locaux</Text>
          <Text style={styles.p}>
            Description précise des locaux :{" "}
            <Text style={styles.bold}>
              {blank(p?.description as string | null)}
            </Text>
          </Text>
          <Text style={styles.p}>
            Superficie totale :{" "}
            <Text style={styles.bold}>
              {blank(p?.surface_sqm as number | null)}
            </Text>{" "}
            m²
          </Text>
          <Text style={styles.p}>
            Équipements présents dans la location :{" "}
            <Text style={styles.bold}>{blank(d.equipment)}</Text>
          </Text>

          <Text style={styles.label}>
            1.3 Destination des locaux donnés en location
          </Text>
          <Text style={styles.p}>
            Les locaux loués sont destinés à l&apos;usage de :{" "}
            <Text style={styles.bold}>{blank(d.activity)}</Text>, à
            l&apos;exclusion de toute autre utilisation.
          </Text>
          <Text style={styles.justify}>{COM_ART1_DEST_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 2 – Durée</Text>
          <Text style={styles.p}>
            Le présent bail est consenti et accepté pour une durée de{" "}
            <Text style={styles.bold}>neuf (9) ans</Text> entières et
            consécutives qui commencent à courir le{" "}
            <Text style={styles.bold}>
              {fmtDate(l.start_date as string | null)}
            </Text>{" "}
            pour se terminer le{" "}
            <Text style={styles.bold}>
              {fmtDate(l.end_date as string | null)}
            </Text>
            .
          </Text>
          <Text style={styles.p}>Toutefois :</Text>
          {COM_ART2_CONGE_ITEMS.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 3 – Charges et conditions</Text>
          <Text style={styles.p}>{COM_ART3_INTRO}</Text>
          {COM_ART3_ITEMS.map((item, i) => (
            <Text key={i} style={styles.item}>
              {item}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 4 – Assurances</Text>
          {COM_ART4_ITEMS.map((item, i) => (
            <Text key={i} style={styles.item}>
              {item}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 5 – Cession</Text>
          <Text style={styles.justify}>{COM_ART5_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 6 – Sous-location</Text>
          <Text style={styles.justify}>{COM_ART6_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 7 – Loyer</Text>
          <Text style={styles.p}>
            Le présent bail est consenti et accepté moyennant un loyer annuel
            hors taxes de <Text style={styles.bold}>{fmt(d.annualRentCents)}</Text>
            , que le Preneur s&apos;oblige à payer au Bailleur par trimestre
            d&apos;avance (soit {fmt(l.monthly_rent_cents as number)} par mois).
          </Text>
          <Text style={styles.p}>
            Le Preneur réglera au Bailleur, en même temps que le loyer principal,
            la participation aux taxes, charges et prestations afférentes aux
            locaux loués. Toutes sommes dues seront payées par chèque ou
            virement. Tous frais de recouvrement et honoraires de commissaire de
            justice engagés par le Bailleur seront à la charge exclusive du
            Preneur.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 8 – Option TVA</Text>
          <Text style={styles.justify}>{COM_ART8_TVA_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 9 – Révision du loyer</Text>
          <Text style={styles.justify}>{COM_ART9_REVISION_TEXT}</Text>
          {l.irl_reference ? (
            <Text style={styles.p}>
              Indice de référence retenu :{" "}
              <Text style={styles.bold}>{l.irl_reference as string}</Text>
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 10 – Dépôt de garantie</Text>
          <Text style={styles.justify}>
            Le Preneur versera au Bailleur, au moment de la signature du présent
            bail, la somme de{" "}
            <Text style={styles.bold}>{fmt(l.deposit_cents as number)}</Text>{" "}
            correspondant à un trimestre de loyer (soit trois mois) pour garantir
            la bonne exécution des clauses et conditions du présent bail,
            conformément au plafond légal fixé par la loi n° 2026-403 du 26 mai
            2026 (art. L.145-40-5 C. com.). Ce dépôt n&apos;est pas productif
            d&apos;intérêts et sera réajusté à chaque variation du loyer.
            Conformément à l&apos;article L.145-40-6 du code de commerce, le
            Bailleur dispose d&apos;un délai de trois (3) mois à compter de la
            remise des clés pour le restituer.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 11 – Clause résolutoire</Text>
          <Text style={styles.justify}>{COM_ART11_RESOLUTOIRE_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 12 – État des lieux</Text>
          <Text style={styles.justify}>{COM_ART12_ETAT_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 13 – Restitution des locaux</Text>
          <Text style={styles.justify}>{COM_ART13_RESTITUTION_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 14 – Réglementation</Text>
          <Text style={styles.p}>{COM_ART14_REGLEMENTATION_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 15 – Frais et enregistrement</Text>
          <Text style={styles.justify}>{COM_ART15_FRAIS_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 16 – Élection de domicile</Text>
          <Text style={styles.p}>
            Pour l&apos;exécution des présentes, le Preneur fait élection de
            domicile dans les lieux loués. Le Bailleur fait élection de domicile
            à <Text style={styles.bold}>{blank(d.ownerAddress)}</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.p}>
            Fait à <Text style={styles.bold}>{blank(d.city)}</Text>, le{" "}
            <Text style={styles.bold}>
              {fmtDate(new Date().toISOString())}
            </Text>
            , en deux (2) exemplaires originaux.
          </Text>
          <Text style={styles.small}>{COM_SIGN_NOTE}</Text>

          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.bold}>Le Bailleur</Text>
              <Text style={styles.small}>(Mention « Lu et approuvé »)</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCol}>
              <Text style={styles.bold}>Le Preneur</Text>
              <Text style={styles.small}>(Mention « Lu et approuvé »)</Text>
              <View style={styles.signLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCommercialContractPdf(
  data: ContractData,
): Promise<Buffer> {
  return await renderToBuffer(<ContractCommercialPdfDoc data={data} />);
}
