// PDF version of the Bail vide / Bail meublé contract — a faithful
// reproduction of the loi Alur bail type (décret du 29 mai 2015). Used by
// the Save action only. Loaded via dynamic import so @react-pdf/renderer
// never enters the page's static module graph. Mirrors contract-document.tsx;
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
  deriveContract,
  blank,
  fmt,
  fmtDate,
  isCharges,
  PREAMBLE,
  DPE_RAPPEL,
  tacitRenewalText,
  SOLIDARITE_TEXT,
  RESOLUTOIRE_TEXT,
  HONORAIRES_INTRO,
  ANNEXES,
} from "./contract-shared";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.35 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 8, fontStyle: "italic", textAlign: "center", marginTop: 4, color: "#475569" },
  topLine: { fontSize: 9, fontWeight: 700, textAlign: "center", marginTop: 4 },
  legal: { fontSize: 7.5, fontStyle: "italic", color: "#475569", marginTop: 6, textAlign: "justify" },
  recital: { fontSize: 8.5, color: "#334155", marginTop: 6, textAlign: "justify" },
  section: { marginTop: 14 },
  h2: { fontSize: 10, fontWeight: 700 },
  h3: { fontSize: 9.5, fontWeight: 700, marginTop: 8 },
  p: { marginTop: 4 },
  justify: { marginTop: 4, textAlign: "justify" },
  italic: { fontStyle: "italic" },
  bold: { fontWeight: 700 },
  boxed: { marginTop: 4, padding: 6, borderWidth: 0.5, borderColor: "#cbd5e1", backgroundColor: "#f8fafc" },
  signRow: { marginTop: 24, flexDirection: "row", gap: 24 },
  signCol: { flex: 1 },
  signLine: { marginTop: 36, height: 0.5, backgroundColor: "#cbd5e1" },
  small: { fontSize: 7.5, fontStyle: "italic", color: "#64748b", marginTop: 4 },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1, textAlign: "justify" },
});

const cb = (checked: boolean) => (checked ? "[X]" : "[ ]");

function ContractPdfDoc({ data }: { data: ContractData }) {
  const d = deriveContract(data);
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
        <Text style={styles.title}>Contrat de location</Text>
        <Text style={styles.subtitle}>
          (Soumis au titre Ier bis de la loi du 6 juillet 1989 et portant
          modification de la loi n° 86-1290 du 23 décembre 1986 — bail type
          conforme aux dispositions de la loi Alur de 2014, mis en application
          par le décret du 29 mai 2015)
        </Text>
        <Text style={styles.topLine}>
          {d.isMeuble
            ? "LOCAUX MEUBLÉS À USAGE D'HABITATION"
            : "LOCAUX VIDES À USAGE D'HABITATION"}
        </Text>
        <Text style={styles.legal}>{PREAMBLE}</Text>

        <View style={styles.section}>
          <Text style={styles.h2}>I. Désignation des parties</Text>
          <Text style={styles.p}>
            Le présent contrat est conclu entre les soussignés :
          </Text>
          <Text style={styles.p}>
            Qualité du bailleur : [X] Personne physique [ ] Personne morale
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Nom et prénom du bailleur : </Text>
            {blank(d.ownerName)}
          </Text>
          <Text style={styles.p}>
            Dénomination (si personne morale) : _______________________
          </Text>
          <Text style={styles.p}>
            Société civile constituée exclusivement entre parents et alliés
            jusqu&apos;au quatrième degré inclus : [ ] oui [ ] non
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Adresse : </Text>
            {blank(d.ownerAddress)}
          </Text>
          {ownerProfile?.phone && (
            <Text style={styles.p}>
              <Text style={styles.bold}>Téléphone : </Text>
              {ownerProfile.phone}
            </Text>
          )}
          <Text style={styles.p}>
            Adresse email (facultatif) : _____________________
          </Text>
          <Text style={[styles.p, styles.italic]}>
            désigné(s) ci-après « le bailleur » ;
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

          <Text style={[styles.p, styles.bold]}>
            Nom et prénom du ou des locataires, adresse email (facultatif) :
          </Text>
          <Text style={styles.p}>
            {d.tenantIsSociete
              ? `Société ${blank(t?.full_name as string | null)} — SIREN ${blank(t?.siren as string | null)} — représentée par ${blank(d.tenantSigningName)}`
              : blank(d.tenantSigningName)}
            {t?.email ? ` — ${t.email as string}` : ""}
          </Text>
          <Text style={[styles.p, styles.italic]}>
            désigné(s) ci-après « le locataire » ;
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>II. Objet du contrat</Text>
          <Text style={styles.p}>
            Le présent contrat a pour objet la location d&apos;un logement ainsi
            déterminé :
          </Text>

          <Text style={styles.h3}>A. Consistance du logement</Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Adresse du logement : </Text>
            {blank(d.propertyAddress)}
          </Text>
          <Text style={styles.p}>
            Identifiant fiscal du logement : ____________________
          </Text>
          <Text style={styles.p}>
            Type d&apos;habitat, Immeuble : {cb(p?.housing_kind === "collective")}{" "}
            collectif {cb(p?.housing_kind === "individual")} individuel /{" "}
            {cb(p?.ownership_kind === "single_ownership")} mono propriété{" "}
            {cb(p?.ownership_kind === "co_ownership")} copropriété
          </Text>
          <Text style={styles.p}>
            Période de construction : {cb(d.period === "before_1949")} avant 1949{" "}
            {cb(d.period === "1949_1974")} de 1949 à 1974{" "}
            {cb(d.period === "1975_1989")} de 1975 à 1989{" "}
            {cb(d.period === "1989_2005")} de 1989 à 2005{" "}
            {cb(d.period === "since_2005")} depuis 2005
          </Text>
          <Text style={styles.p}>
            - surface habitable :{" "}
            <Text style={styles.bold}>
              {blank(p?.surface_sqm as number | null)}
            </Text>{" "}
            m² - nombre de pièces principales :{" "}
            <Text style={styles.bold}>{blank(p?.rooms as number | null)}</Text>
          </Text>
          <Text style={styles.p}>
            - autres parties du logement : [ ] grenier [ ] comble{" "}
            {cb(!!p?.terrace)} terrasse {cb(!!p?.balcony)} balcon [ ] loggia{" "}
            {cb(!!p?.garden)} jardin
          </Text>
          <Text style={styles.p}>
            Éléments d&apos;équipements du logement (cuisine équipée,
            installations sanitaires, etc.) :
            ____________________________________
          </Text>
          <Text style={styles.p}>
            Modalité de production de chauffage :{" "}
            {cb(p?.heating_mode === "individual")} individuel{" "}
            {cb(p?.heating_mode === "collective")} collectif
          </Text>
          <Text style={styles.p}>
            Modalité de production d&apos;eau chaude sanitaire :{" "}
            {cb(p?.hot_water_mode === "individual")} individuel{" "}
            {cb(p?.hot_water_mode === "collective")} collectif
          </Text>

          <Text style={styles.h3}>B. Destination des locaux</Text>
          <Text style={styles.p}>
            [X] usage d&apos;habitation [ ] usage mixte professionnel et
            d&apos;habitation
          </Text>

          <Text style={styles.h3}>
            C. Désignation des locaux et équipements à usage privatif du
            locataire
          </Text>
          <Text style={styles.p}>
            {cb(!!p?.basement)} cave {cb(!!p?.parking)} parking [ ] garage [ ]
            Autres
          </Text>

          <Text style={styles.h3}>
            D. Énumération des locaux, parties et équipements à usage commun
          </Text>
          <Text style={styles.p}>
            {cb(!!p?.bike_storage)} garage à vélo {cb(!!p?.elevator)} ascenseur{" "}
            {cb(!!p?.green_space)} espaces verts {cb(!!p?.playground)} aires et
            équipements de jeux {cb(!!p?.laundry_room)} laverie [ ] local
            poubelle {cb(!!p?.caretaker)} gardiennage
          </Text>

          <Text style={styles.h3}>
            E. Équipement d&apos;accès aux technologies de l&apos;information et
            de la communication
          </Text>
          <Text style={styles.p}>
            Fibre optique : {cb(!!p?.fiber_optic)} — Câble : {cb(!!p?.cable_tv)}
          </Text>

          <Text style={styles.legal}>{DPE_RAPPEL}</Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>
              Niveau de performance du logement (classe DPE) :{" "}
            </Text>
            {blank(d.dpeClass)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>
            III. Date de prise d&apos;effet et durée du contrat
          </Text>
          <Text style={styles.p}>
            A. Date de prise d&apos;effet du contrat :{" "}
            <Text style={styles.bold}>
              {fmtDate(l.start_date as string | null)}
            </Text>
          </Text>
          <Text style={styles.p}>
            B. Durée du contrat :{" "}
            {d.isMeuble
              ? `${cb(l.duration === "1_year")} 1 an ${cb(l.duration === "9_months_student")} 9 mois (étudiant, sans reconduction tacite)`
              : `${cb(l.duration === "3_years")} 3 ans ${cb(l.duration === "6_years")} 6 ans (minimum 6 ans si le bailleur est une personne morale)`}
          </Text>
          {l.duration === "reduced" && (
            <>
              <Text style={styles.p}>
                [X] Durée réduite :{" "}
                <Text style={styles.bold}>
                  {blank(l.reduced_duration_months as number | null)} mois
                </Text>
              </Text>
              <Text style={styles.p}>
                Événement et raison justifiant la durée réduite :{" "}
                {blank(l.reduced_duration_reason as string | null)}
              </Text>
            </>
          )}
          <Text style={styles.recital}>{tacitRenewalText(d.isMeuble)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>IV. Conditions financières</Text>

          <Text style={styles.h3}>A. Loyer</Text>
          <Text style={styles.p}>
            1° Fixation du loyer initial — a) Montant du loyer mensuel :{" "}
            <Text style={styles.bold}>{fmt(l.monthly_rent_cents as number)}</Text>
          </Text>
          <Text style={styles.p}>
            b) Le loyer est-il soumis au loyer de référence majoré fixé par
            arrêté préfectoral (zone tendue) ? {cb(!!l.is_zone_tendue)} Oui{" "}
            {cb(!l.is_zone_tendue)} Non
          </Text>
          {!!l.is_zone_tendue && (
            <View style={styles.boxed}>
              <Text>
                Loyer de référence :{" "}
                {fmt(l.reference_rent_cents_per_sqm as number | null)} /m² —
                Loyer de référence majoré :{" "}
                {fmt(l.reference_rent_capped_cents_per_sqm as number | null)}{" "}
                /m²
              </Text>
              {l.rent_supplement_cents != null && (
                <Text>
                  Complément de loyer :{" "}
                  {fmt(l.rent_supplement_cents as number | null)}
                </Text>
              )}
            </View>
          )}
          <Text style={styles.p}>
            c) Le cas échéant, informations relatives au loyer du dernier
            locataire : ____________________________________
          </Text>
          <Text style={styles.p}>
            2° Modalités de révision — a) Date de révision :{" "}
            {fmtDate(l.revision_date as string | null)} ; b) Date ou trimestre
            de référence de l&apos;IRL :{" "}
            <Text style={styles.bold}>
              {blank(l.irl_reference as string | null)}
            </Text>
          </Text>

          <Text style={styles.h3}>B. Charges récupérables</Text>
          <Text style={styles.p}>
            1. Modalité de règlement :{" "}
            {cb(isCharges(l.charges_method as string | null, "provisions"))}{" "}
            Provisions avec régularisation annuelle{" "}
            {cb(isCharges(l.charges_method as string | null, "periodic"))}{" "}
            Paiement périodique sans provision{" "}
            {cb(isCharges(l.charges_method as string | null, "flat_rate"))}{" "}
            Forfait de charges
          </Text>
          <Text style={styles.p}>
            2. Montant des provisions ou du forfait :{" "}
            <Text style={styles.bold}>
              {fmt(l.charges_amount_cents as number | null)}
            </Text>
          </Text>
          <Text style={styles.p}>
            3. Le cas échéant, modalités de révision du forfait de charges :
            ____________________________________
          </Text>

          <Text style={styles.h3}>
            C. En cas de colocation, assurance souscrite par le bailleur pour le
            compte des colocataires
          </Text>
          <Text style={styles.p}>[ ] Oui [ ] Non</Text>
          <Text style={styles.p}>
            Montant total annuel récupérable : ____________________ — Montant
            récupérable par douzième : ____________________
          </Text>

          <Text style={styles.h3}>D. Modalités de paiement</Text>
          <Text style={styles.p}>
            Périodicité du paiement : mensuel — Paiement :{" "}
            {cb(l.payment_timing === "in_advance")} à échoir{" "}
            {cb(l.payment_timing === "arrears")} à terme échu
          </Text>
          <Text style={styles.p}>
            Date ou période de paiement : le{" "}
            <Text style={styles.bold}>
              {blank(l.payment_day_of_month as number | null)}
            </Text>{" "}
            du mois — Lieu de paiement : __________________________
          </Text>
          <Text style={styles.p}>
            Montant total dû à la première échéance : Loyer (hors charges){" "}
            {fmt(l.monthly_rent_cents as number)} ; Charges récupérables{" "}
            {fmt(l.charges_amount_cents as number | null)} ; Contribution pour
            le partage des économies de charges : ____________________
          </Text>

          <Text style={styles.h3}>
            E. Le cas échéant, réévaluation d&apos;un loyer manifestement
            sous-évalué (renouvellement)
          </Text>
          <Text style={styles.p}>
            Montant de la hausse ou de la baisse mensuelle : ____________________
            — Modalité d&apos;application annuelle : ____________________
          </Text>

          <Text style={styles.h3}>
            F. Dépenses énergétiques (pour information)
          </Text>
          <Text style={styles.p}>
            Montant estimé des dépenses annuelles d&apos;énergie pour un usage
            standard : <Text style={styles.bold}>{d.energyEstimate}</Text> —
            année de référence des prix énergétiques :{" "}
            <Text style={styles.bold}>{blank(d.energyYear)}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>V. Travaux</Text>
          <Text style={styles.p}>
            A. Montant et nature des travaux d&apos;amélioration ou de mise en
            conformité depuis le dernier contrat ou renouvellement :
            ____________________________________
          </Text>
          <Text style={styles.p}>
            B. Majoration du loyer consécutive à des travaux d&apos;amélioration
            du bailleur : ____________________________________
          </Text>
          <Text style={styles.p}>
            C. Diminution du loyer consécutive à des travaux du locataire :
            ____________________________________
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VI. Garanties</Text>
          <Text style={styles.p}>
            Montant du dépôt de garantie (
            {d.isMeuble
              ? "≤ 2 mois de loyer hors charges"
              : "≤ 1 mois de loyer hors charges"}
            ) :{" "}
            <Text style={styles.bold}>{fmt(l.deposit_cents as number)}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VII. Clause de solidarité</Text>
          <Text style={styles.justify}>{SOLIDARITE_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VIII. Clause résolutoire</Text>
          <Text style={styles.justify}>{RESOLUTOIRE_TEXT}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>IX. Honoraires de location</Text>
          <Text style={styles.recital}>{HONORAIRES_INTRO}</Text>
          <Text style={[styles.p, styles.bold]}>
            B. Détail et répartition des honoraires
          </Text>
          <Text style={styles.p}>
            1. À la charge du bailleur — visite, dossier et rédaction du bail :
            ____________________ ; état des lieux d&apos;entrée :
            ____________________
          </Text>
          <Text style={styles.p}>
            2. À la charge du locataire — visite, dossier et rédaction du bail :{" "}
            <Text style={styles.bold}>
              {fmt(l.tenant_fees_cents as number | null)}
            </Text>{" "}
            ; état des lieux d&apos;entrée :{" "}
            <Text style={styles.bold}>
              {fmt(l.tenant_inventory_fees_cents as number | null)}
            </Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>X. Autres conditions particulières</Text>
          <Text style={styles.p}>____________________________________</Text>
          <Text style={styles.p}>____________________________________</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>XI. Annexes</Text>
          <Text style={styles.p}>
            Sont annexées et jointes au contrat de location les pièces
            suivantes :
          </Text>
          {ANNEXES(d.isMeuble).map((item, i) => (
            <Bullet key={i}>{item}</Bullet>
          ))}
        </View>

        <View style={styles.section}>
          <Text>
            Fait le{" "}
            <Text style={styles.bold}>{fmtDate(new Date().toISOString())}</Text>
            , à <Text style={styles.bold}>{blank(p?.city as string | null)}</Text>
          </Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signCol}>
            <Text style={styles.bold}>Signature du bailleur</Text>
            <Text style={styles.small}>
              [ou de son mandataire, le cas échéant]
            </Text>
            <View style={styles.signLine} />
          </View>
          <View style={styles.signCol}>
            <Text style={styles.bold}>Signature du locataire</Text>
            <View style={styles.signLine} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderContractPdf(data: ContractData): Promise<Buffer> {
  return await renderToBuffer(<ContractPdfDoc data={data} />);
}
