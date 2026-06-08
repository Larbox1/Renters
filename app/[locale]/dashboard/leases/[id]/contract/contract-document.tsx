// Pure presentational component: renders the Bail vide / Bail meublé
// contract markup. Used by both the live contract page and the server-side
// renderer that produces the saved PDF snapshot. No data fetching, no async,
// no React server component features — safe for renderToStaticMarkup.

export type ContractData = {
  lease: Record<string, unknown>;
  property: Record<string, unknown> | null;
  tenant: Record<string, unknown> | null;
  ownerProfile: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    phone: string | null;
  } | null;
};

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
  iso
    ? new Intl.DateTimeFormat("fr-FR").format(new Date(iso))
    : "__/__/____";

const cb = (checked: boolean) => (checked ? "☒" : "☐");

function constructionPeriod(year: number | null | undefined) {
  if (year == null) return null;
  if (year < 1949) return "before_1949";
  if (year < 1975) return "1949_1974";
  if (year < 1989) return "1975_1989";
  if (year < 2005) return "1989_2005";
  return "since_2005";
}

export function ContractDocument({ data }: { data: ContractData }) {
  const { lease, property, tenant, ownerProfile } = data;
  const p = property as Record<string, unknown> | null;
  const t = tenant as Record<string, unknown> | null;
  const l = lease as Record<string, unknown>;

  const isMeuble = l.type === "bail_meuble";
  const period = constructionPeriod(p?.construction_year as number | null);
  const dpeClass = (p?.dpe_class ?? l.dpe_class ?? null) as string | null;
  const energyMin = (p?.annual_energy_cost_min_cents ?? null) as
    | number
    | null;
  const energyMax = (p?.annual_energy_cost_max_cents ?? null) as
    | number
    | null;
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
  const tenantSigningName = tenantIsSociete
    ? [
        t?.civilite === "mr" ? "M." : t?.civilite === "mrs" ? "Mme" : null,
        t?.legal_rep_first_name as string | null,
        t?.legal_rep_last_name as string | null,
      ]
        .filter(Boolean)
        .join(" ")
    : [
        t?.civilite === "mr" ? "M." : t?.civilite === "mrs" ? "Mme" : null,
        t?.full_name as string | null,
      ]
        .filter(Boolean)
        .join(" ");

  const isCharges = (m: string | null | undefined, value: string) =>
    m === value;

  return (
    <article className="contract-page mx-auto rounded-md border border-slate-200 bg-white p-10 text-[12px] leading-snug text-slate-900 shadow-sm">
      <header className="text-center">
        <h1 className="text-lg font-bold">Contrat de location</h1>
        <p className="mt-1 text-[10px] italic text-slate-600">
          (Soumis au titre Ier bis de la loi du 6 juillet 1989 et portant
          modification de la loi n° 86-1290 du 23 décembre 1986 — bail type
          conforme aux dispositions de la loi Alur de 2014, mis en application
          par le décret du 29 mai 2015)
        </p>
        <p className="mt-1 font-semibold uppercase">
          {isMeuble
            ? "Locaux meublés à usage d’habitation"
            : "Locaux vides à usage d’habitation"}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold">I. Désignation des parties</h2>
        <p className="mt-2">Le présent contrat est conclu entre les soussignés :</p>

        <dl className="mt-3 space-y-1">
          <div>
            Qualité du bailleur : ☒ Personne physique ☐ Personne morale
          </div>
          <div>
            <strong>Nom et prénom du bailleur :</strong> {blank(ownerName)}
          </div>
          <div>Dénomination (si personne morale) : _______________________</div>
          <div>
            <strong>Adresse :</strong> {blank(ownerAddress)}
          </div>
          {ownerProfile?.phone && (
            <div>
              <strong>Téléphone :</strong> {ownerProfile.phone}
            </div>
          )}
          <div>Adresse email (facultatif) : _____________________</div>
        </dl>

        <p className="mt-3 italic">désigné(s) ci-après « le bailleur » ;</p>

        <p className="mt-3">
          Le cas échéant, représenté par un mandataire : ☐ oui ☐ non
        </p>
        <dl className="mt-1 space-y-1">
          <div>Nom et prénom du mandataire : ____________________</div>
          <div>Adresse : ___________________________________________</div>
        </dl>

        <p className="mt-3">
          Le cas échéant, nom et adresse du garant : ____________________
        </p>

        <div className="mt-3">
          <strong>Nom et prénom du ou des locataires</strong>, adresse email
          (facultatif) :
          <p className="mt-1">
            {tenantIsSociete ? (
              <>
                Société {blank(t?.full_name as string | null)} — SIREN{" "}
                {blank(t?.siren as string | null)} — représentée par{" "}
                {blank(tenantSigningName)}
              </>
            ) : (
              <>{blank(tenantSigningName)}</>
            )}
            {t?.email ? ` — ${t.email as string}` : ""}
          </p>
        </div>

        <p className="mt-3 italic">désigné(s) ci-après « le locataire » ;</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">II. Objet du contrat</h2>
        <p className="mt-2">
          Le présent contrat a pour objet la location d&apos;un logement ainsi
          déterminé :
        </p>

        <h3 className="mt-3 font-semibold">A. Consistance du logement</h3>
        <p className="mt-1">
          <strong>Adresse du logement :</strong> {blank(propertyAddress)}
        </p>
        <p className="mt-1">Identifiant fiscal du logement : ________</p>
        <p className="mt-1">
          Type d&apos;habitat, Immeuble :{" "}
          {cb(p?.housing_kind === "collective")} collectif{" "}
          {cb(p?.housing_kind === "individual")} individuel /{" "}
          {cb(p?.ownership_kind === "single_ownership")} mono propriété{" "}
          {cb(p?.ownership_kind === "co_ownership")} copropriété
        </p>
        <p className="mt-1">
          Période de construction : {cb(period === "before_1949")} avant 1949{" "}
          {cb(period === "1949_1974")} de 1949 à 1974{" "}
          {cb(period === "1975_1989")} de 1975 à 1989{" "}
          {cb(period === "1989_2005")} de 1989 à 2005{" "}
          {cb(period === "since_2005")} depuis 2005
        </p>
        <p className="mt-1">
          - surface habitable :{" "}
          <strong>{blank(p?.surface_sqm as number | null)}</strong> m² - nombre
          de pièces principales :{" "}
          <strong>{blank(p?.rooms as number | null)}</strong>
        </p>
        <p className="mt-1">
          - Autres parties du logement : ☐ grenier ☐ comble{" "}
          {cb(!!p?.terrace)} terrasse {cb(!!p?.balcony)} balcon ☐ loggia{" "}
          {cb(!!p?.garden)} jardin
        </p>
        <p className="mt-1">
          Éléments d&apos;équipements du logement (cuisine, sanitaires, etc.) :
          ____________________________________
        </p>
        <p className="mt-1">
          Modalité de production de chauffage :{" "}
          {cb(p?.heating_mode === "individual")} individuel{" "}
          {cb(p?.heating_mode === "collective")} collectif
        </p>
        <p className="mt-1">
          Modalité de production d&apos;eau chaude sanitaire :{" "}
          {cb(p?.hot_water_mode === "individual")} individuel{" "}
          {cb(p?.hot_water_mode === "collective")} collectif
        </p>

        <h3 className="mt-3 font-semibold">B. Destination des locaux</h3>
        <p>☒ usage d&apos;habitation ☐ usage mixte professionnel et d&apos;habitation</p>

        <h3 className="mt-3 font-semibold">
          C. Locaux et équipements à usage privatif
        </h3>
        <p>
          {cb(!!p?.basement)} cave {cb(!!p?.parking)} parking ☐ garage ☐ Autres
        </p>

        <h3 className="mt-3 font-semibold">D. Locaux et équipements à usage commun</h3>
        <p>
          {cb(!!p?.bike_storage)} garage à vélo {cb(!!p?.elevator)} ascenseur{" "}
          {cb(!!p?.green_space)} espaces verts {cb(!!p?.playground)} aires et
          équipements de jeux {cb(!!p?.laundry_room)} laverie ☐ local poubelle{" "}
          {cb(!!p?.caretaker)} gardiennage
        </p>

        <h3 className="mt-3 font-semibold">E. Équipement TIC</h3>
        <p>
          Fibre optique : {cb(!!p?.fiber_optic)} — Câble :{" "}
          {cb(!!p?.cable_tv)}
        </p>

        <p className="mt-3">
          <strong>Niveau de performance énergétique (classe DPE) :</strong>{" "}
          {blank(dpeClass)}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">III. Date de prise d&apos;effet et durée du contrat</h2>
        <p className="mt-2">
          A. Date de prise d&apos;effet :{" "}
          <strong>{fmtDate(l.start_date as string | null)}</strong>
        </p>
        <p className="mt-1">
          B. Durée du contrat :{" "}
          {isMeuble ? (
            <>
              {cb(l.duration === "1_year")} 1 an{" "}
              {cb(l.duration === "9_months_student")} 9 mois (étudiant, sans
              reconduction tacite)
            </>
          ) : (
            <>
              {cb(l.duration === "3_years")} 3 ans{" "}
              {cb(l.duration === "6_years")} 6 ans (minimum 6 ans si le
              bailleur est une personne morale)
            </>
          )}
        </p>
        {l.duration === "reduced" && (
          <>
            <p className="mt-1">
              ☒ Durée réduite :{" "}
              <strong>
                {blank(l.reduced_duration_months as number | null)} mois
              </strong>
            </p>
            <p className="mt-1">
              C. Événement et raison justifiant la durée réduite :{" "}
              {blank(l.reduced_duration_reason as string | null)}
            </p>
          </>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">IV. Conditions financières</h2>

        <h3 className="mt-3 font-semibold">A. Loyer</h3>
        <p>
          1° Fixation du loyer initial — Montant du loyer mensuel :{" "}
          <strong>{fmt(l.monthly_rent_cents as number)}</strong>
        </p>

        {!!l.is_zone_tendue && (
          <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-2">
            <p>Zone tendue : ☒ oui</p>
            <p>
              Montant du loyer de référence :{" "}
              {fmt(l.reference_rent_cents_per_sqm as number | null)} /m² —
              Loyer de référence majoré :{" "}
              {fmt(l.reference_rent_capped_cents_per_sqm as number | null)} /m²
            </p>
            {l.rent_supplement_cents != null && (
              <p>
                Complément de loyer :{" "}
                {fmt(l.rent_supplement_cents as number | null)}
              </p>
            )}
          </div>
        )}

        <p className="mt-2">
          2° Modalités de révision — Date de révision :{" "}
          {fmtDate(l.revision_date as string | null)} ; trimestre de référence
          IRL : <strong>{blank(l.irl_reference as string | null)}</strong>
        </p>

        <h3 className="mt-3 font-semibold">B. Charges récupérables</h3>
        <p>
          {cb(isCharges(l.charges_method as string | null, "provisions"))}{" "}
          Provisions avec régularisation annuelle{" "}
          {cb(isCharges(l.charges_method as string | null, "periodic"))}{" "}
          Paiement périodique sans provision{" "}
          {cb(isCharges(l.charges_method as string | null, "flat_rate"))}{" "}
          Forfait (colocation)
        </p>
        <p className="mt-1">
          Montant mensuel des provisions / forfait :{" "}
          <strong>{fmt(l.charges_amount_cents as number | null)}</strong>
        </p>

        <h3 className="mt-3 font-semibold">E. Modalités de paiement</h3>
        <p>
          Périodicité du paiement : mensuel — Paiement :{" "}
          {cb(l.payment_timing === "in_advance")} à échoir{" "}
          {cb(l.payment_timing === "arrears")} à terme échu
        </p>
        <p className="mt-1">
          Date de paiement : le{" "}
          <strong>{blank(l.payment_day_of_month as number | null)}</strong> du
          mois — Lieu de paiement : __________________________
        </p>
        <p className="mt-1">
          Montant total dû à la première échéance : Loyer (hors charges){" "}
          {fmt(l.monthly_rent_cents as number)} ; Charges récupérables{" "}
          {fmt(l.charges_amount_cents as number | null)}
        </p>

        <h3 className="mt-3 font-semibold">G. Dépenses énergétiques (pour information)</h3>
        <p>
          Estimation des dépenses annuelles d&apos;énergie pour un usage
          standard :{" "}
          <strong>
            {energyMin != null && energyMax != null
              ? `${fmt(energyMin)} – ${fmt(energyMax)}`
              : energyMin != null
                ? fmt(energyMin)
                : energyMax != null
                  ? fmt(energyMax)
                  : "_______________"}
          </strong>{" "}
          — année de référence des prix énergétiques :{" "}
          <strong>{blank(energyYear)}</strong>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">V. Travaux</h2>
        <p>
          A. Travaux d&apos;amélioration ou de mise en conformité depuis le
          dernier contrat : ____________________________________
        </p>
        <p className="mt-1">
          B. Majoration du loyer en cours de bail consécutive à des travaux :
          ____________________________________
        </p>
        <p className="mt-1">
          C. Diminution de loyer consécutive à des travaux par le locataire :
          ____________________________________
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VI. Garanties</h2>
        <p>
          Montant du dépôt de garantie (
          {isMeuble
            ? "≤ 2 mois de loyer hors charges"
            : "≤ 1 mois de loyer hors charges"}
          ) : <strong>{fmt(l.deposit_cents as number)}</strong>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VII. Clause de solidarité</h2>
        <p className="mt-1 text-justify">
          Modalités particulières des obligations en cas de pluralité de
          locataires : en cas de colocation, c&apos;est-à-dire de la location
          d&apos;un même logement par plusieurs locataires constituant leur
          résidence principale et formalisée par la conclusion d&apos;un
          contrat unique ou de plusieurs contrats entre les locataires et le
          bailleur, les locataires sont tenus conjointement, solidairement et
          indivisiblement à l&apos;égard du bailleur au paiement des loyers,
          charges et accessoires dus en application du présent bail. La
          solidarité d&apos;un des colocataires et celle de la personne qui
          s&apos;est portée caution pour lui prennent fin à la date d&apos;effet
          du congé régulièrement délivré et lorsqu&apos;un nouveau colocataire
          figure au bail. À défaut, la solidarité du colocataire sortant
          s&apos;éteint au plus tard à l&apos;expiration d&apos;un délai de
          six mois après la date d&apos;effet du congé.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VIII. Clause résolutoire</h2>
        <p className="mt-1 text-justify">
          Le bail sera résilié de plein droit en cas d&apos;inexécution des
          obligations du locataire, soit en cas de défaut de paiement des
          loyers et des charges locatives au terme convenu, de non-versement
          du dépôt de garantie, de défaut d&apos;assurance du locataire contre
          les risques locatifs, de troubles de voisinage constatés par une
          décision de justice passée en force de chose jugée rendue au profit
          d&apos;un tiers. Le bailleur devra assigner le locataire devant le
          tribunal pour faire constater l&apos;acquisition de la clause
          résolutoire et la résiliation de plein droit du bail. Lorsque le
          bailleur souhaite mettre en œuvre la clause résolutoire pour défaut
          de paiement des loyers et charges ou pour non-versement du dépôt de
          garantie, il doit préalablement faire signifier au locataire, par
          acte de commissaire de justice, un commandement de payer.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">IX. Honoraires de location</h2>
        <p>
          Honoraires à la charge du locataire — visite, dossier et rédaction
          du bail : <strong>{fmt(l.tenant_fees_cents as number | null)}</strong>
        </p>
        <p className="mt-1">
          Honoraires à la charge du locataire — état des lieux d&apos;entrée :{" "}
          <strong>{fmt(l.tenant_inventory_fees_cents as number | null)}</strong>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">X. Autres conditions particulières</h2>
        <p className="mt-1">____________________________________</p>
        <p className="mt-1">____________________________________</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">XI. Annexes</h2>
        <p className="mt-1">
          Sont annexées et jointes au contrat de location les pièces
          suivantes :
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Le cas échéant, un extrait du règlement de copropriété concernant
            la destination, la jouissance et l&apos;usage des parties privatives
            et communes
          </li>
          <li>
            Un dossier de diagnostic technique (DPE, plomb, amiante,
            électricité/gaz, risques naturels et technologiques)
          </li>
          <li>
            Une notice d&apos;information relative aux droits et obligations
            des locataires et des bailleurs
          </li>
          <li>
            Un état des lieux
            {isMeuble
              ? ", un inventaire et un état détaillé du mobilier"
              : ""}
          </li>
          <li>
            Le cas échéant, une autorisation préalable de mise en location
          </li>
        </ul>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-12">
        <div>
          <p>
            Fait le <strong>{fmtDate(new Date().toISOString())}</strong>,
          </p>
          <p>
            à <strong>{blank(p?.city as string | null)}</strong>
          </p>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-12">
        <div>
          <p className="font-semibold">Signature du bailleur</p>
          <p className="mt-1 text-[10px] italic text-slate-500">
            [ou de son mandataire, le cas échéant]
          </p>
          <div className="mt-12 h-px border-b border-slate-300" />
        </div>
        <div>
          <p className="font-semibold">Signature du locataire</p>
          <div className="mt-12 h-px border-b border-slate-300" />
        </div>
      </section>
    </article>
  );
}