// Shared data-derivation and verbatim legal text for the Bail vide / Bail
// meublé contract. Imported by both renderers (HTML live view and the
// @react-pdf/renderer PDF snapshot) so they stay byte-for-byte in sync.
// Pure data + plain strings only — no JSX, no React, no async.

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

export const BLANK = "_______________________";

export const blank = (v: string | number | null | undefined): string =>
  v == null || v === "" ? BLANK : String(v);

export const fmt = (cents: number | null | undefined) =>
  cents != null
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      })
        .format(cents / 100)
        // fr-FR groups thousands with a narrow no-break space (U+202F) and
        // spaces the € sign with a no-break space (U+00A0). @react-pdf's built-in
        // Helvetica has no glyph for U+202F and renders it as "/", so normalise
        // both to a regular space. Harmless in the HTML views.
        .replace(/[  ]/g, " ")
    : "_______________";

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("fr-FR").format(new Date(iso)) : "__/__/____";

export const civPrefix = (c: unknown): string | null =>
  c === "mr" ? "M." : c === "mrs" ? "Mme" : null;

export function constructionPeriod(year: number | null | undefined) {
  if (year == null) return null;
  if (year < 1949) return "before_1949";
  if (year < 1975) return "1949_1974";
  if (year < 1989) return "1975_1989";
  if (year < 2005) return "1989_2005";
  return "since_2005";
}

// Everything the renderers need, derived once from the raw rows.
export function deriveContract(data: ContractData) {
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
      [ownerProfile?.postal_code, ownerProfile?.city].filter(Boolean).join(" "),
      ownerProfile?.country,
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  const tenantIsSociete = t?.tenant_type === "societe";
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

  const energyEstimate =
    energyMin != null && energyMax != null
      ? `${fmt(energyMin)} – ${fmt(energyMax)}`
      : energyMin != null
        ? fmt(energyMin)
        : energyMax != null
          ? fmt(energyMax)
          : "_______________";

  return {
    p,
    t,
    l,
    ownerProfile,
    isMeuble,
    period,
    dpeClass,
    energyMin,
    energyMax,
    energyYear,
    energyEstimate,
    propertyAddress,
    ownerName,
    ownerAddress,
    tenantIsSociete,
    tenantSigningName,
  };
}

export const isCharges = (m: string | null | undefined, value: string) =>
  m === value;

// ── Bail civil (articles 1709 et s. du Code civil) ──────────────────────────

const NATURE_LABEL: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  studio: "Studio",
  commercial: "Local commercial",
  land: "Terrain",
  other: "Autre",
};

function durationLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  if (months <= 0) return null;
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} an${years > 1 ? "s" : ""}`;
  }
  return `${months} mois`;
}

// Civil-specific derivation, layered on top of deriveContract (which already
// computes the bailleur identity, property address, etc.).
export function deriveCivil(data: ContractData) {
  const base = deriveContract(data);
  const { p, t, l } = base;

  const tenantDisplayName = base.tenantIsSociete
    ? (t?.full_name as string | null)
    : base.tenantSigningName || null;
  const tenantRep = base.tenantIsSociete ? base.tenantSigningName || null : null;

  const tenantAddress =
    [
      t?.previous_address as string | null,
      [t?.previous_postal_code as string | null, t?.previous_city as string | null]
        .filter(Boolean)
        .join(" "),
      t?.previous_country as string | null,
    ]
      .filter((part) => part && (part as string).trim())
      .join(", ") || null;

  const nature = p?.type ? (NATURE_LABEL[p.type as string] ?? null) : null;

  const extras =
    [
      p?.basement ? "cave" : null,
      p?.parking ? "parking" : null,
      p?.garden ? "jardin" : null,
      p?.terrace ? "terrasse" : null,
      p?.balcony ? "balcon" : null,
    ]
      .filter(Boolean)
      .join(", ") || null;

  return {
    ...base,
    tenantDisplayName,
    tenantRep,
    tenantAddress,
    nature,
    extras,
    duration: durationLabel(l.start_date as string | null, l.end_date as string | null),
    jurisdictionCity: (p?.city as string | null) ?? null,
  };
}

export const CIVIL_1709_NOTICE =
  "Le présent bail est un bail civil régi par les articles 1709 et suivants du Code civil. Il n'est pas soumis aux dispositions de la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs.";

export const CIVIL_ART2_TEXT =
  "Le Locataire s'engage à user du bien conformément à cette destination et à ne pas le transformer sans l'accord écrit préalable du Bailleur.";

export const CIVIL_ART3_TEXT =
  "À l'expiration de la durée convenue, le bail prendra fin de plein droit, sans qu'il soit besoin d'un congé, sauf accord express des parties pour le renouveler ou le proroger. En cas de tacite reconduction, le bail se poursuivra aux mêmes conditions et pour une durée identique, sauf congé donné par l'une ou l'autre des parties dans les conditions prévues à l'article 8 du présent contrat.";

export const CIVIL_ART5_TEXT =
  "Ces charges sont payées en sus du loyer principal. Elles pourront faire l'objet d'une régularisation annuelle sur présentation des justificatifs par le Bailleur.";

export const CIVIL_ART7_TEXT =
  "Un état des lieux contradictoire sera établi entre les parties à l'entrée et à la sortie du Locataire. En l'absence d'état des lieux, le Locataire est présumé avoir reçu le bien en bon état, conformément à l'article 1731 du Code civil. L'état des lieux sera annexé au présent contrat et en fera partie intégrante.";

export const CIVIL_ART9_ITEMS = [
  "Délivrer le bien loué en bon état d'usage et de réparation ;",
  "Assurer au Locataire la jouissance paisible du bien loué pendant toute la durée du bail ;",
  "Entretenir le bien en état de servir à l'usage pour lequel il a été loué ;",
  "Effectuer les réparations nécessaires autres que locatives.",
];

export const CIVIL_ART10_ITEMS = [
  "Payer le loyer et les charges aux termes convenus ;",
  "User du bien loué en bon père de famille et conformément à la destination convenue ;",
  "Répondre des dégradations survenues de son fait ou du fait des personnes dont il est responsable ;",
  "Effectuer les réparations locatives (menues réparations d'entretien) ;",
  "Ne pas sous-louer ni céder le bail sans l'accord écrit préalable du Bailleur ;",
  "Souscrire une assurance responsabilité civile locative et en justifier à première demande ;",
  "Restituer le bien en bon état à l'expiration du bail.",
];

export const CIVIL_ART11_TEXT =
  "Le Locataire ne pourra effectuer aucuns travaux de transformation ou d'amélioration du bien sans l'accord écrit préalable du Bailleur. En cas de travaux autorisés, les améliorations réalisées par le Locataire resteront la propriété du Bailleur à l'expiration du bail, sans indemnité, sauf accord contraire.";

export const CIVIL_ART12_TEXT =
  "Le Locataire devra, dès la prise d'effet du bail et pendant toute sa durée, souscrire une assurance couvrant les risques locatifs (incendie, dégâts des eaux, explosion) ainsi que sa responsabilité civile. Il devra en justifier auprès du Bailleur à première demande. Le Bailleur conserve à sa charge l'assurance de l'immeuble en tant que propriétaire.";

export const CIVIL_ART13_TEXT =
  "À défaut de paiement du loyer ou des charges aux échéances convenues, ou à défaut d'exécution de l'une quelconque des conditions du présent bail, et un mois après un commandement de payer ou une mise en demeure d'exécuter restés sans effet, le présent bail sera résilié de plein droit, si bon semble au Bailleur, sans qu'il soit besoin de faire prononcer cette résiliation en justice.";

export const CIVIL_ART14_TEXT =
  "Pour l'exécution du présent bail, les parties font élection de domicile à leurs adresses respectives indiquées en tête du présent acte. Tout litige relatif à l'exécution ou à l'interprétation du présent bail sera soumis au Tribunal judiciaire du ressort du lieu de situation du bien.";

export const CIVIL_ANNEXES_ITEMS = [
  "L'état des lieux d'entrée contradictoire ;",
  "L'inventaire du mobilier, le cas échéant ;",
  "Le ou les diagnostics techniques obligatoires (DPE, amiante, plomb, etc.) le cas échéant ;",
  "Tout autre document convenu entre les parties.",
];

export const CIVIL_SIGN_NOTE =
  "En autant d'exemplaires originaux que de parties, chaque partie reconnaissant avoir reçu le sien.";

// ── Bail commercial 3/6/9 (articles L.145-1 et s. du code de commerce) ──────

export function deriveCommercial(data: ContractData) {
  const base = deriveContract(data);
  const { p, t, l } = base;

  const annualRentCents =
    l.monthly_rent_cents != null
      ? (l.monthly_rent_cents as number) * 12
      : null;

  const tenantDisplayName = base.tenantIsSociete
    ? (t?.full_name as string | null)
    : base.tenantSigningName || null;
  const tenantRep = base.tenantIsSociete ? base.tenantSigningName || null : null;

  const equipment = (p?.commercial_equipment as string | null) ?? null;
  const activity = (p?.commercial_activity as string | null) ?? null;

  return {
    ...base,
    annualRentCents,
    tenantDisplayName,
    tenantRep,
    equipment,
    activity,
    city: (p?.city as string | null) ?? null,
  };
}

export const COM_INTRO_NOTICE =
  "Le présent modèle concerne un bail non assorti d'une clause d'échelle mobile (clause relative à l'indexation du loyer), passé par acte sous seing privé. En raison de l'interdiction de se référer à certains indices, il est recommandé de consulter un professionnel avant de rédiger un bail assorti d'une clause d'échelle mobile.";

export const COM_ART1_ACCEPT_TEXT =
  "Ainsi que le tout existe et comporte, sans aucune exception ni réserve, le(s) preneur(s) déclarant bien connaître les lieux pour les avoir vus et visités en vue du présent acte. Le Preneur les accepte en conséquence dans l'état où ils se trouvent, sans recours d'aucune sorte contre le Bailleur. Toute erreur dans la désignation ou la contenance indiquées ou toute différence entre les surfaces indiquées aux présentes et les dimensions réelles des locaux loués ne peut justifier ni réduction ni augmentation de loyer, ni indemnité. De convention expresse entre les parties, les locaux loués forment un tout unique et indivisible.";

export const COM_ART1_DEST_TEXT =
  "Le Preneur s'engage à maintenir le bien loué en état permanent d'exploitation effective et normale. Le Preneur ne pourra modifier, même partiellement, cet usage ou y adjoindre une autre activité, sauf dans les conditions et formes fixées par les articles L.145-47 et suivants du code de commerce. Le Bailleur restera libre de louer les autres locaux de l'immeuble pour des activités similaires à celles du Preneur.";

export const COM_ART2_CONGE_ITEMS = [
  "Le Preneur aura la faculté de donner congé à l'expiration d'une période triennale en délivrant congé au Bailleur six (6) mois au moins à l'avance, par acte extrajudiciaire ou par lettre recommandée avec demande d'avis de réception, conformément à l'article L.145-4 du code de commerce ;",
  "Le Bailleur jouira de la même faculté, s'il entend invoquer les dispositions des articles L.145-18, L.145-21, L.145-23-1 et L.145-24 du code de commerce, en délivrant congé par acte extrajudiciaire conformément à l'article L.145-9 du code de commerce.",
];

export const COM_ART3_INTRO =
  "Le présent bail est, en outre, consenti et accepté sous les charges et conditions générales suivantes que le Preneur s'oblige à exécuter et accomplir, notamment :";

export const COM_ART3_ITEMS = [
  "a) De prendre les lieux loués dans l'état où ils se trouveront le jour de l'entrée en jouissance sans pouvoir exiger aucune réparation ou amélioration, ni aucune réduction du loyer de ce chef. Au plus tard un mois après l'entrée du locataire dans les lieux, il sera dressé un état des lieux, contradictoirement, entre les parties et à leurs frais. Le Preneur fera, à ses frais pendant le cours du bail, tous travaux d'entretien, de réfection et de remplacement de toute nature qui seront nécessaires, ainsi que tous travaux de mise en conformité prescrits par une législation ou une réglementation, à l'exception des travaux concernant le gros œuvre, de façon que le Bailleur ne soit jamais inquiété à ce sujet.",
  "b) De laisser le Bailleur, ou toutes personnes qu'il déléguera, pénétrer dans les lieux loués toutes les fois que bon lui semblera, pour juger de leur état et pour assurer l'entretien périodique de toutes les installations.",
  "c) De tenir constamment garnis les lieux loués de meubles meublants, objets mobiliers, marchandises et matériel, en qualité et valeur suffisantes pour répondre en tout temps du paiement des loyers et de l'exécution de toutes les conditions de la présente convention.",
  "d) De souffrir que le Bailleur fasse exécuter aux frais du Preneur tous travaux de réparation qui s'avéreraient nécessaires du fait de sa carence, sans pouvoir prétendre à aucune indemnité ou diminution de loyer, quelle que soit la durée des travaux, excéderait-elle quarante jours.",
  "e) D'acquitter toutes les charges personnelles dont les locataires sont ordinairement tenus, notamment la contribution économique territoriale (CET) et les taxes de toutes natures, de manière que le loyer soit perçu net de toutes charges réelles quelconques, à la seule exclusion des impôts grevant les revenus de la location, qui demeurent à la charge du Bailleur.",
  "f) De faire ramoner et nettoyer sous sa responsabilité, au moins une fois l'an, toutes les cheminées dépendant de la location, et de faire nettoyer les chenaux et gouttières.",
  "g) De ne pouvoir établir aucun étalage extérieur en contradiction avec les autorisations administratives. Le Preneur jouira du droit d'enseigne sur les surfaces délimitées en accord avec le Bailleur ; une enseigne lumineuse ne pourra être utilisée qu'après approbation expresse du Bailleur et sous réserve des autorisations administratives.",
  "h) De ne rien faire qui puisse nuire à la tranquillité ou à la jouissance paisible des autres occupants ou des voisins de l'immeuble.",
  "i) De laisser, lors de l'abandon des lieux, toutes installations, améliorations et embellissements, sans indemnité et en bon état, à moins que le Bailleur ne réclame le rétablissement de tout ou partie des lieux dans leur état primitif, aux frais du Preneur.",
  "j) De souscrire tous abonnements à l'eau, au gaz, à l'électricité et au téléphone, et d'en payer régulièrement les primes et cotisations, sans pouvoir demander aucune indemnisation en cas d'arrêt des fournitures ou pour tout autre cas de force majeure.",
  "k) De ne pouvoir invoquer la responsabilité du Bailleur en cas de vol, cambriolage ou tout autre acte délictueux commis par un tiers dans les lieux loués ou leurs dépendances.",
  "l) D'exploiter personnellement dans les lieux loués, de façon continue, un fonds de commerce conforme à la destination ci-dessus définie.",
  "m) D'obtenir tous agréments ou autorisations nécessaires à l'exercice de son activité s'il y a lieu.",
  "n) De ne pouvoir installer stores extérieurs, tentes, marquises, auvents ou dispositifs analogues sans autorisation écrite et préalable du Bailleur.",
  "o) De rembourser au Bailleur sa quote-part dans les charges, taxes et prestations de toutes natures afférentes aux locaux loués (taxes locatives, prestations et fournitures individuelles et collectives, frais d'entretien des parties communes, etc.).",
];

export const COM_ART4_ITEMS = [
  "a) L'ensemble immobilier sera assuré dans sa totalité en valeur de reconstruction à neuf, contre les risques d'incendie, d'explosion et d'attentat, tempête, dégâts des eaux et autres risques usuels.",
  "b) Le Preneur déclare faire son affaire personnelle de la couverture des risques précités et du paiement régulier des primes y afférent, dont il justifiera auprès du Bailleur en lui adressant un exemplaire des conditions particulières de la police.",
  "c) Le Preneur devra déclarer immédiatement à l'assureur et au Bailleur tout sinistre, quelle qu'en soit l'importance. En cas de destruction partielle ou totale des locaux, par dérogation à l'article 1722 du Code civil, le bail ne serait pas résilié et le Bailleur s'engagerait à procéder à la reconstruction à neuf en y affectant l'indemnité d'assurance ; le Preneur continuant d'acquitter son loyer.",
  "d) Si, pour des causes étrangères au Bailleur, la reconstruction à l'équivalent s'avérait impossible dans un délai d'un an, le bail serait résilié sans indemnité pour le Preneur, le bénéfice des indemnités d'assurances immobilières restant acquis au Bailleur.",
  "e) Le Preneur fera son affaire personnelle de tous dommages causés à ses aménagements, mobilier, matériel et marchandises, en renonçant à tous recours contre le Bailleur, et assurera les risques propres à son exploitation ainsi que sa responsabilité civile à l'égard des voisins et des tiers.",
];

export const COM_ART5_TEXT =
  "Le Preneur a la faculté de céder son droit au présent bail pour la totalité des locaux loués à l'acquéreur de son fonds de commerce ou de son entreprise, dans la mesure où ce dernier exerce la même activité, sans que le Bailleur ne puisse s'y opposer. Dans tous les autres cas, le Preneur ne pourra céder le droit au présent bail sans le consentement exprès et écrit du Bailleur. La cession devra être constatée par acte authentique ou sous seing privé auquel le Bailleur sera appelé à concourir, par notification adressée au moins quinze jours à l'avance. Le Preneur restera garant solidaire du cessionnaire pendant trois (3) ans à compter de la cession.";

export const COM_ART6_TEXT =
  "Le Preneur ne pourra sous-louer tout ou partie des locaux donnés à bail ni les prêter, même à titre gratuit (sauf à une société de son groupe), sous peine de résiliation immédiate du présent bail, à la simple constatation de l'infraction et sans qu'il soit besoin d'une mise en demeure. Il ne pourra donner son fonds en location-gérance, ni se substituer ou y domicilier qui que ce soit.";

export const COM_ART8_TVA_TEXT =
  "Le Bailleur s'engage expressément à opter pour l'assujettissement à la taxe sur la valeur ajoutée du loyer ci-dessus fixé afférent aux locaux loués. Le Preneur s'oblige en conséquence à rembourser au Bailleur, en sus du loyer, le montant de la TVA figurant sur les factures de loyer qui lui seront adressées le premier jour de chaque trimestre à échoir.";

export const COM_ART9_REVISION_TEXT =
  "Le loyer sera soumis à révision dans les conditions des articles L.145-37 et suivants du code de commerce et variera en fonction de l'indice des loyers commerciaux (ILC) ou de l'indice des loyers des activités tertiaires (ILAT) publié par l'INSEE (loi Pinel du 18 juin 2014, art. L.145-34 C. com.) ; l'usage de l'indice du coût de la construction (ICC) est exclu. À défaut de publication de l'indice retenu, les parties s'en remettront à l'indice de remplacement ou à un nouvel indice conventionnellement choisi, à défaut désigné par le Président du tribunal judiciaire statuant en référé.";

export const COM_ART11_RESOLUTOIRE_TEXT =
  "À défaut de paiement à son échéance d'un seul terme de loyer, y compris de l'indexation, ou en cas d'inobservation de l'une quelconque des clauses du présent contrat, et un mois après un simple commandement de payer ou une mise en demeure adressée par acte extrajudiciaire resté sans effet et exprimant la volonté du Bailleur de se prévaloir de la présente clause, le bail sera résilié immédiatement et de plein droit, sans qu'il soit besoin de remplir aucune formalité judiciaire. En cas de résiliation imputable au Preneur, le dépôt de garantie restera acquis au Bailleur à titre d'indemnité, sans préjudice du paiement des loyers dus et de tous dommages et intérêts. Cette disposition constitue une condition essentielle et déterminante du présent bail.";

export const COM_ART12_ETAT_TEXT =
  "Comme prévu en tête du présent bail, un état des lieux sera établi en présence des représentants du Bailleur et du Preneur lors de la prise d'effet du bail et au moment de son départ.";

export const COM_ART13_RESTITUTION_TEXT =
  "Avant de déménager, le Preneur devra justifier au Bailleur du paiement des contributions à sa charge, notamment la contribution économique territoriale (CET), et de tous les termes de son loyer et accessoires. Il devra rendre les lieux loués en parfait état ou, à défaut, régler au Bailleur le coût des travaux de remise en état. Il sera procédé à l'état des lieux de sortie, en présence du Preneur dûment convoqué, au plus tard un mois avant l'expiration du bail.";

export const COM_ART14_REGLEMENTATION_TEXT =
  "Le présent bail est soumis aux articles L.145-1 et suivants du code de commerce.";

export const COM_ART15_FRAIS_TEXT =
  "Les droits d'enregistrement, frais et honoraires des présentes et de leurs avenants seront supportés par le Preneur, qui s'y oblige.";

export const COM_SIGN_NOTE =
  "Suivent les signatures des parties, précédées de la mention manuscrite « Lu et approuvé ». Les parties paraphent le bas de chaque page.";

// ── Verbatim static text from the loi Alur bail type (décret 29 mai 2015) ──

export const PREAMBLE =
  "Modalités d'application du contrat type du décret du 29 mai 2015 : Le régime de droit commun en matière de baux d'habitation est défini principalement par la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs et portant modification de la loi n° 86-1290 du 23 décembre 1986. L'ensemble de ces dispositions étant d'ordre public, elles s'imposent aux parties qui, en principe, ne peuvent pas y renoncer.";

export const DPE_RAPPEL =
  "Rappel : un logement décent doit respecter les critères minimaux de performance suivants. En France métropolitaine : à compter du 1er janvier 2025, le niveau de performance minimal correspond à la classe F du DPE ; à compter du 1er janvier 2028, à la classe E ; à compter du 1er janvier 2034, à la classe D. La consommation d'énergie finale et le niveau de performance du logement sont déterminés selon la méthode du diagnostic de performance énergétique mentionné à l'article L. 126-26 du code de la construction et de l'habitation.";

export function tacitRenewalText(isMeuble: boolean): string {
  return isMeuble
    ? "À l'exception des locations consenties à un étudiant pour une durée de neuf mois, les contrats de location de logements meublés sont reconduits tacitement à leur terme pour une durée d'un an et dans les mêmes conditions. Le locataire peut mettre fin au bail à tout moment, après avoir donné congé. Le bailleur peut, quant à lui, mettre fin au bail à son échéance et après avoir donné congé, soit pour reprendre le logement en vue de l'occuper lui-même ou une personne de sa famille, soit pour le vendre, soit pour un motif sérieux et légitime. Les contrats de locations meublées consentis à un étudiant pour une durée de neuf mois ne sont pas reconduits tacitement à leur terme et le locataire peut mettre fin au bail à tout moment, après avoir donné congé. Le bailleur peut, quant à lui, mettre fin au bail à son échéance et après avoir donné congé."
    : "Le contrat de location nu est conclu pour une durée minimale de trois ans lorsque le bailleur est une personne physique, ou de six ans lorsque le bailleur est une personne morale. À son terme, le contrat est reconduit tacitement dans les mêmes conditions, sauf congé délivré dans les formes et délais légaux. Le locataire peut mettre fin au bail à tout moment, sous réserve du respect du préavis applicable. Le bailleur ne peut donner congé qu'à l'échéance du bail, pour reprendre ou vendre le logement ou pour un motif légitime et sérieux, et au moins six mois avant ce terme.";
}

export const SOLIDARITE_TEXT =
  "Modalités particulières des obligations en cas de pluralité de locataires : en cas de colocation, c'est-à-dire de la location d'un même logement par plusieurs locataires constituant leur résidence principale et formalisée par la conclusion d'un contrat unique ou de plusieurs contrats entre les locataires et le bailleur, les locataires sont tenus conjointement, solidairement et indivisiblement à l'égard du bailleur au paiement des loyers, charges et accessoires dus en application du présent bail. La solidarité d'un des colocataires et celle de la personne qui s'est portée caution pour lui prennent fin à la date d'effet du congé régulièrement délivré et lorsqu'un nouveau colocataire figure au bail. À défaut, la solidarité du colocataire sortant s'éteint au plus tard à l'expiration d'un délai de six mois après la date d'effet du congé.";

export const RESOLUTOIRE_TEXT =
  "Modalités de résiliation de plein droit du contrat : Le bail sera résilié de plein droit en cas d'inexécution des obligations du locataire, soit en cas de défaut de paiement des loyers et des charges locatives au terme convenu, de non-versement du dépôt de garantie, de défaut d'assurance du locataire contre les risques locatifs, de troubles de voisinage constatés par une décision de justice passée en force de chose jugée rendue au profit d'un tiers. Le bailleur devra assigner le locataire devant le tribunal pour faire constater l'acquisition de la clause résolutoire et la résiliation de plein droit du bail. Lorsque le bailleur souhaite mettre en œuvre la clause résolutoire pour défaut de paiement des loyers et des charges ou pour non-versement du dépôt de garantie, il doit préalablement faire signifier au locataire, par acte de commissaire de justice, un commandement de payer, qui doit mentionner certaines informations et notamment la faculté pour le locataire de saisir le fonds de solidarité pour le logement. De plus, pour les bailleurs personnes physiques ou les sociétés immobilières familiales, le commandement de payer doit être signalé par le commissaire de justice à la commission de coordination des actions de prévention des expulsions locatives dès lors que l'un des seuils relatifs au montant et à l'ancienneté de la dette, fixé par arrêté préfectoral, est atteint. Le locataire peut, à compter de la réception du commandement, régler sa dette, saisir le juge d'instance pour demander des délais de paiement, voire demander ponctuellement une aide financière à un fonds de solidarité pour le logement. Si le locataire ne s'est pas acquitté des sommes dues dans les six semaines suivant la signification, le bailleur peut alors assigner le locataire en justice pour faire constater la résiliation de plein droit du bail. En cas de défaut d'assurance, le bailleur ne peut assigner en justice le locataire pour faire constater l'acquisition de la clause résolutoire qu'après un délai d'un mois après un commandement demeuré infructueux.";

export const HONORAIRES_INTRO =
  "Il est rappelé les dispositions du I de l'article 5 de la loi du 6 juillet 1989 : la rémunération des personnes mandatées pour se livrer ou prêter leur concours à l'entremise ou à la négociation d'une mise en location d'un logement est à la charge exclusive du bailleur, à l'exception des honoraires liés aux prestations de visite du preneur, de constitution de son dossier et de rédaction du bail, ainsi que des honoraires de réalisation de l'état des lieux, qui sont partagés entre le bailleur et le preneur. Le montant toutes taxes comprises imputé au preneur pour ces prestations ne peut excéder celui imputé au bailleur et demeure inférieur ou égal à un plafond par mètre carré de surface habitable fixé par voie réglementaire et révisable chaque année. Les honoraires de rédaction du bail sont dus à la signature du bail ; ceux de l'état des lieux sont dus à compter de la réalisation de la prestation.";

export const ANNEXES = (isMeuble: boolean): string[] => [
  "Le cas échéant, un extrait du règlement de copropriété concernant la destination de l'immeuble, la jouissance et l'usage des parties privatives et communes, et précisant la quote-part afférente au lot loué dans chacune des catégories de charges.",
  "Un dossier de diagnostic technique comprenant un diagnostic de performance énergétique, un constat de risque d'exposition au plomb (immeubles d'avant le 1er janvier 1949), le cas échéant un état mentionnant la présence ou l'absence d'amiante, un état de l'installation intérieure d'électricité et de gaz, ainsi qu'un état des risques naturels et technologiques.",
  "Une notice d'information relative aux droits et obligations des locataires et des bailleurs.",
  isMeuble
    ? "Un état des lieux, un inventaire et un état détaillé du mobilier (établis lors de la remise des clés)."
    : "Un état des lieux (établi lors de la remise des clés).",
  "Le cas échéant, une autorisation préalable de mise en location.",
  "Le cas échéant, les références aux loyers habituellement constatés dans le voisinage pour des logements comparables.",
];
