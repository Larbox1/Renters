import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

// The legal notice is governed by French law (LCEN); the French text is the
// authoritative version and is shown as-is on both locales.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.legalNoticeTitle,
    description: dict.meta.legalNoticeDescription,
  };
}

const SECTIONS: { title: string; blocks: string[] }[] = [
  {
    title: "1. Éditeur du site",
    blocks: [
      "Daia Group, une société à responsabilité limitée de droit français.\nSiège social : 9 Rue Robert Lavergne 92600 Asnières-sur-Seine, France\nCapital social : 100 EUR\nImmatriculée au RCS de Nanterre sous le numéro 952 899 391, Ayant pour numéro d'identification SIRET 952 899 391 00017\nN° de TVA intracommunautaire : FR30952899391",
      "Contact : contact@meskasas.com",
    ],
  },
  {
    title: "2. Directeur de la publication",
    blocks: [
      "Le directeur de la publication du site meskasas.com est Larbi HOUTIA, agissant en qualité de représentant légal de Daïa Group",
    ],
  },
  {
    title: "3. Hébergement",
    blocks: [
      "Hébergement du site (CDN et distribution)\nVercel, Inc.\nFrance Office: 102 Avenue des Champs-Élysées, 75008 Paris, France\nvercel.com",
      "Hébergement des données et services backend\nSupabase, Inc.\n970 Toa Payoh North, #07-04, Singapore 318992\nsupabase.com\nLes données des utilisateurs sont hébergées en France (région Europe de l'Ouest — Paris).",
    ],
  },
  {
    title: "4. Propriété intellectuelle",
    blocks: [
      "L'ensemble des éléments constituant le site meskasas.com — textes, graphismes, logotypes, icônes, images, logiciels, bases de données et mises en page — est la propriété exclusive de Daïa Group ou fait l'objet d'une licence d'utilisation accordée à celle-ci.",
      "Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, par quelque procédé que ce soit, sans l'autorisation écrite préalable de l'éditeur, est strictement interdite et constitue une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la propriété intellectuelle français.",
    ],
  },
  {
    title: "5. Données personnelles",
    blocks: [
      "Meskasas collecte et traite des données à caractère personnel dans le cadre de la fourniture de ses services. Ces traitements sont effectués conformément au Règlement (UE) 2016/679 du Parlement européen et du Conseil (RGPD) et à la loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés (loi Informatique et Libertés).",
      "Les informations détaillées sur la nature des données collectées, les finalités de traitement, les durées de conservation, les droits des utilisateurs et les modalités de leur exercice sont disponibles dans notre Politique de confidentialité.",
      "Pour toute demande relative à vos données personnelles (accès, rectification, effacement, portabilité, limitation, opposition) : contact@meskasas.com.",
    ],
  },
  {
    title: "6. Cookies",
    blocks: [
      "Le site meskasas.com est susceptible d'utiliser des cookies et technologies de traçage afin d'assurer le bon fonctionnement du service et, le cas échéant, de mesurer l'audience. Les informations relatives aux cookies utilisés, à leur finalité et aux moyens de les refuser sont détaillées dans notre Politique de confidentialité, section Cookies.",
      "Conformément à la recommandation de la CNIL, votre consentement est recueilli avant tout dépôt de cookie non strictement nécessaire au fonctionnement du service.",
    ],
  },
  {
    title: "7. Limitation de responsabilité",
    blocks: [
      "Le site meskasas.com est fourni « en l'état », sans garantie d'aucune sorte, expresse ou implicite. L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées, mais ne peut garantir leur exhaustivité, leur exactitude ou leur adéquation à un usage particulier.",
      "L'éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'accès au site, de son utilisation ou de l'impossibilité d'y accéder, ni des erreurs ou omissions dans son contenu.",
      "Les informations diffusées sur les pages publiques d'information du site (notamment celles relatives à l'encadrement des loyers, à l'indice de référence des loyers, aux charges récupérables, aux transactions immobilières et aux simulateurs) sont mises à disposition à titre informatif sur la base des sources officielles (arrêtés préfectoraux, INSEE, Légifrance, Open Data) disponibles à leur date de mise à jour. L'éditeur ne garantit pas leur exactitude, leur exhaustivité ou leur actualité, et invite tout visiteur à vérifier ces informations auprès des sources officielles ou d'un professionnel compétent (avocat, notaire, expert-comptable) avant toute décision. La limitation de responsabilité applicable à ces informations est détaillée à la section 12 des Conditions générales d'utilisation.",
      "Les documents générés par le service (baux, quittances, courriers) sont fournis à titre informatif et d'aide à la rédaction. Ils ne constituent pas un conseil juridique et ne sauraient se substituer à l'avis d'un professionnel du droit. L'éditeur décline toute responsabilité quant à leur utilisation dans un cadre juridique ou contentieux.",
    ],
  },
  {
    title: "8. Liens hypertextes",
    blocks: [
      "Le site meskasas.com peut contenir des liens hypertextes vers des sites tiers. Ces liens sont fournis à titre indicatif. L'éditeur n'exerce aucun contrôle sur le contenu de ces sites et ne peut être tenu responsable des informations qui y figurent, ni des pratiques de collecte de données personnelles qui y sont appliquées.",
      "La création de liens hypertextes vers le site meskasas.com est autorisée sous réserve de ne pas porter atteinte à l'image de l'éditeur et de ne pas associer le site à des contenus illicites ou répréhensibles.",
    ],
  },
  {
    title: "9. Hébergement de contenus utilisateurs (LCEN)",
    blocks: [
      "Au sens de l'article 6-I-2 de la loi n°2004-575 du 21 juin 2004 (LCEN), Meskasas agit en qualité d'hébergeur pour les contenus saisis, importés ou générés par les utilisateurs dans le cadre de l'utilisation du service (données de biens, locataires, documents générés, etc.).",
      "À ce titre, Meskasas n'est soumis à aucune obligation générale de surveillance des contenus hébergés. Toutefois, conformément à la loi, Meskasas s'engage à retirer promptement tout contenu manifestement illicite porté à sa connaissance. Toute notification de contenu illicite peut être adressée à contact@meskasas.com.",
    ],
  },
  {
    title: "10. Crédits",
    blocks: ["Développé avec React, Supabase et TailwindCSS."],
  },
  {
    title: "11. Droit applicable et juridiction compétente",
    blocks: [
      "Les présentes mentions légales sont régies par le droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.",
      "Pour les litiges de consommation, le Tribunal judiciaire de Paris est compétent.",
    ],
  },
];

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="bg-paper text-ink">
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-[760px] px-7">
          <h1 className="font-semibold tracking-[-0.028em] text-ink text-[34px] leading-[1.05] sm:text-[42px]">
            Mentions légales
          </h1>
          <p className="mt-5 text-[15px] leading-[1.6] text-ink-2">
            Conformément à l&apos;article 6 II de la loi n°2004-575 du 21 juin
            2004 pour la confiance dans l&apos;économie numérique (LCEN).
          </p>
          <p className="mt-3 text-[13.5px] text-ink-3">
            Dernière mise à jour : 27 Juillet 2026
          </p>

          <div className="mt-12 flex flex-col gap-10">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  {section.title}
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  {section.blocks.map((block, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-line text-[14.5px] leading-[1.65] text-ink-2"
                    >
                      {block}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
