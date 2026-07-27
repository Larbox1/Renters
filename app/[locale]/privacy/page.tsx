import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

// The privacy policy is governed by French law (RGPD / loi Informatique et
// Libertés); the French text is the authoritative version and is shown as-is
// on both locales.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.privacyTitle,
    description: dict.meta.privacyDescription,
  };
}

// A block is either a paragraph (string, \n renders as a line break) or a
// bulleted list ({ list: [...] }).
type Block = string | { list: string[] };

const SECTIONS: { title: string; blocks: Block[] }[] = [
  {
    title: "1. Responsable du traitement",
    blocks: [
      "Le responsable du traitement des données personnelles collectées via le service Meskasas (meskasas.com) est Daïa Group, dont les coordonnées complètes figurent dans les Mentions légales.",
      "Aucun délégué à la protection des données (DPO) n'a été désigné, la société ne remplissant pas les critères de désignation obligatoire prévus à l'article 37 du RGPD.",
      "Pour toute question relative à la présente politique ou à l'exercice de vos droits, contactez-nous à l'adresse suivante : contact@meskasas.com.",
    ],
  },
  {
    title: "2. Données collectées",
    blocks: [
      "Dans le cadre de la fourniture du service, nous sommes amenés à traiter les catégories de données suivantes :",
      {
        list: [
          "Données de compte : adresse e-mail, nom et prénom, collectés lors de la création du compte. L'authentification est gérée via Supabase Auth (mécanisme e-mail / mot de passe).",
          "Données de gestion locative : informations relatives aux biens immobiliers, aux locataires (nom, prénom, adresse, e-mail, numéro de téléphone), aux baux, aux paiements de loyer et aux ordres de travaux. Ces données sont saisies librement par l'utilisateur (voir section 4 — rôle de l'utilisateur en tant que responsable de traitement).",
          "Documents générés : contenus HTML des baux, quittances et autres documents générés via l'application, stockés en base de données.",
          "Données de contact : nom, adresse e-mail et contenu du message transmis via le formulaire de contact du site.",
          "Données techniques et de mesure d'audience : adresse IP, type de navigateur et de système d'exploitation, pages consultées, durée des sessions, source du trafic (campagnes publicitaires, mots-clés référents). Ces données ne sont collectées à des fins analytiques ou publicitaires qu'avec votre consentement préalable via le bandeau de cookies. Lorsque vous y consentez, elles sont traitées via Google Analytics 4 (mesure d'audience pseudonymisée avec anonymisation IP activée) et Google Ads (mesure de l'efficacité des campagnes via un identifiant publicitaire). Les journaux serveurs essentiels (adresse IP, requêtes) peuvent être conservés à des fins de sécurité sans consentement, sur la base de l'intérêt légitime.",
          "Données de l'assistant IA : historique des conversations échangées avec l'assistant IA immobilier intégré à l'application. Ces échanges sont transmis à Anthropic, PBC pour la génération des réponses et ne sont pas conservés par Anthropic au-delà du traitement de la requête.",
          "Documents téléversés pour analyse par IA : lorsque vous utilisez une fonctionnalité d'import automatique (factures, baux), le document téléversé est transmis à Anthropic, PBC afin d'en extraire les données utiles (montants, dates, caractéristiques du logement et, pour un bail, l'identité des parties). Ces documents peuvent contenir des données concernant des tiers (notamment votre locataire) : il vous appartient de les en informer. Les documents ne sont pas conservés par Anthropic au-delà du traitement de la requête ; le fichier importé est ensuite stocké dans votre espace privé Meskasas.",
        ],
      },
      "Nous ne collectons aucune donnée dite « sensible » au sens de l'article 9 du RGPD (origine ethnique, opinions politiques, données de santé, etc.).",
    ],
  },
  {
    title: "3. Finalités et bases légales",
    blocks: [
      "Le tableau ci-dessous détaille les finalités de traitement et leur base légale au sens de l'article 6 du RGPD :",
      {
        list: [
          "Fourniture du service de gestion locative — Base légale : exécution du contrat (art. 6.1.b). Comprend la création et la gestion du compte, l'accès aux fonctionnalités de gestion des biens, locataires, baux et paiements.",
          "Génération et stockage de documents — Base légale : exécution du contrat (art. 6.1.b). Les documents générés (baux, quittances) sont stockés pour permettre leur consultation ultérieure et leur envoi.",
          "Gestion de l'abonnement et facturation — Base légale : exécution du contrat (art. 6.1.b) et obligation légale pour la conservation des pièces comptables (art. 6.1.c).",
          "Traitement des demandes de contact — Base légale : intérêt légitime (art. 6.1.f), à savoir répondre aux sollicitations des utilisateurs et prospects.",
          "Cookies analytiques et mesure d'audience — Base légale : consentement (art. 6.1.a). Ces traitements ne sont activés qu'après votre acceptation explicite.",
          "Sécurité et prévention des fraudes — Base légale : intérêt légitime (art. 6.1.f), à savoir assurer l'intégrité et la sécurité du service.",
          "Amélioration du service — Base légale : intérêt légitime (art. 6.1.f), dans la mesure où l'amélioration bénéficie directement aux utilisateurs et n'empiète pas sur leurs droits fondamentaux.",
          "Conservation des données comptables — Base légale : obligation légale (art. 6.1.c), notamment les obligations de conservation prévues par la réglementation fiscale et comptable applicable (10 ans).",
        ],
      },
    ],
  },
  {
    title: "4. Rôle de l'utilisateur en tant que responsable de traitement",
    blocks: [
      "Lorsqu'un bailleur (utilisateur de Meskasas) saisit des données personnelles relatives à ses locataires (nom, prénom, adresse, e-mail, téléphone, etc.) dans l'application, il agit en qualité de responsable du traitement au sens de l'article 4 du RGPD pour ces données. Daïa Group agit alors en qualité de sous-traitant au sens de l'article 28 du RGPD, en traitant ces données pour le compte et sur instruction de l'utilisateur.",
      "En conséquence, il appartient à l'utilisateur de :",
      {
        list: [
          "Informer ses locataires du traitement de leurs données personnelles, conformément aux articles 13 et 14 du RGPD ;",
          "S'assurer de disposer d'une base légale valide pour le traitement des données de ses locataires (exécution du contrat de bail, obligation légale, etc.) ;",
          "Répondre aux demandes d'exercice de droits formulées par ses locataires (accès, rectification, effacement, etc.) ;",
          "Ne pas saisir dans l'application des données inutiles ou disproportionnées au regard de la gestion locative.",
        ],
      },
      "Meskasas n'utilise pas les données des locataires à d'autres fins que la fourniture du service à l'utilisateur.",
      "Engagements de Meskasas en tant que sous-traitant (article 28 du RGPD) : les présentes dispositions constituent l'accord de sous-traitance entre l'utilisateur (responsable de traitement) et Meskasas (sous-traitant) pour le traitement des données des locataires. À ce titre, Meskasas s'engage à :",
      {
        list: [
          "Ne traiter les données des locataires que sur instruction documentée de l'utilisateur, dans le cadre strict de la fourniture du Service ;",
          "Garantir que les personnes autorisées à traiter les données sont soumises à une obligation de confidentialité ;",
          "Mettre en œuvre les mesures techniques et organisationnelles de sécurité décrites à la section 9 de la présente politique ;",
          "Ne pas faire appel à un autre sous-traitant sans en informer l'utilisateur (la liste des sous-traitants figure à la section 6) ;",
          "Assister l'utilisateur, dans la mesure du possible, dans le traitement des demandes d'exercice de droits formulées par ses locataires ;",
          "Notifier l'utilisateur sans délai indu en cas de violation de données concernant les données de ses locataires ;",
          "Supprimer les données des locataires dans un délai de 30 jours suivant la suppression du compte de l'utilisateur, sauf obligation légale de conservation.",
        ],
      },
    ],
  },
  {
    title: "5. Durée de conservation",
    blocks: [
      "Les données sont conservées selon les durées suivantes :",
      {
        list: [
          "Données de compte (e-mail, nom, prénom) : conservées pendant toute la durée de vie du compte, puis supprimées dans un délai de 30 jours après la suppression du compte. En cas d'inactivité prolongée d'un compte au plan Gratuit, une procédure automatisée désactive le compte après 120 jours sans connexion (cycle de notifications préalables à 60, 90 et 120 jours), puis supprime définitivement l'ensemble des données 12 mois après la dernière connexion.",
          "Données de gestion locative (biens, locataires, baux, paiements) : conservées pendant toute la durée de vie du compte. En cas de suppression du compte, ces données sont supprimées dans un délai de 30 jours.",
          "Documents générés : conservés pendant toute la durée de vie du compte et supprimés lors de la suppression du compte (délai de 30 jours).",
          "Données de contact (formulaire) : conservées pendant 12 mois à compter de la réception du message.",
          "Données techniques et analytiques : conservées pour une durée maximale de 13 mois à compter de leur collecte, conformément aux recommandations de la CNIL.",
          "Données comptables et de facturation : conservées pendant 10 ans à compter de leur émission, en application de l'obligation légale de conservation des pièces comptables.",
          "Conversations avec l'assistant IA : stockées en session pour la durée de la conversation. Elles ne sont pas conservées de manière permanente après déconnexion.",
        ],
      },
    ],
  },
  {
    title: "6. Sous-traitants et destinataires",
    blocks: [
      "Vos données ne sont jamais vendues à des tiers. Dans le cadre strict de la fourniture du service, nous faisons appel aux sous-traitants techniques suivants :",
      {
        list: [
          "Vercel, Inc. (États-Unis) — hébergement CDN du site web, protection DDoS et optimisation des performances. Vercel traite les requêtes réseau et peut avoir accès aux adresses IP des visiteurs.",
          "Supabase, Inc. (États-Unis — données hébergées en France, région AWS eu-west-3 Paris) — base de données relationnelle, authentification des utilisateurs, fonctions serveur (Edge Functions). L'ensemble des données utilisateurs est stocké sur des serveurs situés en France.",
          "Resend, Inc. (États-Unis) — envoi des e-mails transactionnels (confirmation de compte, notifications de loyers, envoi de documents). Resend traite les adresses e-mail des destinataires ainsi que le contenu des messages envoyés.",
          "Anthropic, PBC (États-Unis) — traitement des requêtes de l'assistant IA immobilier et analyse des documents téléversés via les fonctionnalités d'import automatique (factures, baux). Les conversations et documents sont transmis à Anthropic pour la génération des réponses ou l'extraction des données, et ne sont pas conservés par Anthropic au-delà du traitement immédiat de la requête.",
          "Stripe, Inc. (États-Unis — certifié EU-US Data Privacy Framework) — traitement des paiements par carte bancaire. Stripe traite les données de paiement (numéro de carte, date d'expiration) directement, sans qu'Meskasas n'y ait accès ni ne les stocke. Les données de facturation (montant, date, statut) sont conservées par Meskasas.",
          "Google Ireland Limited (Irlande, filiale européenne de Google LLC, certifiée EU-US Data Privacy Framework) : mesure d'audience via Google Analytics 4 et mesure de l'efficacité des campagnes publicitaires via Google Ads, uniquement après votre consentement explicite via le bandeau de cookies. Google traite les données techniques de navigation (adresse IP anonymisée, identifiant client_id, pages consultées) et les événements de conversion (création de compte, abonnement payant). Aucun de ces traitements n'a lieu sans consentement préalable.",
          "Meta Platforms Ireland Limited (Irlande, filiale européenne de Meta Platforms, Inc., certifiée EU-US Data Privacy Framework) : mesure de l'efficacité des campagnes publicitaires via le pixel Meta (Facebook/Instagram) et l'API Conversions, uniquement après votre consentement explicite via le bandeau de cookies. Meta traite les données techniques de navigation (cookies _fbp et _fbc, adresse IP, identifiant fbclid) et les événements de conversion (création de compte, abonnement payant). Pour améliorer la correspondance, votre adresse e-mail est partagée sous forme hachée (SHA-256, jamais en clair) via l'API Conversions, uniquement avec votre consentement. Aucun de ces traitements n'a lieu sans consentement préalable.",
        ],
      },
      "Cette liste est tenue à jour. Toute modification substantielle sera reflétée dans la présente politique.",
    ],
  },
  {
    title: "7. Transferts hors Espace Économique Européen",
    blocks: [
      "Les données utilisateurs sont hébergées en France (région AWS eu-west-3, Paris) via Supabase. Toutefois, plusieurs de nos sous-traitants sont établis aux États-Unis, ce qui implique des transferts de données hors de l'Espace Économique Européen (EEE) pour certaines opérations de traitement.",
      "Ces transferts sont encadrés par les garanties appropriées suivantes :",
      {
        list: [
          "EU-US Data Privacy Framework (DPF) : pour les sous-traitants certifiés auprès du Department of Commerce américain dans le cadre du DPF, reconnu adéquat par la Commission européenne (décision du 10 juillet 2023).",
          "Clauses contractuelles types (CCT) : adoptées par la Commission européenne, intégrées dans les contrats de sous-traitance pour les transferts vers des pays tiers ne bénéficiant pas d'une décision d'adéquation.",
        ],
      },
      "Pour obtenir des informations sur les garanties spécifiques mises en place avec chaque sous-traitant, vous pouvez nous contacter à contact@meskasas.com.",
    ],
  },
  {
    title: "8. Cookies",
    blocks: [
      "Le site meskasas.com utilise des cookies et technologies similaires. Voici les catégories de cookies employées :",
      {
        list: [
          "Cookies essentiels (pas de consentement requis) : ces cookies sont strictement nécessaires au fonctionnement du service. Ils comprennent notamment les jetons de session d'authentification Supabase (JWT) et les cookies de préférences d'interface. Ils ne peuvent pas être désactivés sans affecter le fonctionnement du service. Durée : durée de la session ou 7 jours maximum pour les jetons de rafraîchissement.",
          "Cookies analytiques (consentement requis) : si vous y consentez via le bandeau de cookies, des cookies analytiques sont déposés via Google Analytics 4 afin de mesurer l'audience du site et d'améliorer l'expérience utilisateur. Les données collectées sont pseudonymisées (identifiant client_id, adresse IP anonymisée) et agrégées pour produire des statistiques de navigation. Aucun outil d'analyse n'est activé sans votre consentement préalable. Durée : 13 mois maximum, conformément aux recommandations de la CNIL.",
          "Cookies marketing et de mesure publicitaire (consentement requis) : si vous y consentez via le bandeau de cookies, des cookies sont déposés via Google Ads et le pixel Meta (Facebook/Instagram) pour mesurer l'efficacité de nos campagnes publicitaires et identifier les sources de trafic qui amènent à Meskasas (mesure de conversion). Le pixel Meta dépose les cookies _fbp et _fbc (identification du navigateur et du clic publicitaire). Ces cookies enregistrent l'événement de visite et, le cas échéant, l'événement de conversion (création de compte, souscription d'un abonnement payant). Aucun cookie marketing n'est activé sans votre consentement préalable, et retirer votre consentement arrête immédiatement le pixel Meta. Durée : 13 mois maximum.",
        ],
      },
      "Vous pouvez à tout moment gérer vos préférences en matière de cookies directement depuis les paramètres de votre navigateur (Chrome, Firefox, Safari, Edge…). La désactivation des cookies essentiels peut empêcher l'accès au service.",
    ],
  },
  {
    title: "9. Sécurité",
    blocks: [
      "Daïa Group met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données personnelles :",
      {
        list: [
          "Chiffrement en transit : toutes les communications entre votre navigateur et nos serveurs sont chiffrées via le protocole HTTPS/TLS.",
          "Chiffrement au repos : les données stockées en base de données sont chiffrées au repos.",
          "Row Level Security (RLS) : le moteur de base de données applique des politiques de sécurité par ligne garantissant que chaque utilisateur ne peut accéder qu'à ses propres données, même en cas de requête mal formée.",
          "Authentification sécurisée : l'accès au service repose sur des jetons JWT à durée de vie limitée, gérés par Supabase Auth.",
          "Sauvegardes régulières : des sauvegardes automatiques de la base de données sont effectuées régulièrement afin de garantir la continuité du service en cas d'incident.",
          "Accès restreint aux données de production : l'accès aux environnements de production est limité aux personnes habilitées et soumis à des contrôles d'accès stricts.",
        ],
      },
      "Malgré ces mesures, aucun système d'information n'offre une garantie absolue de sécurité. En cas de violation de données à caractère personnel, Meskasas s'engage à :",
      {
        list: [
          "Notifier la CNIL dans un délai de 72 heures après en avoir pris connaissance, conformément à l'article 33 du RGPD, sauf si la violation n'est pas susceptible d'engendrer un risque pour les droits et libertés des personnes concernées ;",
          "Informer les utilisateurs concernés dans les meilleurs délais lorsque la violation est susceptible d'engendrer un risque élevé pour leurs droits et libertés, conformément à l'article 34 du RGPD ;",
          "Notifier les utilisateurs agissant en qualité de responsable de traitement (bailleurs) sans délai indu lorsque la violation concerne les données de leurs locataires, afin qu'ils puissent remplir leurs propres obligations de notification.",
        ],
      },
    ],
  },
  {
    title: "10. Vos droits",
    blocks: [
      "Conformément au Règlement (UE) 2016/679 (RGPD), vous disposez des droits suivants concernant vos données personnelles :",
      {
        list: [
          "Droit d'accès (art. 15) : vous pouvez obtenir confirmation que des données vous concernant sont traitées et en obtenir une copie.",
          "Droit de rectification (art. 16) : vous pouvez demander la correction de données inexactes ou incomplètes.",
          "Droit à l'effacement (art. 17) : vous pouvez demander la suppression de vos données, sous réserve des obligations légales de conservation.",
          "Droit à la limitation du traitement (art. 18) : vous pouvez demander la suspension temporaire du traitement de vos données dans les cas prévus par le RGPD.",
          "Droit à la portabilité (art. 20) : vous pouvez recevoir vos données dans un format structuré, couramment utilisé et lisible par machine, et les transmettre à un autre responsable de traitement.",
          "Droit d'opposition (art. 21) : vous pouvez vous opposer au traitement de vos données fondé sur l'intérêt légitime, pour des raisons tenant à votre situation particulière.",
          "Droit de retirer votre consentement : lorsque le traitement est fondé sur votre consentement (ex. cookies analytiques), vous pouvez le retirer à tout moment, sans que cela ne remette en cause la licéité des traitements effectués avant ce retrait.",
          "Directives relatives au sort des données après le décès : vous pouvez définir des directives concernant la conservation, l'effacement ou la communication de vos données après votre décès, conformément à l'article 85 de la loi Informatique et Libertés.",
        ],
      },
      "Pour exercer l'un de ces droits, adressez votre demande par e-mail à contact@meskasas.com en précisant votre identité. Nous nous engageons à répondre dans un délai d'un mois à compter de la réception de votre demande. Ce délai peut être prolongé de deux mois en cas de demandes complexes ou nombreuses, auquel cas nous vous en informerons.",
    ],
  },
  {
    title: "11. Droit de réclamation auprès de la CNIL",
    blocks: [
      "Si vous estimez que le traitement de vos données personnelles n'est pas conforme au RGPD, vous avez le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente :",
      "Commission Nationale de l'Informatique et des Libertés (CNIL)\n3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07\nSite web : www.cnil.fr",
    ],
  },
  {
    title: "12. Décisions automatisées",
    blocks: [
      "Meskasas ne procède à aucune prise de décision entièrement automatisée produisant des effets juridiques significatifs vous concernant au sens de l'article 22 du RGPD. L'assistant IA intégré à l'application fournit des suggestions à titre informatif ; toute décision finale demeure du ressort de l'utilisateur.",
    ],
  },
  {
    title: "13. Modification de la présente politique",
    blocks: [
      "La présente politique de confidentialité peut être modifiée à tout moment pour refléter les évolutions légales, réglementaires ou fonctionnelles du service. En cas de modification substantielle, nous vous en informerons par e-mail ou par une notification visible dans l'application au moins 15 jours avant l'entrée en vigueur des modifications. La date de la dernière mise à jour figure en haut de la présente page.",
      "Nous vous encourageons à consulter régulièrement cette page afin de prendre connaissance de la version en vigueur.",
    ],
  },
  {
    title: "14. Contact",
    blocks: [
      "Pour toute question relative à la présente politique de confidentialité ou au traitement de vos données personnelles, vous pouvez nous contacter :",
      {
        list: [
          "Par e-mail : contact@meskasas.com",
          "Via le formulaire de contact du site",
          "Par courrier : Daïa Group, 9 Rue Robert Lavergne 92600 Asnières-sur-Seine, France",
        ],
      },
    ],
  },
];

export default async function PrivacyPage({
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
            Politique de confidentialité
          </h1>
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
                  {section.blocks.map((block, i) =>
                    typeof block === "string" ? (
                      <p
                        key={i}
                        className="whitespace-pre-line text-[14.5px] leading-[1.65] text-ink-2"
                      >
                        {block}
                      </p>
                    ) : (
                      <ul
                        key={i}
                        className="flex list-disc flex-col gap-2 pl-5 text-[14.5px] leading-[1.65] text-ink-2"
                      >
                        {block.list.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
