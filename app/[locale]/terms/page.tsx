import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

// The terms of use are governed by French law; the French text is the
// authoritative version (see section 22) and is shown as-is on both locales.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.termsTitle,
    description: dict.meta.termsDescription,
  };
}

// A block is either a paragraph (string, \n renders as a line break) or a
// bulleted list ({ list: [...] }).
type Block = string | { list: string[] };

const SECTIONS: { title: string; blocks: Block[] }[] = [
  {
    title: "Préambule — Éditeur du service",
    blocks: [
      "Le service Meskasas, accessible à l'adresse meskasas.com, est édité par Daïa Group (ci-après « Meskasas »). Les coordonnées complètes de l'éditeur figurent dans les Mentions légales.",
    ],
  },
  {
    title: "1. Objet",
    blocks: [
      "Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles Daïa Group (ci-après « Meskasas ») met à disposition des utilisateurs le service Meskasas, ainsi que les droits et obligations des parties dans ce cadre.",
      "Toute utilisation du Service, quelle qu'elle soit, implique l'acceptation sans réserve des présentes CGU. Ces dernières prévalent sur tout autre document, sauf accord particulier conclu par écrit entre Meskasas et l'utilisateur.",
    ],
  },
  {
    title: "2. Définitions",
    blocks: [
      {
        list: [
          "« Service » : désigne la plateforme SaaS Meskasas, accessible via le site meskasas.com et ses sous-domaines, incluant l'ensemble des fonctionnalités, APIs, contenus et outils mis à disposition.",
          "« Utilisateur » : désigne toute personne physique ou morale (propriétaire bailleur, SCI, gestionnaire immobilier, etc.) ayant créé un Compte et utilisant le Service.",
          "« Visiteur » : désigne toute personne consultant le site meskasas.com sans être titulaire d'un Compte, notamment lors de la consultation des Pages publiques d'information.",
          "« Pages publiques d'information » : désigne les pages du site meskasas.com librement accessibles sans inscription, comprenant notamment les pages relatives à l'encadrement des loyers, à l'indice de référence des loyers (IRL), aux charges récupérables, aux transactions immobilières (DVF), aux simulateurs (rendement locatif, nu vs meublé, encadrement), ainsi qu'aux articles du blog et aux modèles de documents en accès libre.",
          "« Compte » : désigne l'espace personnel créé par l'Utilisateur lors de son inscription, accessible par des identifiants.",
          "« Contenu Utilisateur » : désigne l'ensemble des données, informations et fichiers saisis, importés ou générés par l'Utilisateur dans le cadre de l'utilisation du Service (données de biens, de locataires, informations financières, etc.).",
          "« Documents Générés » : désigne les documents locatifs produits à partir des modèles fournis par le Service (baux, quittances, états des lieux, attestations, avenants, etc.).",
          "« Abonnement » : désigne le contrat par lequel l'Utilisateur souscrit à un plan tarifaire donnant accès à tout ou partie des fonctionnalités du Service.",
          "« Données Personnelles » : désigne toute information au sens du Règlement (UE) 2016/679 (RGPD) et de la loi Informatique et Libertés.",
        ],
      },
    ],
  },
  {
    title: "3. Acceptation des CGU",
    blocks: [
      "En créant un Compte ou en utilisant le Service, l'Utilisateur reconnaît avoir lu, compris et accepté sans réserve les présentes CGU dans leur intégralité, ainsi que la Politique de confidentialité de Meskasas.",
      "La consultation du site meskasas.com, notamment des Pages publiques d'information, par toute personne (Visiteur ou Utilisateur) implique l'acceptation pleine et entière des présentes CGU et de la Politique de confidentialité. Le Visiteur est réputé en avoir pris connaissance et les avoir acceptées du seul fait de cette consultation, les présentes CGU étant accessibles depuis le pied de page de toutes les pages du site.",
      "Si l'Utilisateur agit au nom d'une personne morale (SCI, société de gestion, etc.), il déclare disposer des pouvoirs nécessaires pour engager ladite personne morale.",
      "L'utilisation du Service est réservée aux personnes ayant la capacité juridique de conclure des contrats. Les mineurs ne sont pas autorisés à créer un Compte.",
    ],
  },
  {
    title: "4. Inscription et compte",
    blocks: [
      "L'accès au Service nécessite la création d'un Compte. Lors de l'inscription, l'Utilisateur s'engage à fournir des informations exactes, complètes et à jour. Toute communication d'informations fausses ou trompeuses peut entraîner la suspension ou la résiliation immédiate du Compte.",
      "L'Utilisateur est seul responsable de la confidentialité de ses identifiants (adresse e-mail et mot de passe). Il s'engage à ne pas les divulguer à des tiers et à notifier immédiatement Meskasas à l'adresse contact@meskasas.com de tout accès non autorisé à son Compte ou de toute suspicion de compromission de ses identifiants.",
      "Chaque Utilisateur ne peut créer qu'un seul Compte personnel. La création de plusieurs comptes dans le but de contourner les limitations d'un plan tarifaire est strictement interdite.",
      "Meskasas se réserve le droit de refuser la création d'un Compte ou de résilier un Compte existant, notamment en cas de violation des présentes CGU.",
    ],
  },
  {
    title: "5. Description du service",
    blocks: [
      "Meskasas est une plateforme SaaS de gestion locative destinée aux propriétaires bailleurs, SCI et gestionnaires immobiliers. Le Service comprend notamment :",
      {
        list: [
          "La gestion de biens immobiliers (création de fiches bien, suivi des caractéristiques, photos) ;",
          "La gestion des locataires (fiches locataires, historique, contacts) ;",
          "La génération de documents locatifs à partir de modèles préformatés (contrats de bail, quittances de loyer, états des lieux d'entrée et de sortie, avenants, attestations d'assurance, actes de cautionnement, etc.) ;",
          "Le suivi financier des loyers, charges, paiements et impayés ;",
          "La révision des loyers selon l'Indice de Référence des Loyers (IRL) ;",
          "Des outils d'analyse du marché immobilier local ;",
          "Un assistant IA immobilier fournissant des informations générales ;",
          "L'envoi de documents par e-mail aux locataires.",
        ],
      },
      "Meskasas se réserve le droit de faire évoluer le Service, d'ajouter, modifier ou supprimer des fonctionnalités à tout moment, sans préavis particulier sauf impact substantiel sur les fonctionnalités payantes en cours d'abonnement.",
    ],
  },
  {
    title: "6. Documents générés — Avertissement important",
    blocks: [
      "Les Documents Générés par le Service sont fournis à titre d'outils informatifs et pratiques uniquement. Ils ne constituent en aucun cas un conseil juridique, fiscal ou professionnel.",
      "Les modèles de documents mis à disposition sont des exemples génériques qui peuvent ne pas être adaptés à la situation particulière de chaque Utilisateur, à la réglementation applicable à son bien ou à sa localisation géographique, ni aux évolutions législatives ou jurisprudentielles récentes.",
      "Il appartient à l'Utilisateur, sous sa seule responsabilité, de vérifier l'adéquation de chaque document à sa situation spécifique, de le compléter et de l'adapter si nécessaire, en se faisant assister le cas échéant par un professionnel du droit (avocat, notaire, agent immobilier titulaire d'une carte professionnelle, etc.).",
      "Meskasas décline toute responsabilité quant à la validité juridique des Documents Générés, à leur opposabilité, à leur conformité avec la réglementation en vigueur, ainsi qu'aux conséquences de toute nature résultant de leur utilisation.",
      "Les Documents Générés ne se substituent pas à une consultation avec un professionnel qualifié, particulièrement pour des situations complexes (baux commerciaux, colocations atypiques, régimes spéciaux, contentieux en cours, etc.).",
    ],
  },
  {
    title: "7. Assistant IA immobilier",
    blocks: [
      "Le Service intègre un assistant conversationnel basé sur l'intelligence artificielle (ci-après « Assistant IA »), développé à partir de l'API Anthropic Claude. L'Assistant IA a pour vocation de fournir des informations générales sur la gestion locative, la réglementation immobilière et les pratiques du secteur.",
      "L'Assistant IA ne fournit pas de conseil juridique, fiscal, financier ou professionnel. Ses réponses sont générées automatiquement et peuvent contenir des inexactitudes, des erreurs ou des informations obsolètes. Les informations fournies par l'Assistant IA ne sauraient en aucun cas engager la responsabilité de Meskasas.",
      "L'Utilisateur est seul responsable de l'usage qu'il fait des informations fournies par l'Assistant IA. Il lui appartient de vérifier toute information auprès de sources officielles ou de professionnels compétents avant de prendre toute décision.",
      "Les conversations avec l'Assistant IA peuvent être utilisées à des fins d'amélioration du Service, dans le respect de la Politique de confidentialité.",
    ],
  },
  {
    title: "8. Abonnements et tarifs",
    blocks: [
      "Le Service est accessible selon les plans tarifaires suivants :",
      {
        list: [
          "Gratuit : gratuit, limité à 1 bien immobilier ;",
          "Plus : 9,90 € HT/mois ;",
          "Pro : 14,90 € HT/mois ;",
          "Illimité : 39,90 € HT/mois.",
        ],
      },
      "Les caractéristiques détaillées de chaque plan (nombre de biens, fonctionnalités incluses, limites) sont décrites sur la page tarifaire du site meskasas.com. Meskasas se réserve le droit de modifier ses tarifs et l'offre de plans à tout moment. Les modifications tarifaires sont notifiées aux Utilisateurs concernés avec un préavis minimum de 30 jours et prennent effet à l'échéance de la période en cours.",
      "Les abonnements payants sont conclus pour une durée mensuelle et se renouvellent automatiquement par tacite reconduction à l'expiration de chaque période, sauf résiliation préalable par l'Utilisateur. Le prélèvement est effectué en début de chaque période.",
      "Toute période entamée est intégralement due. En cas de résiliation en cours de période, l'Utilisateur conserve l'accès aux fonctionnalités de son plan jusqu'à la fin de la période déjà facturée, sans remboursement au prorata.",
      "La résiliation d'un abonnement payant peut être effectuée à tout moment depuis les paramètres du Compte. Elle prend effet à la fin de la période en cours. L'Utilisateur conservera un accès au plan Gratuit après résiliation.",
      "Le paiement s'effectue par carte bancaire via le prestataire de paiement sécurisé intégré au Service. Meskasas ne stocke pas les données de carte bancaire de l'Utilisateur.",
    ],
  },
  {
    title: "9. Droit de rétractation",
    blocks: [
      "Conformément aux articles L221-18 et suivants du Code de la consommation, l'Utilisateur consommateur (personne physique agissant à titre non professionnel) dispose d'un délai de 14 jours calendaires à compter de la souscription d'un abonnement payant pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.",
      "Pour exercer ce droit, l'Utilisateur doit notifier sa décision de rétractation à Meskasas avant l'expiration du délai de 14 jours, par e-mail à contact@meskasas.com ou par tout autre moyen permettant d'attester de la date d'envoi.",
      "Exception : conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de contenu numérique non fourni sur support matériel dont l'exécution a commencé avant la fin du délai de rétractation, avec l'accord préalable exprès de l'Utilisateur et sa renonciation expresse à son droit de rétractation. En souscrivant un abonnement payant et en commençant à utiliser le Service (notamment en générant ou téléchargeant des documents) pendant le délai de rétractation, l'Utilisateur reconnaît expressément renoncer à son droit de rétractation pour la part de service déjà fournie.",
      "Ce droit de rétractation ne s'applique pas aux Utilisateurs agissant dans le cadre de leur activité professionnelle.",
      "Formulaire type de rétractation (conformément à l'annexe de l'article R221-1 du Code de la consommation) :\nÀ l'attention de Meskasas — contact@meskasas.com :\nJe vous notifie par la présente ma rétractation du contrat portant sur la fourniture du service Meskasas.\nSouscrit le : [date]\nNom de l'Utilisateur : [nom]\nAdresse e-mail du compte : [e-mail]\nDate : [date]\nSignature (uniquement en cas de notification sur papier) : [signature]",
    ],
  },
  {
    title: "10. Obligations de l'utilisateur",
    blocks: [
      "L'Utilisateur s'engage à :",
      {
        list: [
          "Fournir lors de l'inscription et maintenir à jour des informations exactes, complètes et véridiques ;",
          "Utiliser le Service conformément à la législation et réglementation française et européenne en vigueur ;",
          "Ne pas utiliser le Service à des fins frauduleuses, illicites, ou contraires à l'ordre public ou aux bonnes mœurs ;",
          "Ne pas tenter d'accéder, sans autorisation, à des parties du Service qui ne lui sont pas destinées, ni aux comptes d'autres Utilisateurs ;",
          "Ne pas utiliser de robots, scrapers, outils automatisés ou tout autre moyen pour extraire massivement des données du Service ;",
          "Ne pas procéder à de l'ingénierie inverse (reverse engineering), décompiler ou désassembler tout ou partie du Service ou des logiciels sous-jacents ;",
          "Ne pas reproduire, distribuer, revendre ou céder à titre onéreux ou gratuit les modèles de documents fournis par le Service ;",
          "Ne pas partager ses identifiants de connexion avec des tiers, ni permettre à des tiers d'accéder à son Compte ;",
          "Respecter les droits des tiers, notamment les droits de propriété intellectuelle, le droit à l'image et le droit à la vie privée ;",
          "Ne pas introduire dans le Service de virus, malwares, chevaux de Troie ou tout autre code malveillant susceptible de perturber ou endommager le Service ou les systèmes de Meskasas ;",
          "Ne pas uploader, transmettre ou stocker via le Service des contenus illégaux, diffamatoires, obscènes, menaçants ou portant atteinte aux droits d'autrui ;",
          "Informer ses locataires, le cas échéant, du traitement de leurs données personnelles dans le cadre de la gestion locative, conformément au RGPD, et s'assurer de disposer d'une base légale pour traiter lesdites données.",
        ],
      },
    ],
  },
  {
    title: "11. Comportements interdits",
    blocks: [
      "Sont strictement interdits :",
      {
        list: [
          "L'usurpation d'identité ou la création de comptes sous une identité fictive ;",
          "La tentative de surcharge délibérée des serveurs du Service (attaques DoS/DDoS) ;",
          "L'exploitation de failles de sécurité du Service à des fins non autorisées (tout signalement de vulnérabilité doit être adressé à contact@meskasas.com) ;",
          "L'utilisation du Service pour harceler, menacer ou nuire à des tiers (locataires, autres propriétaires, etc.) ;",
          "La création de comptes multiples pour contourner les limitations du plan gratuit ou les mesures de suspension ;",
          "La revente d'accès au Service ou la mise à disposition du Service à des tiers dans le cadre d'une activité commerciale non autorisée par Meskasas ;",
          "Toute action susceptible de porter atteinte à l'intégrité, à la disponibilité ou à la réputation du Service.",
        ],
      },
      "Meskasas se réserve le droit de prendre toute mesure appropriée, y compris la suspension ou la résiliation du Compte de l'Utilisateur, et d'engager des poursuites judiciaires en cas de violation des présentes dispositions.",
    ],
  },
  {
    title: "12. Responsabilités de Meskasas",
    blocks: [
      "Meskasas s'engage à mettre en œuvre les moyens raisonnables et proportionnés pour assurer l'accès et le bon fonctionnement du Service. L'obligation de Meskasas est une obligation de moyens et non de résultat.",
      "Le Service est fourni « en l'état » (as is) et « tel que disponible » (as available). Meskasas ne garantit pas :",
      {
        list: [
          "La continuité, la disponibilité ininterrompue ou l'absence d'erreurs du Service ;",
          "Que le Service répondra aux besoins spécifiques de chaque Utilisateur ;",
          "L'exactitude, l'exhaustivité ou l'actualité des informations et calculs fournis par le Service (notamment les données IRL, les analyses de marché et les informations fournies par l'Assistant IA) ;",
          "La compatibilité du Service avec tous les équipements et navigateurs ;",
          "La préservation des données en cas de défaillance technique grave.",
        ],
      },
      "Des interruptions de service peuvent survenir pour des raisons de maintenance, de mise à jour ou pour des raisons indépendantes de la volonté de Meskasas. Meskasas s'efforcera d'informer les Utilisateurs des maintenances planifiées.",
      "Meskasas n'assure pas la sauvegarde des données de l'Utilisateur. Il appartient à l'Utilisateur d'exporter et de conserver ses données régulièrement. Les fonctionnalités d'export disponibles dans le Service doivent être utilisées à cette fin.",
      "Pages publiques d'information : les informations diffusées sur les Pages publiques d'information (notamment celles relatives à l'encadrement des loyers, à l'indice de référence des loyers, aux charges récupérables, aux transactions immobilières et aux simulateurs) sont mises à disposition à titre purement informatif, sur la base des sources officielles (arrêtés préfectoraux, INSEE, Légifrance, Open Data Paris, data.gouv.fr) disponibles à leur date de mise à jour. Meskasas ne garantit ni l'exactitude, ni l'exhaustivité, ni l'actualité de ces informations, qui peuvent évoluer entre deux mises à jour ou contenir des erreurs de transcription. Le Visiteur et l'Utilisateur s'engagent à vérifier toute information ainsi diffusée auprès des sources officielles ou d'un professionnel compétent (avocat, notaire, expert-comptable, agent immobilier titulaire d'une carte professionnelle) avant toute décision, et notamment avant la signature ou le renouvellement d'un bail, la fixation ou la révision d'un loyer, la régularisation de charges, une déclaration fiscale ou l'engagement d'un contentieux. La responsabilité de Meskasas ne saurait être engagée du fait de l'utilisation de ces informations par un Visiteur ou un Utilisateur.",
      "Limitation de responsabilité : dans toute la mesure permise par la loi applicable, la responsabilité totale de Meskasas envers l'Utilisateur, toutes causes confondues, ne pourra excéder le total des sommes effectivement versées par l'Utilisateur à Meskasas au titre de son Abonnement au cours des douze (12) mois précédant la survenance du fait générateur de responsabilité.",
      "Exclusion des dommages indirects : Meskasas ne pourra en aucun cas être tenu responsable des dommages indirects, accessoires, spéciaux, punitifs ou consécutifs, incluant notamment : la perte de profits, la perte de revenus locatifs, la perte de données, le manque à gagner, l'atteinte à la réputation, le coût de services de substitution, ou toute autre perte économique, même si Meskasas a été informé de la possibilité de tels dommages.",
    ],
  },
  {
    title: "13. Indemnisation",
    blocks: [
      "L'Utilisateur s'engage à défendre, indemniser et tenir indemne Meskasas, ses dirigeants, employés, prestataires et partenaires de toute réclamation, action en justice, demande, dommage, perte, responsabilité ou dépense (y compris les honoraires d'avocat raisonnables) résultant de ou liés à : (i) l'utilisation du Service par l'Utilisateur en violation des présentes CGU ; (ii) la violation par l'Utilisateur de toute disposition légale ou réglementaire applicable ; (iii) l'atteinte aux droits d'un tiers, notamment d'un locataire, résultant des actions de l'Utilisateur dans le cadre du Service.",
    ],
  },
  {
    title: "14. Propriété intellectuelle",
    blocks: [
      "Le Service, incluant sans limitation son code source, ses interfaces, ses graphismes, ses logos, ses bases de données, ses modèles de documents, ses algorithmes et tous les contenus publiés par Meskasas, sont la propriété exclusive de Daïa Group ou de ses concédants de licence, et sont protégés par le droit de la propriété intellectuelle.",
      "Meskasas accorde à l'Utilisateur une licence non exclusive, non transférable, révocable, limitée à la durée de l'Abonnement, d'utiliser le Service à des fins personnelles ou professionnelles dans le cadre de sa propre activité de gestion locative. Cette licence n'inclut aucun droit de reproduction, distribution, adaptation ou exploitation commerciale des éléments du Service à destination de tiers.",
      "L'Utilisateur conserve la propriété de l'ensemble de son Contenu Utilisateur. Il accorde à Meskasas une licence non exclusive, mondiale, pour héberger, stocker, traiter et afficher ce Contenu Utilisateur dans le seul but de fournir le Service.",
      "Il est interdit de procéder à toute ingénierie inverse, décompilation, désassemblage ou tentative d'extraction du code source du Service ou de ses composants.",
    ],
  },
  {
    title: "15. Données personnelles",
    blocks: [
      "Dans le cadre de l'utilisation du Service, Meskasas est amené à traiter des Données Personnelles concernant l'Utilisateur. Les modalités de ce traitement, les droits de l'Utilisateur et les coordonnées du responsable de traitement sont détaillés dans la Politique de confidentialité de Meskasas, qui fait partie intégrante des présentes CGU.",
      "L'Utilisateur qui traite, via le Service, des Données Personnelles de tiers (notamment ses locataires) est seul responsable du traitement de ces données au regard du RGPD. Il agit en qualité de responsable de traitement pour ces données. Meskasas agit en qualité de sous-traitant au sens de l'article 28 du RGPD pour le traitement de ces données tierces.",
    ],
  },
  {
    title: "16. Suspension et résiliation",
    blocks: [
      "Par Meskasas : Meskasas se réserve le droit de suspendre ou de résilier l'accès d'un Utilisateur au Service, avec ou sans préavis selon la gravité des faits, en cas de : (i) violation des présentes CGU ; (ii) utilisation frauduleuse du Service ; (iii) défaut de paiement ; (iv) comportement préjudiciable aux intérêts de Meskasas ou d'autres utilisateurs ; (v) inactivité prolongée d'un Compte au plan Gratuit. Dans ce dernier cas, une procédure automatisée désactive le Compte après 120 jours sans connexion, à l'issue d'un cycle de notifications préalables envoyées à l'adresse associée au Compte à 60, 90 et 120 jours ; l'ensemble des données du Compte est ensuite définitivement supprimé 12 mois après la dernière connexion, conformément à la Politique de confidentialité.",
      "Par l'Utilisateur : L'Utilisateur peut résilier son Compte à tout moment depuis les paramètres de son Compte ou en contactant Meskasas à contact@meskasas.com. La résiliation d'un abonnement payant prend effet à la fin de la période en cours.",
      "Effet de la résiliation : à la date d'effet de la résiliation, l'accès de l'Utilisateur au Service est désactivé. L'Utilisateur dispose d'un délai de 30 jours à compter de la résiliation pour exporter ses données depuis le Service, après quoi Meskasas procédera à la suppression définitive du Contenu Utilisateur, sauf obligation légale contraire de conservation. Certaines données peuvent être conservées plus longtemps pour répondre aux obligations légales et comptables applicables (notamment 10 ans pour les documents comptables).",
    ],
  },
  {
    title: "17. Force majeure",
    blocks: [
      "Meskasas ne pourra être tenu responsable d'un manquement à ses obligations contractuelles si ce manquement résulte d'un événement de force majeure au sens de l'article 1218 du Code civil, notamment : catastrophes naturelles, guerres, attentats, épidémies, pannes généralisées d'Internet, attaques informatiques de grande ampleur, défaillances d'infrastructures de tiers (fournisseurs cloud, opérateurs réseau), ou décisions gouvernementales rendant l'exécution du Service impossible.",
      "En cas d'événement de force majeure, Meskasas informera l'Utilisateur dans les meilleurs délais. Si l'événement de force majeure perdure au-delà de 30 jours, chacune des parties pourra résilier les présentes CGU de plein droit, sans indemnité, par notification écrite à l'autre partie.",
    ],
  },
  {
    title: "18. Modification des CGU",
    blocks: [
      "Meskasas se réserve le droit de modifier les présentes CGU à tout moment, notamment pour prendre en compte des évolutions légales, réglementaires, techniques ou commerciales.",
      "En cas de modification substantielle, Meskasas notifiera les Utilisateurs par e-mail à l'adresse associée à leur Compte, avec un préavis de 15 jours avant l'entrée en vigueur des nouvelles CGU. Les modifications mineures (corrections orthographiques, précisions rédactionnelles non substantielles) peuvent être effectuées sans préavis.",
      "La poursuite de l'utilisation du Service par l'Utilisateur après l'entrée en vigueur des nouvelles CGU vaut acceptation sans réserve de ces dernières. Si l'Utilisateur refuse les nouvelles CGU, il doit cesser d'utiliser le Service et résilier son Compte avant la date d'entrée en vigueur.",
    ],
  },
  {
    title: "19. Liens hypertextes",
    blocks: [
      "Le Service peut contenir des liens vers des sites web ou des services tiers. Ces liens sont fournis à titre informatif uniquement. Meskasas n'exerce aucun contrôle sur le contenu de ces sites ou services et décline toute responsabilité quant à leur contenu, leur politique de confidentialité, leur disponibilité ou les dommages qui pourraient résulter de leur utilisation.",
    ],
  },
  {
    title: "20. Divisibilité",
    blocks: [
      "Si une ou plusieurs dispositions des présentes CGU venaient à être déclarées nulles, non écrites ou inapplicables par une décision de justice définitive, les autres dispositions conserveraient leur plein effet. La disposition nulle ou inapplicable serait remplacée, dans toute la mesure possible, par une disposition valide qui se rapprocherait le plus possible de l'intention initiale des parties.",
    ],
  },
  {
    title: "21. Non-renonciation",
    blocks: [
      "Le fait pour Meskasas de ne pas se prévaloir à un moment donné de l'une quelconque des stipulations des présentes CGU ne peut être interprété comme une renonciation à se prévaloir ultérieurement de ladite stipulation.",
    ],
  },
  {
    title: "22. Langue",
    blocks: [
      "Les présentes CGU sont rédigées en langue française. En cas de traduction dans une autre langue, la version française prévaudra en cas de contradiction ou d'ambiguïté.",
    ],
  },
  {
    title: "23. Droit applicable et juridiction compétente",
    blocks: [
      "Les présentes CGU sont régies, interprétées et appliquées conformément au droit français, nonobstant les règles de conflit de lois, et à l'exclusion de la Convention de Vienne sur la vente internationale de marchandises.",
      "En cas de litige relatif à l'interprétation, à la validité ou à l'exécution des présentes CGU, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours à compter de la notification du litige par l'une ou l'autre des parties.",
      "À défaut de résolution amiable, tout litige sera soumis à la compétence exclusive du Tribunal judiciaire de Paris, sauf disposition impérative contraire du Code de la consommation applicable aux Utilisateurs consommateurs (lesquels peuvent saisir le tribunal de leur domicile).",
      "L'Utilisateur consommateur peut également recourir à la plateforme européenne de Règlement en Ligne des Litiges (RLL) mise en place par la Commission européenne, accessible à l'adresse suivante : https://ec.europa.eu/consumers/odr.",
    ],
  },
  {
    title: "24. Services tiers intégrés",
    blocks: [
      "Le Service fait appel à des prestataires techniques tiers pour la fourniture de certaines fonctionnalités. Pour ces fonctionnalités, Meskasas agit en qualité d'intermédiaire technique et ne saurait être tenu responsable des dysfonctionnements, interruptions ou modifications de ces services tiers. Les principaux prestataires sont :",
      {
        list: [
          "Stripe, Inc. — traitement des paiements par carte bancaire. L'Utilisateur accepte les conditions de service Stripe lors de tout paiement. Meskasas ne stocke aucune donnée de carte bancaire.",
          "Anthropic, PBC — traitement des requêtes de l'assistant IA immobilier. Les réponses sont générées automatiquement et peuvent contenir des erreurs.",
          "Resend, Inc. — envoi des e-mails transactionnels (notifications, envoi de documents aux locataires).",
        ],
      },
      "Meskasas se réserve le droit de changer de prestataire à tout moment, sans impact sur les fonctionnalités essentielles du Service et sans préavis particulier.",
    ],
  },
];

export default async function TermsPage({
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
            Conditions générales d&apos;utilisation
          </h1>
          <p className="mt-3 text-[13.5px] text-ink-3">
            Dernière mise à jour : 27 juillet 2026
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
