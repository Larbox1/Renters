// PDF version of the Bail vide / Bail meublé contract — used by the Save
// action only. Loaded via dynamic import so @react-pdf/renderer never
// enters the page's static module graph.

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ContractData } from "./contract-document";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.35 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 8, fontStyle: "italic", textAlign: "center", marginTop: 4, color: "#475569" },
  topLine: { fontSize: 9, fontWeight: 700, textAlign: "center", marginTop: 4 },
  section: { marginTop: 14 },
  h2: { fontSize: 10, fontWeight: 700 },
  h3: { fontSize: 9.5, fontWeight: 700, marginTop: 8 },
  p: { marginTop: 4 },
  italic: { fontStyle: "italic" },
  bold: { fontWeight: 700 },
  boxed: { marginTop: 4, padding: 6, borderWidth: 0.5, borderColor: "#cbd5e1", backgroundColor: "#f8fafc" },
  signRow: { marginTop: 24, flexDirection: "row", gap: 24 },
  signCol: { flex: 1 },
  signLine: { marginTop: 36, height: 0.5, backgroundColor: "#cbd5e1" },
  small: { fontSize: 7.5, fontStyle: "italic", color: "#64748b", marginTop: 4 },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
});

const blank = (v: string | number | null | undefined): string =>
  v == null || v === "" ? "_______________________" : String(v);

const fmt = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(cents / 100)
    : "_______________";

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("fr-FR").format(new Date(iso)) : "__/__/____";

const cb = (checked: boolean) => (checked ? "[X]" : "[ ]");

function constructionPeriod(year: number | null | undefined) {
  if (year == null) return null;
  if (year < 1949) return "before_1949";
  if (year < 1975) return "1949_1974";
  if (year < 1989) return "1975_1989";
  if (year < 2005) return "1989_2005";
  return "since_2005";
}

function ContractPdfDoc({ data }: { data: ContractData }) {
  const { lease, property, tenant, ownerProfile } = data;
  const p = property as Record<string, unknown> | null;
  const t = tenant as Record<string, unknown> | null;
  const l = lease as Record<string, unknown>;

  const isMeuble = l.type === "bail_meuble";
  const period = constructionPeriod(p?.construction_year as number | null);
  const dpeClass = (p?.dpe_class ?? l.dpe_class ?? null) as string | null;
  const energyMin = (p?.annual_energy_cost_min_cents ?? null) as number | null;
  const energyMax = (p?.annual_energy_cost_max_cents ?? null) as number | null;
  const energyYear = (p?.annual_energy_cost_year ?? null) as number | null;

  const propertyAddress = [
    p?.address as string | null,
    p?.building ? `Bât. ${p.building}` : null,
    p?.floor != null
      ? (p.floor as number) === 0
        ? "RDC"
        : `étage ${p.floor}`
      : null,
    [p?.postal_code as string | null, p?.city as string | null]
      .filter(Boolean)
      .join(" "),
    p?.country as string | null,
  ]
    .filter(Boolean)
    .join(", ");

  const ownerName =
    ownerProfile?.first_name && ownerProfile?.last_name
      ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
      : ownerProfile?.full_name ?? null;
  const ownerAddress =
    [
      ownerProfile?.address,
      [ownerProfile?.postal_code, ownerProfile?.city]
        .filter(Boolean)
        .join(" "),
      ownerProfile?.country,
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  const tenantIsSociete = t?.tenant_type === "societe";
  const civPrefix = (c: unknown) =>
    c === "mr" ? "M." : c === "mrs" ? "Mme" : null;
  const tenantSigningName = tenantIsSociete
    ? [
        civPrefix(t?.civilite),
        t?.legal_rep_first_name as string | null,
        t?.legal_rep_last_name as string | null,
      ]
        .filter(Boolean)
        .join(" ")
    : [civPrefix(t?.civilite), t?.full_name as string | null]
        .filter(Boolean)
        .join(" ");

  const isCharges = (m: string | null | undefined, value: string) =>
    m === value;

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
          {isMeuble
            ? "LOCAUX MEUBLÉS À USAGE D'HABITATION"
            : "LOCAUX VIDES À USAGE D'HABITATION"}
        </Text>

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
            {blank(ownerName)}
          </Text>
          <Text style={styles.p}>
            Dénomination (si personne morale) : _______________________
          </Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Adresse : </Text>
            {blank(ownerAddress)}
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
            Adresse : ___________________________________________
          </Text>

          <Text style={styles.p}>
            Le cas échéant, nom et adresse du garant : ____________________
          </Text>

          <Text style={[styles.p, styles.bold]}>
            Nom et prénom du ou des locataires, adresse email (facultatif) :
          </Text>
          <Text style={styles.p}>
            {tenantIsSociete
              ? `Société ${blank(t?.full_name as string | null)} — SIREN ${blank(t?.siren as string | null)} — représentée par ${blank(tenantSigningName)}`
              : blank(tenantSigningName)}
            {t?.email ? ` — ${t.email as string}` : ""}
          </Text>
          <Text style={[styles.p, styles.italic]}>
            désigné(s) ci-après « le locataire » ;
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>II. Objet du contrat</Text>
          <Text style={styles.p}>
            Le présent contrat a pour objet la location d'un logement ainsi
            déterminé :
          </Text>

          <Text style={styles.h3}>A. Consistance du logement</Text>
          <Text style={styles.p}>
            <Text style={styles.bold}>Adresse du logement : </Text>
            {blank(propertyAddress)}
          </Text>
          <Text style={styles.p}>Identifiant fiscal du logement : ________</Text>
          <Text style={styles.p}>
            Type d'habitat : {cb(p?.housing_kind === "collective")} collectif{" "}
            {cb(p?.housing_kind === "individual")} individuel /{" "}
            {cb(p?.ownership_kind === "single_ownership")} mono propriété{" "}
            {cb(p?.ownership_kind === "co_ownership")} copropriété
          </Text>
          <Text style={styles.p}>
            Période de construction : {cb(period === "before_1949")} avant 1949{" "}
            {cb(period === "1949_1974")} 1949–1974{" "}
            {cb(period === "1975_1989")} 1975–1989{" "}
            {cb(period === "1989_2005")} 1989–2005{" "}
            {cb(period === "since_2005")} depuis 2005
          </Text>
          <Text style={styles.p}>
            - surface habitable :{" "}
            <Text style={styles.bold}>
              {blank(p?.surface_sqm as number | null)}
            </Text>{" "}
            m² — pièces principales :{" "}
            <Text style={styles.bold}>{blank(p?.rooms as number | null)}</Text>
          </Text>
          <Text style={styles.p}>
            - Autres parties : [ ] grenier [ ] comble {cb(!!p?.terrace)}{" "}
            terrasse {cb(!!p?.balcony)} balcon [ ] loggia {cb(!!p?.garden)}{" "}
            jardin
          </Text>
          <Text style={styles.p}>
            Éléments d'équipements (cuisine, sanitaires, etc.) :
            ____________________________________
          </Text>
          <Text style={styles.p}>
            Production de chauffage :{" "}
            {cb(p?.heating_mode === "individual")} individuel{" "}
            {cb(p?.heating_mode === "collective")} collectif
          </Text>
          <Text style={styles.p}>
            Production d'eau chaude sanitaire :{" "}
            {cb(p?.hot_water_mode === "individual")} individuel{" "}
            {cb(p?.hot_water_mode === "collective")} collectif
          </Text>

          <Text style={styles.h3}>B. Destination des locaux</Text>
          <Text style={styles.p}>
            [X] usage d'habitation [ ] usage mixte professionnel et habitation
          </Text>

          <Text style={styles.h3}>C. Locaux et équipements à usage privatif</Text>
          <Text style={styles.p}>
            {cb(!!p?.basement)} cave {cb(!!p?.parking)} parking [ ] garage [ ]
            Autres
          </Text>

          <Text style={styles.h3}>D. Locaux et équipements à usage commun</Text>
          <Text style={styles.p}>
            {cb(!!p?.bike_storage)} garage à vélo {cb(!!p?.elevator)} ascenseur{" "}
            {cb(!!p?.green_space)} espaces verts {cb(!!p?.playground)} aires de
            jeux {cb(!!p?.laundry_room)} laverie [ ] local poubelle{" "}
            {cb(!!p?.caretaker)} gardiennage
          </Text>

          <Text style={styles.h3}>E. Équipement TIC</Text>
          <Text style={styles.p}>
            Fibre optique : {cb(!!p?.fiber_optic)} — Câble :{" "}
            {cb(!!p?.cable_tv)}
          </Text>

          <Text style={styles.p}>
            <Text style={styles.bold}>
              Niveau de performance énergétique (classe DPE) :{" "}
            </Text>
            {blank(dpeClass)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>III. Date de prise d'effet et durée</Text>
          <Text style={styles.p}>
            A. Date de prise d'effet :{" "}
            <Text style={styles.bold}>
              {fmtDate(l.start_date as string | null)}
            </Text>
          </Text>
          <Text style={styles.p}>
            B. Durée du contrat :{" "}
            {isMeuble
              ? `${cb(l.duration === "1_year")} 1 an ${cb(l.duration === "9_months_student")} 9 mois (étudiant, sans reconduction tacite)`
              : `${cb(l.duration === "3_years")} 3 ans ${cb(l.duration === "6_years")} 6 ans`}
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
                C. Événement justifiant la durée réduite :{" "}
                {blank(l.reduced_duration_reason as string | null)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>IV. Conditions financières</Text>

          <Text style={styles.h3}>A. Loyer</Text>
          <Text style={styles.p}>
            1° Montant du loyer mensuel :{" "}
            <Text style={styles.bold}>{fmt(l.monthly_rent_cents as number)}</Text>
          </Text>

          {!!l.is_zone_tendue && (
            <View style={styles.boxed}>
              <Text>Zone tendue : [X] oui</Text>
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
            2° Date de révision : {fmtDate(l.revision_date as string | null)} ;
            trimestre IRL :{" "}
            <Text style={styles.bold}>
              {blank(l.irl_reference as string | null)}
            </Text>
          </Text>

          <Text style={styles.h3}>B. Charges récupérables</Text>
          <Text style={styles.p}>
            {cb(isCharges(l.charges_method as string | null, "provisions"))}{" "}
            Provisions {cb(isCharges(l.charges_method as string | null, "periodic"))}{" "}
            Paiement périodique{" "}
            {cb(isCharges(l.charges_method as string | null, "flat_rate"))}{" "}
            Forfait
          </Text>
          <Text style={styles.p}>
            Montant mensuel :{" "}
            <Text style={styles.bold}>
              {fmt(l.charges_amount_cents as number | null)}
            </Text>
          </Text>

          <Text style={styles.h3}>E. Modalités de paiement</Text>
          <Text style={styles.p}>
            Paiement : {cb(l.payment_timing === "in_advance")} à échoir{" "}
            {cb(l.payment_timing === "arrears")} à terme échu
          </Text>
          <Text style={styles.p}>
            Date de paiement : le{" "}
            <Text style={styles.bold}>
              {blank(l.payment_day_of_month as number | null)}
            </Text>{" "}
            du mois — Lieu : __________________________
          </Text>
          <Text style={styles.p}>
            Première échéance : Loyer (hors charges){" "}
            {fmt(l.monthly_rent_cents as number)} ; Charges{" "}
            {fmt(l.charges_amount_cents as number | null)}
          </Text>

          <Text style={styles.h3}>G. Dépenses énergétiques (info)</Text>
          <Text style={styles.p}>
            Dépenses annuelles d'énergie :{" "}
            <Text style={styles.bold}>
              {energyMin != null && energyMax != null
                ? `${fmt(energyMin)} – ${fmt(energyMax)}`
                : energyMin != null
                  ? fmt(energyMin)
                  : energyMax != null
                    ? fmt(energyMax)
                    : "_______________"}
            </Text>{" "}
            — année de référence :{" "}
            <Text style={styles.bold}>{blank(energyYear)}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>V. Travaux</Text>
          <Text style={styles.p}>
            A. Travaux d'amélioration / mise en conformité :
            ____________________________________
          </Text>
          <Text style={styles.p}>
            B. Majoration du loyer pour travaux :
            ____________________________________
          </Text>
          <Text style={styles.p}>
            C. Diminution du loyer pour travaux locataire :
            ____________________________________
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VI. Garanties</Text>
          <Text style={styles.p}>
            Dépôt de garantie (
            {isMeuble
              ? "≤ 2 mois de loyer hors charges"
              : "≤ 1 mois de loyer hors charges"}
            ) :{" "}
            <Text style={styles.bold}>{fmt(l.deposit_cents as number)}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VII. Clause de solidarité</Text>
          <Text style={styles.p}>
            En cas de colocation, les locataires sont tenus conjointement,
            solidairement et indivisiblement à l'égard du bailleur au paiement
            des loyers, charges et accessoires dus en application du présent
            bail. La solidarité d'un colocataire et celle de la personne qui
            s'est portée caution prennent fin à la date d'effet du congé
            régulièrement délivré et lorsqu'un nouveau colocataire figure au
            bail. À défaut, la solidarité du colocataire sortant s'éteint au
            plus tard à l'expiration d'un délai de six mois après la date
            d'effet du congé.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>VIII. Clause résolutoire</Text>
          <Text style={styles.p}>
            Le bail sera résilié de plein droit en cas d'inexécution des
            obligations du locataire (défaut de paiement des loyers et charges,
            non-versement du dépôt de garantie, défaut d'assurance, troubles de
            voisinage). Pour défaut de paiement, un commandement de payer doit
            préalablement être signifié par acte de commissaire de justice ;
            si le locataire ne s'acquitte pas des sommes dues dans les six
            semaines, le bailleur peut assigner pour faire constater la
            résiliation. En cas de défaut d'assurance, le délai après
            commandement infructueux est d'un mois.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>IX. Honoraires de location</Text>
          <Text style={styles.p}>
            Locataire — visite, dossier, rédaction du bail :{" "}
            <Text style={styles.bold}>
              {fmt(l.tenant_fees_cents as number | null)}
            </Text>
          </Text>
          <Text style={styles.p}>
            Locataire — état des lieux d'entrée :{" "}
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
          <Text style={styles.p}>Pièces annexées :</Text>
          <Bullet>
            Le cas échéant, un extrait du règlement de copropriété
          </Bullet>
          <Bullet>
            Dossier de diagnostic technique (DPE, plomb, amiante, électricité /
            gaz, risques naturels et technologiques)
          </Bullet>
          <Bullet>
            Notice d'information sur les droits et obligations des parties
          </Bullet>
          <Bullet>
            {isMeuble
              ? "État des lieux, inventaire et état détaillé du mobilier"
              : "État des lieux"}
          </Bullet>
          <Bullet>Le cas échéant, autorisation préalable de mise en location</Bullet>
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
