// PDF version of the Bail civil (articles 1709 et s. du Code civil) — used by
// the Save action only. Loaded via dynamic import so @react-pdf/renderer never
// enters the page's static module graph. Mirrors contract-civil-document.tsx;
// both share contract-shared.ts to stay in sync.

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
  deriveCivil,
  blank,
  fmt,
  fmtDate,
  CIVIL_1709_NOTICE,
  CIVIL_ART2_TEXT,
  CIVIL_ART3_TEXT,
  CIVIL_ART5_TEXT,
  CIVIL_ART7_TEXT,
  CIVIL_ART9_ITEMS,
  CIVIL_ART10_ITEMS,
  CIVIL_ART11_TEXT,
  CIVIL_ART12_TEXT,
  CIVIL_ART13_TEXT,
  CIVIL_ART14_TEXT,
  CIVIL_ANNEXES_ITEMS,
  CIVIL_SIGN_NOTE,
} from "./contract-shared";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.35 },
  title: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 8.5, fontStyle: "italic", textAlign: "center", marginTop: 4, color: "#475569" },
  section: { marginTop: 14 },
  h2: { fontSize: 10, fontWeight: 700 },
  label: { fontWeight: 700, marginTop: 6 },
  p: { marginTop: 4 },
  justify: { marginTop: 4, textAlign: "justify" },
  italic: { fontStyle: "italic" },
  recital: { fontSize: 8.5, fontStyle: "italic", color: "#334155", marginTop: 6, textAlign: "justify" },
  bold: { fontWeight: 700 },
  signRow: { marginTop: 24, flexDirection: "row", gap: 24 },
  signCol: { flex: 1 },
  signLine: { marginTop: 36, height: 0.5, backgroundColor: "#cbd5e1" },
  small: { fontSize: 7.5, fontStyle: "italic", color: "#64748b", marginTop: 4 },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1, textAlign: "justify" },
});

const euros = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(
        cents / 100,
      )
    : "________";

function ContractCivilPdfDoc({ data }: { data: ContractData }) {
  const d = deriveCivil(data);
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
        <Text style={styles.title}>BAIL CIVIL</Text>
        <Text style={styles.subtitle}>
          Régi par les articles 1709 et suivants du Code civil
        </Text>

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
            <Text style={styles.bold}>Numéro de téléphone : </Text>
            {blank(ownerProfile?.phone ?? null)}
            {"  "}
            <Text style={styles.bold}>Adresse e-mail : </Text>
            _____________________
          </Text>
          <Text style={[styles.p, styles.italic]}>
            Ci-après désigné(e) « le Bailleur »
          </Text>

          <Text style={styles.p}>
            Le cas échéant, représenté par un mandataire : [ ] oui [ ] non
          </Text>
          <Text style={styles.p}>
            Nom et prénom du mandataire : ____________________
          </Text>
          <Text style={styles.p}>
            Dénomination (si personne morale) : ____________________
          </Text>
          <Text style={styles.p}>
            Adresse : ___________________________________________
          </Text>
          <Text style={styles.p}>Activité exercée : ____________________</Text>
          <Text style={styles.p}>
            N° et lieu de délivrance de la carte professionnelle :
            ____________________
          </Text>
          <Text style={styles.p}>
            Le cas échéant, nom et adresse du garant : ____________________
          </Text>

          <Text style={styles.label}>Et :</Text>
          <Text style={styles.label}>Le locataire :</Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>
              Nom, Prénom (ou dénomination sociale) :{" "}
            </Text>
            {d.tenantRep
              ? `${blank(d.tenantDisplayName)} — représentée par ${d.tenantRep}`
              : blank(d.tenantDisplayName)}
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Demeurant : </Text>
            {blank(d.tenantAddress)}
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Numéro de téléphone : </Text>
            {blank((t?.phone as string | null) ?? null)}
            {"  "}
            <Text style={styles.bold}>Adresse e-mail : </Text>
            {blank((t?.email as string | null) ?? null)}
          </Text>
          <Text style={[styles.p, styles.italic]}>
            Ci-après désigné(e) « le Locataire »
          </Text>

          <Text style={styles.p}>Il est convenu ce qui suit :</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 1 – Objet du contrat</Text>
          <Text style={styles.p}>
            Le Bailleur donne à bail au Locataire, qui accepte, le bien désigné
            ci-après.
          </Text>
          <Text style={styles.label}>Désignation du bien loué :</Text>
          <Text style={styles.p}>
            Nature du bien : <Text style={styles.bold}>{blank(d.nature)}</Text>
          </Text>
          <Text style={styles.p}>
            Adresse complète :{" "}
            <Text style={styles.bold}>{blank(d.propertyAddress)}</Text>
          </Text>
          <Text style={styles.p}>
            Surface approximative :{" "}
            <Text style={styles.bold}>
              {blank(p?.surface_sqm as number | null)}
            </Text>{" "}
            m²
          </Text>
          <Text style={styles.p}>
            Autres éléments inclus (cave, parking, jardin, etc.) :{" "}
            <Text style={styles.bold}>{blank(d.extras)}</Text>
          </Text>
          <Text style={styles.recital}>{CIVIL_1709_NOTICE}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 2 – Destination des lieux</Text>
          <Text style={styles.p}>
            Le bien loué est destiné à l&apos;usage exclusif de :
            ____________________________________
          </Text>
          <Text style={styles.justify}>{CIVIL_ART2_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 3 – Durée</Text>
          <Text style={styles.p}>
            Le présent bail est consenti et accepté pour une durée de :{" "}
            <Text style={styles.bold}>{blank(d.duration)}</Text>
          </Text>
          <Text style={styles.p}>
            prenant effet le :{" "}
            <Text style={styles.bold}>
              {fmtDate(l.start_date as string | null)}
            </Text>{" "}
            et se terminant le :{" "}
            <Text style={styles.bold}>
              {fmtDate(l.end_date as string | null)}
            </Text>
          </Text>
          <Text style={styles.justify}>{CIVIL_ART3_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 4 – Loyer</Text>
          <Text style={styles.p}>
            Le loyer mensuel est fixé à la somme de :{" "}
            <Text style={styles.bold}>{fmt(l.monthly_rent_cents as number)}</Text>{" "}
            ({euros(l.monthly_rent_cents as number)} €)
          </Text>
          <Text style={styles.p}>
            payable le :{" "}
            <Text style={styles.bold}>
              {blank(l.payment_day_of_month as number | null)}
            </Text>{" "}
            de chaque mois
          </Text>
          <Text style={styles.p}>
            par : ____________________ (virement / chèque / espèces)
          </Text>
          <Text style={styles.label}>Révision du loyer :</Text>
          <Text style={styles.p}>
            Le loyer sera révisé chaque année à la date anniversaire du contrat,
            selon les modalités suivantes :
          </Text>
          <Text style={styles.p}>
            {l.irl_reference ? "[X]" : "[ ]"} En fonction de l&apos;Indice de
            Référence des Loyers (IRL) publié par l&apos;INSEE
            {l.irl_reference ? ` — référence : ${l.irl_reference as string}` : ""}
          </Text>
          <Text style={styles.p}>
            [ ] Selon les modalités librement convenues entre les parties :
            ____________________
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 5 – Charges</Text>
          <Text style={styles.p}>
            Les charges récupérables sont fixées à :{" "}
            <Text style={styles.bold}>
              {fmt(l.charges_amount_cents as number | null)}
            </Text>{" "}
            ({euros(l.charges_amount_cents as number | null)} €) par mois
          </Text>
          <Text style={styles.p}>
            Elles couvrent les dépenses suivantes (ex. : eau froide, entretien
            des parties communes, ordures ménagères…) :
            ____________________________________
          </Text>
          <Text style={styles.justify}>{CIVIL_ART5_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 6 – Dépôt de garantie</Text>
          <Text style={styles.p}>
            Un dépôt de garantie d&apos;un montant de :{" "}
            <Text style={styles.bold}>{fmt(l.deposit_cents as number)}</Text> (
            {euros(l.deposit_cents as number)} €) est versé par le Locataire à la
            signature du présent bail. Ce dépôt est destiné à garantir
            l&apos;exécution des obligations du Locataire.
          </Text>
          <Text style={styles.p}>
            Il sera restitué au Locataire dans un délai de ________ jours suivant
            la restitution des clés, déduction faite, le cas échéant, des sommes
            dues au Bailleur au titre de loyers impayés, charges, dégradations ou
            remises en état.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 7 – État des lieux</Text>
          <Text style={styles.justify}>{CIVIL_ART7_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 8 – Congé / Résiliation</Text>
          <Text style={styles.label}>Congé donné par le Locataire :</Text>
          <Text style={styles.p}>
            Le Locataire pourra mettre fin au bail à tout moment, moyennant un
            préavis de : ________ mois, notifié par lettre recommandée avec
            accusé de réception, lettre recommandée électronique ou par acte
            d&apos;huissier.
          </Text>
          <Text style={styles.label}>Congé donné par le Bailleur :</Text>
          <Text style={styles.p}>
            Le Bailleur pourra mettre fin au bail à son échéance, moyennant un
            préavis de : ________ mois, notifié par lettre recommandée avec
            accusé de réception, lettre recommandée électronique ou par acte
            d&apos;huissier.
          </Text>
          <Text style={styles.label}>Résiliation pour inexécution :</Text>
          <Text style={styles.p}>
            En cas de manquement grave de l&apos;une ou l&apos;autre des parties
            à ses obligations (notamment en cas de non-paiement du loyer), le
            présent bail pourra être résilié de plein droit, après mise en
            demeure restée sans effet pendant ________ jours.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 9 – Obligations du Bailleur</Text>
          <Text style={styles.p}>Le Bailleur s&apos;engage à :</Text>
          {CIVIL_ART9_ITEMS.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 10 – Obligations du Locataire</Text>
          <Text style={styles.p}>Le Locataire s&apos;engage à :</Text>
          {CIVIL_ART10_ITEMS.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 11 – Travaux</Text>
          <Text style={styles.justify}>{CIVIL_ART11_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 12 – Assurances</Text>
          <Text style={styles.justify}>{CIVIL_ART12_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 13 – Clause résolutoire</Text>
          <Text style={styles.justify}>{CIVIL_ART13_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>
            Article 14 – Attribution de juridiction
          </Text>
          <Text style={styles.justify}>
            {CIVIL_ART14_TEXT} Soit le Tribunal judiciaire de :{" "}
            <Text style={styles.bold}>{blank(d.jurisdictionCity)}</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Article 15 – Clauses particulières</Text>
          <Text style={styles.p}>
            Les parties conviennent des clauses particulières suivantes (à
            compléter ou rayer si néant) :
          </Text>
          <Text style={styles.p}>____________________________________</Text>
          <Text style={styles.p}>____________________________________</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>ANNEXES</Text>
          <Text style={styles.p}>
            Sont annexés au présent bail et en font partie intégrante :
          </Text>
          {CIVIL_ANNEXES_ITEMS.map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>SIGNATURES</Text>
          <Text style={styles.p}>
            Fait à <Text style={styles.bold}>{blank(d.jurisdictionCity)}</Text>,
            le{" "}
            <Text style={styles.bold}>
              {fmtDate(new Date().toISOString())}
            </Text>
          </Text>
          <Text style={styles.small}>{CIVIL_SIGN_NOTE}</Text>

          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.bold}>Le Bailleur</Text>
              <Text style={styles.small}>
                (Signature précédée de la mention « Lu et approuvé »)
              </Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signCol}>
              <Text style={styles.bold}>Le(s) Locataire(s)</Text>
              <Text style={styles.small}>
                (Signature précédée de la mention « Lu et approuvé »)
              </Text>
              <View style={styles.signLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCivilContractPdf(
  data: ContractData,
): Promise<Buffer> {
  return await renderToBuffer(<ContractCivilPdfDoc data={data} />);
}
