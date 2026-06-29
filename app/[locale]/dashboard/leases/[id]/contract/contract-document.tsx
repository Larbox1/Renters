// Pure presentational component: renders the Bail vide / Bail meublé
// contract markup, a faithful reproduction of the loi Alur bail type
// (décret du 29 mai 2015). Used by both the live contract page and the
// server-side renderer that produces the saved PDF snapshot. No data
// fetching, no async — safe for renderToStaticMarkup.

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

export type { ContractData };

const cb = (checked: boolean) => (checked ? "☒" : "☐");

export function ContractDocument({ data }: { data: ContractData }) {
  const d = deriveContract(data);
  const { p, t, l, ownerProfile } = d;

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
          {d.isMeuble
            ? "Locaux meublés à usage d’habitation"
            : "Locaux vides à usage d’habitation"}
        </p>
      </header>

      <p className="mt-4 text-[10px] italic text-slate-600">{PREAMBLE}</p>

      <section className="mt-6">
        <h2 className="text-sm font-bold">I. Désignation des parties</h2>
        <p className="mt-2">Le présent contrat est conclu entre les soussignés :</p>

        <dl className="mt-3 space-y-1">
          <div>Qualité du bailleur : ☒ Personne physique ☐ Personne morale</div>
          <div>
            <strong>Nom et prénom du bailleur :</strong> {blank(d.ownerName)}
          </div>
          <div>Dénomination (si personne morale) : _______________________</div>
          <div>
            Société civile constituée exclusivement entre parents et alliés
            jusqu’au quatrième degré inclus : ☐ oui ☐ non
          </div>
          <div>
            <strong>Adresse :</strong> {blank(d.ownerAddress)}
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
          <div>Dénomination (si personne morale) : ____________________</div>
          <div>Adresse : ___________________________________________</div>
          <div>Activité exercée : ____________________</div>
          <div>
            N° et lieu de délivrance de la carte professionnelle :
            ____________________
          </div>
        </dl>

        <p className="mt-3">
          Le cas échéant, nom et adresse du garant : ____________________
        </p>

        <div className="mt-3">
          <strong>Nom et prénom du ou des locataires</strong>, adresse email
          (facultatif) :
          <p className="mt-1">
            {d.tenantIsSociete ? (
              <>
                Société {blank(t?.full_name as string | null)} — SIREN{" "}
                {blank(t?.siren as string | null)} — représentée par{" "}
                {blank(d.tenantSigningName)}
              </>
            ) : (
              <>{blank(d.tenantSigningName)}</>
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
          <strong>Adresse du logement :</strong> {blank(d.propertyAddress)}
        </p>
        <p className="mt-1">Identifiant fiscal du logement : ____________________</p>
        <p className="mt-1">
          Type d&apos;habitat, Immeuble : {cb(p?.housing_kind === "collective")}{" "}
          collectif {cb(p?.housing_kind === "individual")} individuel /{" "}
          {cb(p?.ownership_kind === "single_ownership")} mono propriété{" "}
          {cb(p?.ownership_kind === "co_ownership")} copropriété
        </p>
        <p className="mt-1">
          Période de construction : {cb(d.period === "before_1949")} avant 1949{" "}
          {cb(d.period === "1949_1974")} de 1949 à 1974{" "}
          {cb(d.period === "1975_1989")} de 1975 à 1989{" "}
          {cb(d.period === "1989_2005")} de 1989 à 2005{" "}
          {cb(d.period === "since_2005")} depuis 2005
        </p>
        <p className="mt-1">
          - surface habitable :{" "}
          <strong>{blank(p?.surface_sqm as number | null)}</strong> m² - nombre
          de pièces principales :{" "}
          <strong>{blank(p?.rooms as number | null)}</strong>
        </p>
        <p className="mt-1">
          - autres parties du logement : ☐ grenier ☐ comble {cb(!!p?.terrace)}{" "}
          terrasse {cb(!!p?.balcony)} balcon ☐ loggia {cb(!!p?.garden)} jardin
        </p>
        <p className="mt-1">
          Éléments d&apos;équipements du logement (cuisine équipée,
          installations sanitaires, etc.) : ____________________________________
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
        <p>
          ☒ usage d&apos;habitation ☐ usage mixte professionnel et
          d&apos;habitation
        </p>

        <h3 className="mt-3 font-semibold">
          C. Désignation des locaux et équipements à usage privatif du locataire
        </h3>
        <p>
          {cb(!!p?.basement)} cave {cb(!!p?.parking)} parking ☐ garage ☐ Autres
        </p>

        <h3 className="mt-3 font-semibold">
          D. Énumération des locaux, parties et équipements à usage commun
        </h3>
        <p>
          {cb(!!p?.bike_storage)} garage à vélo {cb(!!p?.elevator)} ascenseur{" "}
          {cb(!!p?.green_space)} espaces verts {cb(!!p?.playground)} aires et
          équipements de jeux {cb(!!p?.laundry_room)} laverie ☐ local poubelle{" "}
          {cb(!!p?.caretaker)} gardiennage
        </p>

        <h3 className="mt-3 font-semibold">
          E. Équipement d&apos;accès aux technologies de l&apos;information et de
          la communication
        </h3>
        <p>
          Fibre optique : {cb(!!p?.fiber_optic)} — Câble : {cb(!!p?.cable_tv)}
        </p>

        <p className="mt-3 text-[10px] italic text-slate-600">{DPE_RAPPEL}</p>
        <p className="mt-2">
          <strong>
            Niveau de performance du logement (classe du diagnostic de
            performance énergétique) :
          </strong>{" "}
          {blank(d.dpeClass)}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">
          III. Date de prise d&apos;effet et durée du contrat
        </h2>
        <p className="mt-2">
          A. Date de prise d&apos;effet du contrat :{" "}
          <strong>{fmtDate(l.start_date as string | null)}</strong>
        </p>
        <p className="mt-1">
          B. Durée du contrat :{" "}
          {d.isMeuble ? (
            <>
              {cb(l.duration === "1_year")} 1 an{" "}
              {cb(l.duration === "9_months_student")} 9 mois (étudiant, sans
              reconduction tacite)
            </>
          ) : (
            <>
              {cb(l.duration === "3_years")} 3 ans{" "}
              {cb(l.duration === "6_years")} 6 ans (minimum 6 ans si le bailleur
              est une personne morale)
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
              Événement et raison justifiant la durée réduite :{" "}
              {blank(l.reduced_duration_reason as string | null)}
            </p>
          </>
        )}
        <p className="mt-2 text-justify text-[11px] text-slate-700">
          {tacitRenewalText(d.isMeuble)}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">IV. Conditions financières</h2>

        <h3 className="mt-3 font-semibold">A. Loyer</h3>
        <p>
          1° Fixation du loyer initial — a) Montant du loyer mensuel :{" "}
          <strong>{fmt(l.monthly_rent_cents as number)}</strong>
        </p>

        <p className="mt-1">
          b) Modalités particulières de fixation en zone tendue : le loyer
          est-il soumis au loyer de référence majoré fixé par arrêté préfectoral
          ? {cb(!!l.is_zone_tendue)} Oui {cb(!l.is_zone_tendue)} Non
        </p>
        {!!l.is_zone_tendue && (
          <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-2">
            <p>
              Montant du loyer de référence :{" "}
              {fmt(l.reference_rent_cents_per_sqm as number | null)} /m² —
              Montant du loyer de référence majoré :{" "}
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
        <p className="mt-1">
          c) Le cas échéant, informations relatives au loyer du dernier
          locataire (dernier loyer acquitté, date de versement et de dernière
          révision) : ____________________________________
        </p>

        <p className="mt-2">
          2° Modalités de révision — a) Date de révision :{" "}
          {fmtDate(l.revision_date as string | null)} ; b) Date ou trimestre de
          référence de l&apos;IRL :{" "}
          <strong>{blank(l.irl_reference as string | null)}</strong>
        </p>

        <h3 className="mt-3 font-semibold">B. Charges récupérables</h3>
        <p>
          1. Modalité de règlement :{" "}
          {cb(isCharges(l.charges_method as string | null, "provisions"))}{" "}
          Provisions sur charges avec régularisation annuelle{" "}
          {cb(isCharges(l.charges_method as string | null, "periodic"))}{" "}
          Paiement périodique sans provision{" "}
          {cb(isCharges(l.charges_method as string | null, "flat_rate"))}{" "}
          Forfait de charges
        </p>
        <p className="mt-1">
          2. Montant des provisions sur charges ou du forfait :{" "}
          <strong>{fmt(l.charges_amount_cents as number | null)}</strong>
        </p>
        <p className="mt-1">
          3. Le cas échéant, modalités de révision du forfait de charges :
          ____________________________________
        </p>

        <h3 className="mt-3 font-semibold">
          C. En cas de colocation, assurance souscrite par le bailleur pour le
          compte des colocataires
        </h3>
        <p>☐ Oui ☐ Non</p>
        <p className="mt-1">
          Montant total annuel récupérable : ____________________ — Montant
          récupérable par douzième : ____________________
        </p>

        <h3 className="mt-3 font-semibold">D. Modalités de paiement</h3>
        <p>
          Périodicité du paiement : mensuel — Paiement :{" "}
          {cb(l.payment_timing === "in_advance")} à échoir{" "}
          {cb(l.payment_timing === "arrears")} à terme échu
        </p>
        <p className="mt-1">
          Date ou période de paiement : le{" "}
          <strong>{blank(l.payment_day_of_month as number | null)}</strong> du
          mois — Lieu de paiement : __________________________
        </p>
        <p className="mt-1">
          Montant total dû à la première échéance pour une période complète :
          Loyer (hors charges) {fmt(l.monthly_rent_cents as number)} ; Charges
          récupérables {fmt(l.charges_amount_cents as number | null)} ;
          Contribution pour le partage des économies de charges :
          ____________________
        </p>

        <h3 className="mt-3 font-semibold">
          E. Le cas échéant, réévaluation d&apos;un loyer manifestement
          sous-évalué (lors d&apos;un renouvellement)
        </h3>
        <p>
          Montant de la hausse ou de la baisse mensuelle : ____________________ —
          Modalité d&apos;application annuelle : ____________________
        </p>

        <h3 className="mt-3 font-semibold">
          F. Dépenses énergétiques (pour information)
        </h3>
        <p>
          Montant estimé des dépenses annuelles d&apos;énergie pour un usage
          standard : <strong>{d.energyEstimate}</strong> — année de référence
          des prix énergétiques : <strong>{blank(d.energyYear)}</strong>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">V. Travaux</h2>
        <p>
          A. Montant et nature des travaux d&apos;amélioration ou de mise en
          conformité effectués depuis la fin du dernier contrat ou le dernier
          renouvellement : ____________________________________
        </p>
        <p className="mt-1">
          B. Majoration du loyer en cours de bail consécutive à des travaux
          d&apos;amélioration entrepris par le bailleur :
          ____________________________________
        </p>
        <p className="mt-1">
          C. Diminution de loyer en cours de bail consécutive à des travaux
          entrepris par le locataire : ____________________________________
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VI. Garanties</h2>
        <p>
          Montant du dépôt de garantie de l&apos;exécution des obligations du
          locataire (
          {d.isMeuble
            ? "inférieur ou égal à deux mois de loyer hors charges"
            : "inférieur ou égal à un mois de loyer hors charges"}
          ) : <strong>{fmt(l.deposit_cents as number)}</strong>
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VII. Clause de solidarité</h2>
        <p className="mt-1 text-justify">{SOLIDARITE_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">VIII. Clause résolutoire</h2>
        <p className="mt-1 text-justify">{RESOLUTOIRE_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">IX. Honoraires de location</h2>
        <p className="text-justify text-[11px] text-slate-700">
          {HONORAIRES_INTRO}
        </p>
        <p className="mt-2 font-semibold">
          B. Détail et répartition des honoraires
        </p>
        <p className="mt-1">
          1. À la charge du bailleur — visite du preneur, constitution du
          dossier et rédaction du bail : ____________________ ; réalisation de
          l&apos;état des lieux d&apos;entrée : ____________________
        </p>
        <p className="mt-1">
          2. À la charge du locataire — visite du preneur, constitution du
          dossier et rédaction du bail :{" "}
          <strong>{fmt(l.tenant_fees_cents as number | null)}</strong> ;
          réalisation de l&apos;état des lieux d&apos;entrée :{" "}
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
          Sont annexées et jointes au contrat de location les pièces suivantes :
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {ANNEXES(d.isMeuble).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <p>
          Fait le <strong>{fmtDate(new Date().toISOString())}</strong>, à{" "}
          <strong>{blank(p?.city as string | null)}</strong>
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-12">
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
