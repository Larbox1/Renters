// Pure presentational component: renders the Bail commercial 3/6/9 (articles
// L.145-1 et s. du code de commerce) — a faithful reproduction of the
// jelouebien commercial lease template. Used by both the live contract page
// and the server-side PDF renderer. No data fetching, no async — safe for
// renderToStaticMarkup.

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

export function ContractCommercialDocument({ data }: { data: ContractData }) {
  const d = deriveCommercial(data);
  const { p, t, l, ownerProfile } = d;

  return (
    <article className="contract-page mx-auto rounded-md border border-slate-200 bg-white p-10 text-[12px] leading-snug text-slate-900 shadow-sm">
      <header className="text-center">
        <h1 className="text-lg font-bold">Bail commercial</h1>
        <p className="mt-1 text-[10px] italic text-slate-600">
          Bail commercial de neuf ans — régi par les articles L.145-1 et
          suivants du code de commerce
        </p>
      </header>

      <p className="mt-4 text-[10px] italic text-slate-600">{COM_INTRO_NOTICE}</p>

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
            <strong>Téléphone :</strong> {blank(ownerProfile?.phone ?? null)}
          </div>
        </dl>
        <p className="mt-1 italic">Ci-après désigné « le Bailleur », d&apos;une part,</p>

        <p className="mt-4 font-semibold">Et le preneur :</p>
        <dl className="mt-1 space-y-1">
          {d.tenantRep ? (
            <>
              <div>
                <strong>Dénomination sociale :</strong>{" "}
                {blank(d.tenantDisplayName)}
              </div>
              <div>
                Capital social :{" "}
                {fmt(t?.capital_cents as number | null)} — Siège social :{" "}
                {blank(
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
                    .join(", ") || null,
                )}
              </div>
              <div>
                Immatriculée au RCS sous le numéro :{" "}
                {blank(t?.siren as string | null)}
              </div>
              <div>Représentée par {blank(d.tenantRep)}</div>
            </>
          ) : (
            <>
              <div>
                <strong>Nom, Prénom :</strong> {blank(d.tenantDisplayName)}
              </div>
              <div>
                Demeurant :{" "}
                {blank(
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
                    .join(", ") || null,
                )}
              </div>
              <div>
                Profession : {blank(t?.profession as string | null)} —
                Nationalité : {blank(t?.nationality as string | null)}
              </div>
            </>
          )}
          <div>
            Téléphone : {blank((t?.phone as string | null) ?? null)} — Adresse
            e-mail : {blank((t?.email as string | null) ?? null)}
          </div>
        </dl>
        <p className="mt-1 italic">
          Ci-après désigné « le Preneur », d&apos;autre part.
        </p>

        <p className="mt-3 font-semibold uppercase">Il a été convenu ce qui suit :</p>
        <p className="mt-1">
          Par les présentes, {blank(d.ownerName)} fait bail et donne à loyer à{" "}
          {blank(d.tenantDisplayName)}, qui accepte, les lieux ci-après
          désignés, dépendant d&apos;un immeuble dont il est propriétaire à{" "}
          <strong>{blank(d.city)}</strong>.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 1 – Désignation des locaux</h2>
        <p className="mt-2 font-semibold">1.1 Adresse</p>
        <p className="mt-1">
          Le Bailleur donne à bail au Preneur, qui accepte, les locaux ci-après
          désignés : <strong>{blank(d.propertyAddress)}</strong>
        </p>
        <p className="mt-1 text-justify">{COM_ART1_ACCEPT_TEXT}</p>

        <p className="mt-2 font-semibold">1.2 Description des locaux</p>
        <p className="mt-1">
          Description précise des locaux :{" "}
          <strong>{blank(p?.description as string | null)}</strong>
        </p>
        <p className="mt-1">
          Superficie totale :{" "}
          <strong>{blank(p?.surface_sqm as number | null)}</strong> m²
        </p>
        <p className="mt-1">
          Équipements présents dans la location :{" "}
          <strong>{blank(d.equipment)}</strong>
        </p>

        <p className="mt-2 font-semibold">
          1.3 Destination des locaux donnés en location
        </p>
        <p className="mt-1">
          Les locaux loués sont destinés à l&apos;usage de :{" "}
          <strong>{blank(d.activity)}</strong>, à l&apos;exclusion de toute autre
          utilisation.
        </p>
        <p className="mt-1 text-justify">{COM_ART1_DEST_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 2 – Durée</h2>
        <p className="mt-1">
          Le présent bail est consenti et accepté pour une durée de{" "}
          <strong>neuf (9) ans</strong> entières et consécutives qui commencent
          à courir le <strong>{fmtDate(l.start_date as string | null)}</strong>{" "}
          pour se terminer le{" "}
          <strong>{fmtDate(l.end_date as string | null)}</strong>.
        </p>
        <p className="mt-1">Toutefois :</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {COM_ART2_CONGE_ITEMS.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 3 – Charges et conditions</h2>
        <p className="mt-1">{COM_ART3_INTRO}</p>
        <div className="mt-1 space-y-1 text-justify">
          {COM_ART3_ITEMS.map((item, i) => (
            <p key={i}>{item}</p>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 4 – Assurances</h2>
        <div className="mt-1 space-y-1 text-justify">
          {COM_ART4_ITEMS.map((item, i) => (
            <p key={i}>{item}</p>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 5 – Cession</h2>
        <p className="mt-1 text-justify">{COM_ART5_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 6 – Sous-location</h2>
        <p className="mt-1 text-justify">{COM_ART6_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 7 – Loyer</h2>
        <p className="mt-1">
          Le présent bail est consenti et accepté moyennant un loyer annuel hors
          taxes de <strong>{fmt(d.annualRentCents)}</strong>, que le Preneur
          s&apos;oblige à payer au Bailleur par trimestre d&apos;avance (soit{" "}
          {fmt(l.monthly_rent_cents as number)} par mois).
        </p>
        <p className="mt-1">
          Le Preneur réglera au Bailleur, en même temps que le loyer principal,
          la participation aux taxes, charges et prestations afférentes aux
          locaux loués. Toutes sommes dues seront payées par chèque ou virement.
          Tous frais de recouvrement et honoraires de commissaire de justice
          engagés par le Bailleur seront à la charge exclusive du Preneur.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 8 – Option TVA</h2>
        <p className="mt-1 text-justify">{COM_ART8_TVA_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 9 – Révision du loyer</h2>
        <p className="mt-1 text-justify">{COM_ART9_REVISION_TEXT}</p>
        {l.irl_reference ? (
          <p className="mt-1">
            Indice de référence retenu :{" "}
            <strong>{l.irl_reference as string}</strong>
          </p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 10 – Dépôt de garantie</h2>
        <p className="mt-1 text-justify">
          Le Preneur versera au Bailleur, au moment de la signature du présent
          bail, la somme de <strong>{fmt(l.deposit_cents as number)}</strong>{" "}
          correspondant à un trimestre de loyer (soit trois mois) pour garantir
          la bonne exécution des clauses et conditions du présent bail,
          conformément au plafond légal fixé par la loi n° 2026-403 du 26 mai
          2026 (art. L.145-40-5 C. com.). Ce dépôt n&apos;est pas productif
          d&apos;intérêts et sera réajusté à chaque variation du loyer.
          Conformément à l&apos;article L.145-40-6 du code de commerce, le
          Bailleur dispose d&apos;un délai de trois (3) mois à compter de la
          remise des clés pour le restituer.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 11 – Clause résolutoire</h2>
        <p className="mt-1 text-justify">{COM_ART11_RESOLUTOIRE_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 12 – État des lieux</h2>
        <p className="mt-1 text-justify">{COM_ART12_ETAT_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 13 – Restitution des locaux</h2>
        <p className="mt-1 text-justify">{COM_ART13_RESTITUTION_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 14 – Réglementation</h2>
        <p className="mt-1">{COM_ART14_REGLEMENTATION_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 15 – Frais et enregistrement</h2>
        <p className="mt-1 text-justify">{COM_ART15_FRAIS_TEXT}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Article 16 – Élection de domicile</h2>
        <p className="mt-1">
          Pour l&apos;exécution des présentes, et notamment la signification de
          tous actes, le Preneur fait élection de domicile dans les lieux loués.
          Le Bailleur fait élection de domicile à{" "}
          <strong>{blank(d.ownerAddress)}</strong>.
        </p>
      </section>

      <section className="mt-8">
        <p>
          Fait à <strong>{blank(d.city)}</strong>, le{" "}
          <strong>{fmtDate(new Date().toISOString())}</strong>, en deux (2)
          exemplaires originaux.
        </p>
        <p className="mt-1 text-[11px] text-slate-700">{COM_SIGN_NOTE}</p>

        <div className="mt-8 grid grid-cols-2 gap-12">
          <div>
            <p className="font-semibold">Le Bailleur</p>
            <p className="mt-1 text-[10px] italic text-slate-500">
              (Mention « Lu et approuvé »)
            </p>
            <div className="mt-12 h-px border-b border-slate-300" />
          </div>
          <div>
            <p className="font-semibold">Le Preneur</p>
            <p className="mt-1 text-[10px] italic text-slate-500">
              (Mention « Lu et approuvé »)
            </p>
            <div className="mt-12 h-px border-b border-slate-300" />
          </div>
        </div>
      </section>
    </article>
  );
}
