import type { Dictionary } from "./en";

export const fr: Dictionary = {
  meta: {
    siteTitle: "renters — La gestion locative, simplifiée",
    siteDescription:
      "Gérez vos biens, locataires, baux et prestataires au même endroit. Conçu pour les propriétaires, locataires et gestionnaires.",
    pricingTitle: "Tarifs — renters",
    pricingDescription:
      "Des tarifs simples et transparents. Commencez gratuitement avec 1 bien, puis évoluez à votre rythme.",
  },
  nav: {
    home: "Accueil",
    pricing: "Tarifs",
    login: "Se connecter",
    signup: "S'inscrire",
    dashboard: "Tableau de bord",
    logout: "Se déconnecter",
    languageLabel: "Langue",
  },
  auth: {
    login: {
      title: "Content de vous revoir",
      subtitle: "Connectez-vous pour gérer vos locations.",
      email: "E-mail",
      password: "Mot de passe",
      submit: "Se connecter",
      submitting: "Connexion…",
      noAccount: "Pas encore de compte ?",
      signupLink: "S'inscrire",
      forgotPassword: "Mot de passe oublié ?",
      errorGeneric:
        "Connexion impossible. Vérifiez votre e-mail et votre mot de passe.",
    },
    forgotPassword: {
      title: "Réinitialiser votre mot de passe",
      subtitle:
        "Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.",
      email: "E-mail",
      submit: "Envoyer le lien",
      submitting: "Envoi…",
      sentTitle: "Vérifiez vos e-mails",
      sentBody:
        "Si un compte existe pour {email}, vous recevrez un lien de réinitialisation. Vérifiez votre boîte de réception.",
      backToLogin: "Retour à la connexion",
      errorGeneric:
        "Impossible d'envoyer le lien. Veuillez réessayer.",
    },
    resetPassword: {
      title: "Définir un nouveau mot de passe",
      subtitle: "Choisissez un nouveau mot de passe pour votre compte.",
      password: "Nouveau mot de passe",
      passwordHint: "Au moins 6 caractères.",
      confirmPassword: "Confirmer le mot de passe",
      submit: "Mettre à jour le mot de passe",
      submitting: "Mise à jour…",
      success: "Mot de passe mis à jour. Redirection…",
      mismatch: "Les mots de passe ne correspondent pas.",
      errorGeneric: "Impossible de mettre à jour le mot de passe.",
    },
    signup: {
      title: "Créez votre compte",
      subtitle:
        "Gratuit pour commencer — gérez votre premier bien dès aujourd'hui.",
      fullName: "Nom complet",
      email: "E-mail",
      password: "Mot de passe",
      passwordHint: "Au moins 6 caractères.",
      role: "Je suis",
      roles: {
        owner: "Propriétaire",
        tenant: "Locataire",
        service_provider: "Prestataire de service",
      },
      submit: "Créer un compte",
      submitting: "Création du compte…",
      haveAccount: "Vous avez déjà un compte ?",
      loginLink: "Se connecter",
      emailSent: "Vérifiez vos e-mails",
      emailSentBody:
        "Nous avons envoyé un lien de confirmation à {email}. Cliquez dessus pour activer votre compte.",
      errorGeneric:
        "Impossible de créer votre compte. Veuillez réessayer.",
    },
  },
  dashboard: {
    title: "Tableau de bord",
    greeting: "Bienvenue, {name}",
    roleLabel: "Rôle",
    emailLabel: "E-mail",
    lastSignInLabel: "Dernière connexion",
    never: "Jamais",
    placeholder:
      "Votre tableau de bord s'installera ici. Nous ajouterons ensuite les biens, locataires et baux.",
    logout: "Se déconnecter",
    navCards: {
      properties: "Biens",
      propertiesDesc: "Gérez vos biens locatifs.",
      tenants: "Locataires",
      tenantsDesc: "Gérez vos fiches locataires.",
      leases: "Baux",
      leasesDesc: "Suivez et gérez vos contrats de bail.",
    },
    sidebar: {
      overview: "Vue d'ensemble",
      properties: "Biens",
      tenants: "Locataires",
      leases: "Baux",
      users: "Utilisateurs",
    },
  },
  users: {
    title: "Utilisateurs",
    empty: "Aucun utilisateur.",
    newUser: "Nouvel utilisateur",
    backToList: "Retour aux utilisateurs",
    columns: {
      name: "Nom",
      email: "E-mail",
      role: "Rôle",
      status: "Statut",
      lastSignIn: "Dernière connexion",
      createdAt: "Inscrit le",
      actions: "Actions",
    },
    status: {
      active: "Actif",
      suspended: "Suspendu",
    },
    actions: {
      edit: "Modifier",
      suspend: "Suspendre",
      unsuspend: "Réactiver",
      delete: "Supprimer",
    },
    confirmSuspend:
      "Suspendre cet utilisateur ? Il ne pourra plus se connecter.",
    confirmUnsuspend: "Réactiver l'accès de cet utilisateur ?",
    confirmDelete:
      "Supprimer définitivement cet utilisateur et toutes ses données ? Cette action est irréversible.",
    never: "Jamais",
    form: {
      createTitle: "Nouvel utilisateur",
      editTitle: "Modifier l'utilisateur",
      email: "E-mail",
      emailPlaceholder: "utilisateur@exemple.com",
      password: "Mot de passe",
      passwordHint:
        "Au moins 6 caractères. L'utilisateur s'en servira pour se connecter.",
      fullName: "Nom complet",
      fullNamePlaceholder: "Jane Dupont",
      role: "Rôle",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      errorGeneric:
        "Impossible d'enregistrer l'utilisateur. Veuillez réessayer.",
    },
  },
  properties: {
    title: "Biens",
    newProperty: "Nouveau bien",
    noProperties: "Aucun bien pour l'instant.",
    editProperty: "Modifier le bien",
    deleteProperty: "Supprimer le bien",
    confirmDelete: "Voulez-vous vraiment supprimer ce bien ? Cette action est irréversible.",
    backToList: "Retour aux biens",
    leasesOnProperty: "Baux liés à ce bien",
    noLeases: "Aucun bail pour ce bien pour l'instant.",
    fields: {
      label: "Libellé (facultatif)",
      labelPlaceholder: "ex. Appartement 3B",
      address: "Adresse",
      addressPlaceholder: "123 rue de la Paix",
      city: "Ville",
      cityPlaceholder: "Paris",
      postalCode: "Code postal",
      postalCodePlaceholder: "75001",
      country: "Pays",
      countryPlaceholder: "FR",
      monthlyRent: "Loyer mensuel (€)",
      monthlyRentPlaceholder: "1000",
      owner: "Propriétaire",
    },
    form: {
      createTitle: "Nouveau bien",
      editTitle: "Modifier le bien",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      errorGeneric: "Impossible d'enregistrer le bien. Veuillez réessayer.",
    },
  },
  tenants: {
    title: "Locataires",
    newTenant: "Nouveau locataire",
    noTenants: "Aucun locataire pour l'instant.",
    editTenant: "Modifier le locataire",
    deleteTenant: "Supprimer le locataire",
    confirmDelete: "Voulez-vous vraiment supprimer ce locataire ? Cette action est irréversible.",
    backToList: "Retour aux locataires",
    fields: {
      fullName: "Nom complet",
      fullNamePlaceholder: "Jane Dupont",
      email: "E-mail",
      emailPlaceholder: "jane@exemple.com",
      phone: "Téléphone",
      phonePlaceholder: "+33 6 00 00 00 00",
      notes: "Notes",
      notesPlaceholder: "Toute information utile…",
      owner: "Propriétaire",
    },
    form: {
      createTitle: "Nouveau locataire",
      editTitle: "Modifier le locataire",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      errorGeneric: "Impossible d'enregistrer le locataire. Veuillez réessayer.",
    },
  },
  leases: {
    title: "Baux",
    newLease: "Nouveau bail",
    noLeases: "Aucun bail pour l'instant.",
    editLease: "Modifier le bail",
    deleteLease: "Supprimer le bail",
    confirmDelete: "Voulez-vous vraiment supprimer ce bail ? Cette action est irréversible.",
    backToList: "Retour aux baux",
    fields: {
      property: "Bien",
      propertyPlaceholder: "Sélectionnez un bien",
      tenant: "Locataire",
      tenantPlaceholder: "Sélectionnez un locataire",
      startDate: "Date de début",
      endDate: "Date de fin (facultative)",
      monthlyRent: "Loyer mensuel (€)",
      monthlyRentPlaceholder: "1000",
      deposit: "Dépôt de garantie (€)",
      depositPlaceholder: "0",
      status: "Statut",
    },
    status: {
      pending: "En attente",
      active: "Actif",
      ended: "Terminé",
    },
    form: {
      createTitle: "Nouveau bail",
      editTitle: "Modifier le bail",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      errorGeneric: "Impossible d'enregistrer le bail. Veuillez réessayer.",
    },
  },
  accessDenied: {
    title: "Accès refusé",
    message: "Vous n'avez pas la permission d'accéder à cette page.",
  },
  roles: {
    admin: "Administrateur",
    owner: "Propriétaire",
    tenant: "Locataire",
    service_provider: "Prestataire de service",
  },
  footer: {
    tagline:
      "La gestion locative, simplifiée. Biens, locataires et baux — tout au même endroit.",
    product: "Produit",
    features: "Fonctionnalités",
    pricing: "Tarifs",
    account: "Compte",
    login: "Se connecter",
    signup: "S'inscrire",
    rights: "Tous droits réservés.",
  },
  home: {
    hero: {
      badge: "Conçu pour les propriétaires, locataires et gestionnaires",
      titlePrefix: "La gestion locative, ",
      titleHighlight: "simplifiée",
      description:
        "Gérez vos biens, locataires et baux depuis un seul endroit. Invitez propriétaires, locataires et prestataires — chacun voit exactement ce qui le concerne.",
      primaryCta: "Commencer gratuitement",
      secondaryCta: "Voir les tarifs",
      note: "Plan gratuit — sans carte bancaire",
    },
    features: {
      heading: "Tout ce qu'il faut pour gérer vos locations",
      subheading:
        "Du premier bien au cinquantième, renters évolue avec vous.",
      items: [
        {
          title: "Gestion des biens",
          description:
            "Suivez chaque bien de votre portefeuille — adresse, lots, photos, documents et historique d'entretien — depuis un seul tableau de bord.",
        },
        {
          title: "Fiches locataires",
          description:
            "Centralisez les coordonnées, l'historique des baux, le statut des paiements et les échanges. Les locataires disposent de leur propre portail.",
        },
        {
          title: "Suivi des baux",
          description:
            "Créez et renouvelez vos baux en quelques minutes. Rappels automatiques pour les échéances, révisions de loyer et documents manquants.",
        },
        {
          title: "Loyers et paiements",
          description:
            "Enregistrez les paiements reçus, générez des quittances et voyez en un coup d'œil qui est à jour et qui est en retard.",
        },
        {
          title: "Prestataires de service",
          description:
            "Tenez un annuaire de plombiers, électriciens et agents d'entretien. Attribuez les interventions, suivez leur avancement et informez les locataires.",
        },
        {
          title: "Accès par rôle",
          description:
            "Administrateurs, propriétaires, locataires et prestataires voient exactement ce dont ils ont besoin — et rien de plus.",
        },
      ],
    },
    users: {
      heading: "Une plateforme, quatre perspectives",
      subheading:
        "Chaque utilisateur voit ce qui le concerne — sans fouillis, sans confusion.",
      items: [
        {
          role: "Propriétaires",
          description:
            "Obtenez une vue portefeuille, surveillez les flux de loyers et maîtrisez les renouvellements de baux sans tableurs.",
        },
        {
          role: "Locataires",
          description:
            "Accédez aux documents du bail, soumettez des demandes d'intervention et consultez l'historique des paiements dans un portail clair.",
        },
        {
          role: "Prestataires",
          description:
            "Recevez les ordres d'intervention, mettez à jour le statut des travaux et partagez des photos — le tout rattaché au bon bien.",
        },
        {
          role: "Administrateurs",
          description:
            "Gérez plusieurs portefeuilles pour le compte de propriétaires avec une supervision complète et des accès délégués.",
        },
      ],
    },
    cta: {
      heading: "Prêt à reprendre le contrôle de vos locations ?",
      subheading:
        "Commencez gratuitement avec un bien. Passez à l'offre supérieure quand vous grandissez.",
      primary: "Créer un compte gratuit",
      secondary: "Comparer les offres",
    },
  },
  pricing: {
    header: {
      title: "Des tarifs simples et transparents",
      subtitle:
        "Commencez gratuitement et ne payez que ce dont vous avez besoin. Aucuns frais d'installation, aucun coût caché.",
    },
    mostPopular: "Le plus populaire",
    forever: "pour toujours",
    perMonth: "/mois",
    note: "Prix en euros. TVA applicable le cas échéant.",
    plans: [
      {
        name: "Gratuit",
        tagline: "Parfait pour démarrer",
        price: "0 €",
        priceSuffix: "pour toujours",
        cadence: undefined,
        cta: "Commencer gratuitement",
        features: [
          "Gérer 1 bien",
          "Jusqu'à 2 locataires",
          "Suivi des baux et rappels",
          "Accès au portail locataire",
          "Support par e-mail",
        ],
      },
      {
        name: "Démarrage",
        tagline: "Pour les portefeuilles en croissance",
        price: "9,99 €",
        priceSuffix: undefined,
        cadence: "/mois",
        cta: "Choisir Démarrage",
        features: [
          "Gérer jusqu'à 5 biens",
          "Locataires illimités",
          "Suivi des baux et rappels",
          "Annuaire des prestataires",
          "Suivi des paiements de loyer",
          "Support e-mail prioritaire",
        ],
      },
      {
        name: "Pro",
        tagline: "Pour les bailleurs professionnels",
        price: "24,99 €",
        priceSuffix: undefined,
        cadence: "/mois",
        cta: "Choisir Pro",
        features: [
          "Gérer plus de 5 biens",
          "Locataires et prestataires illimités",
          "Plusieurs propriétaires et sièges admin",
          "Rapports et exports avancés",
          "Rôles et permissions personnalisés",
          "Support prioritaire",
        ],
      },
    ],
    faq: {
      heading: "Questions fréquentes",
      items: [
        {
          q: "Puis-je changer d'offre plus tard ?",
          a: "Oui. Vous pouvez passer à une offre supérieure ou inférieure à tout moment. Les changements prennent effet au début du cycle de facturation suivant.",
        },
        {
          q: "Qu'est-ce qui compte comme un bien ?",
          a: "Un bien est un logement loué — un appartement, une maison ou une chambre louée séparément. Un immeuble de 3 lots compte pour 3 biens.",
        },
        {
          q: "Les locataires et prestataires doivent-ils payer un siège ?",
          a: "Non. Les comptes locataires et prestataires sont toujours gratuits. Vous ne payez que pour les biens que vous gérez.",
        },
        {
          q: "Y a-t-il un essai gratuit des offres payantes ?",
          a: "L'offre Gratuite est gratuite pour toujours — aucun essai nécessaire. Quand vous êtes prêt à grandir, passez à une offre supérieure en un clic.",
        },
      ],
    },
  },
};
