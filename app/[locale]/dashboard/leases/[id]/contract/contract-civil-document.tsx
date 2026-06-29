// Pure presentational component: renders the Bail civil (articles 1709 et
// suivants du Code civil) — a faithful reproduction of the jelouebien bail
// civil template. Used by both the live contract page and the server-side PDF
// renderer. No data fetching, no async — safe for renderToStaticMarkup.

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

// Euro amount without the currency symbol, for the "(____ €)" figure slots.
const euros = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(
        cents / 100,
      )
    : "________";

export function ContractCivilDocument({ data }: { data: ContractData }) {
  const d = deriveCivil(data);
  const { p, t, l, ownerProfile } = d;

  return (
    <article className="contract-page mx-auto rounded-md border border-slate-200 bg-white p-10 text-[12px] leading-snug text-slate-900 shadow-sm">
      <header className="text-center">
        <h1 className="text-lg font-bold uppercase">Bail civil</h1>
        <p className="mt-1 text-[10px] italic text-slate-600">
          Régi par les articles 1709 et suivants du Code civil
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase">Entre les soussignés</h2>

        <p className="mt-3 font-semibold">Le bailleur :</p>
        <dl className="mt-1 space-y-1">
          <div>
            <strong>Nom, Prénom (ou dénomination sociale) :</strong>{" "}
            {blank(d.ownerName)}
          </div>
          <div>
            <strong>Demeurant :</strong> {blank(d.ownerAddress)}
          </div>
          <div>
            <strong>Numéro de téléphone :</strong>{" "}
            {blank(ownerProfile?.phone ?? null)} —{" "}
            <strong>Adresse e-mail :</strong> _____________________
          </div>
        </dl>
        <p className="mt-1 italic">Ci-après désigné(e) « le Bailleur »</p>

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

        <p className="mt-4 font-semibold">Et :</p>
        <p className="mt-1 font-semibold">Le locataire :</p>
        <dl className="mt-1 space-y-1">
          <div>
            <strong>Nom, Prénom (ou dénomination sociale) :</strong>{" "}
            {d.tenantRep ? (
              <>
                {blank(d.tenantDisplayName)} — représentée par {d.tenantRep}
              </>
            ) : (
              blank(d.tenantDisplayName)
            )}
          </div>
          <div>
            <strong>Demeurant :</strong> {blank(d.tenantAddress)}
          </div>
          <div>
            <strong>Numéro de téléphone :</strong>{" "}
            {blank((t?.phone as string | null) ?? null)} —{" "}
            <strong>Adresse e-mail :</strong>{" "}
            {blank((t?.email as string | null) ?? null)}
          </div>
        </dl>
        <p className="mt-1 italic">Ci-après désigné(e) « le Locataire »</p>

        <p className="mt-3">Il est convenu ce qui suit :</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 1 – Objet du contrat</h2>
        <p className="mt-1">
          Le Bailleur donne à bail au Locataire, qui accepte, le bien désigné
          ci-après.
        </p>
        <p className="mt-2 font-semibold">Désignation du bien loué :</p>
        <p className="mt-1">
          Nature du bien (appartement, maison, terrain, garage, etc.) :{" "}
          <strong>{blank(d.nature)}</strong>
        </p>
        <p className="mt-1">
          Adresse complète : <strong>{blank(d.propertyAddress)}</strong>
        </p>
        <p className="mt-1">
          Surface approximative :{" "}
          <strong>{blank(p?.surface_sqm as number | null)}</strong> m²
        </p>
        <p className="mt-1">
          Autres éléments inclus (cave, parking, jardin, etc.) :{" "}
          <strong>{blank(d.extras)}</strong>
        </p>
        <p className="mt-2 italic text-[11px] text-slate-700">
          {CIVIL_1709_NOTICE}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 2 – Destination des lieux</h2>
        <p className="mt-1">
          Le bien loué est destiné à l&apos;usage exclusif de :
          ____________________________________
        </p>
        <p className="mt-1">{CIVIL_ART2_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 3 – Durée</h2>
        <p className="mt-1">
          Le présent bail est consenti et accepté pour une durée de :{" "}
          <strong>{blank(d.duration)}</strong>
        </p>
        <p className="mt-1">
          prenant effet le :{" "}
          <strong>{fmtDate(l.start_date as string | null)}</strong> et se
          terminant le : <strong>{fmtDate(l.end_date as string | null)}</strong>
        </p>
        <p className="mt-1 text-justify">{CIVIL_ART3_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 4 – Loyer</h2>
        <p className="mt-1">
          Le loyer mensuel est fixé à la somme de :{" "}
          <strong>{fmt(l.monthly_rent_cents as number)}</strong> (
          {euros(l.monthly_rent_cents as number)} €)
        </p>
        <p className="mt-1">
          payable le :{" "}
          <strong>{blank(l.payment_day_of_month as number | null)}</strong> de
          chaque mois
        </p>
        <p className="mt-1">
          par : ____________________ (virement / chèque / espèces)
        </p>
        <p className="mt-2 font-semibold">Révision du loyer :</p>
        <p className="mt-1">
          Le loyer sera révisé chaque année à la date anniversaire du contrat,
          selon les modalités suivantes :
        </p>
        <p className="mt-1">
          {l.irl_reference ? "☒" : "☐"} En fonction de l&apos;Indice de
          Référence des Loyers (IRL) publié par l&apos;INSEE
          {l.irl_reference ? (
            <>
              {" "}
              — référence : <strong>{l.irl_reference as string}</strong>
            </>
          ) : null}
        </p>
        <p className="mt-1">
          ☐ Selon les modalités librement convenues entre les parties :
          ____________________
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 5 – Charges</h2>
        <p className="mt-1">
          Les charges récupérables sont fixées à :{" "}
          <strong>{fmt(l.charges_amount_cents as number | null)}</strong> (
          {euros(l.charges_amount_cents as number | null)} €) par mois
        </p>
        <p className="mt-1">
          Elles couvrent les dépenses suivantes (ex. : eau froide, entretien des
          parties communes, ordures ménagères…) :
          ____________________________________
        </p>
        <p className="mt-1 text-justify">{CIVIL_ART5_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 6 – Dépôt de garantie</h2>
        <p className="mt-1">
          Un dépôt de garantie d&apos;un montant de :{" "}
          <strong>{fmt(l.deposit_cents as number)}</strong> (
          {euros(l.deposit_cents as number)} €) est versé par le Locataire à la
          signature du présent bail. Ce dépôt est destiné à garantir
          l&apos;exécution des obligations du Locataire.
        </p>
        <p className="mt-1">
          Il sera restitué au Locataire dans un délai de ________ jours suivant
          la restitution des clés, déduction faite, le cas échéant, des sommes
          dues au Bailleur au titre de loyers impayés, charges, dégradations ou
          remises en état.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 7 – État des lieux</h2>
        <p className="mt-1 text-justify">{CIVIL_ART7_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 8 – Congé / Résiliation</h2>
        <p className="mt-1 font-semibold">Congé donné par le Locataire :</p>
        <p>
          Le Locataire pourra mettre fin au bail à tout moment, moyennant un
          préavis de : ________ mois, notifié par lettre recommandée avec accusé
          de réception, lettre recommandée électronique ou par acte
          d&apos;huissier.
        </p>
        <p className="mt-1 font-semibold">Congé donné par le Bailleur :</p>
        <p>
          Le Bailleur pourra mettre fin au bail à son échéance, moyennant un
          préavis de : ________ mois, notifié par lettre recommandée avec accusé
          de réception, lettre recommandée électronique ou par acte
          d&apos;huissier.
        </p>
        <p className="mt-1 font-semibold">Résiliation pour inexécution :</p>
        <p>
          En cas de manquement grave de l&apos;une ou l&apos;autre des parties à
          ses obligations (notamment en cas de non-paiement du loyer), le présent
          bail pourra être résilié de plein droit, après mise en demeure restée
          sans effet pendant ________ jours.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 9 – Obligations du Bailleur</h2>
        <p className="mt-1">Le Bailleur s&apos;engage à :</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {CIVIL_ART9_ITEMS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 10 – Obligations du Locataire</h2>
        <p className="mt-1">Le Locataire s&apos;engage à :</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {CIVIL_ART10_ITEMS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 11 – Travaux</h2>
        <p className="mt-1 text-justify">{CIVIL_ART11_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 12 – Assurances</h2>
        <p className="mt-1 text-justify">{CIVIL_ART12_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 13 – Clause résolutoire</h2>
        <p className="mt-1 text-justify">{CIVIL_ART13_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 14 – Attribution de juridiction</h2>
        <p className="mt-1 text-justify">
          {CIVIL_ART14_TEXT} Soit le Tribunal judiciaire de :{" "}
          <strong>{blank(d.jurisdictionCity)}</strong>.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 15 – Clauses particulières</h2>
        <p className="mt-1">
          Les parties conviennent des clauses particulières suivantes (à
          compléter ou rayer si néant) :
        </p>
        <p className="mt-1">____________________________________</p>
        <p className="mt-1">____________________________________</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase">Annexes</h2>
        <p className="mt-1">
          Sont annexés au présent bail et en font partie intégrante :
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {CIVIL_ANNEXES_ITEMS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase">Signatures</h2>
        <p className="mt-2">
          Fait à <strong>{blank(d.jurisdictionCity)}</strong>, le{" "}
          <strong>{fmtDate(new Date().toISOString())}</strong>
        </p>
        <p className="mt-1 text-[11px] text-slate-700">{CIVIL_SIGN_NOTE}</p>

        <div className="mt-8 grid grid-cols-2 gap-12">
          <div>
            <p className="font-semibold">Le Bailleur</p>
            <p className="mt-1 text-[10px] italic text-slate-500">
              (Signature précédée de la mention « Lu et approuvé »)
            </p>
            <div className="mt-12 h-px border-b border-slate-300" />
          </div>
          <div>
            <p className="font-semibold">Le(s) Locataire(s)</p>
            <p className="mt-1 text-[10px] italic text-slate-500">
              (Signature précédée de la mention « Lu et approuvé »)
            </p>
            <div className="mt-12 h-px border-b border-slate-300" />
          </div>
        </div>
      </section>
    </article>
  );
}
