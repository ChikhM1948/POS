export type Locale = 'fr' | 'ar';

export interface TranslationDict {
  common: {
    loading: string;
    cancel: string;
    close: string;
    save: string;
    saving: string;
    edit: string;
    deactivate: string;
    active: string;
    inactive: string;
    yes: string;
    dash: string;
    backoffice: string;
    logout: string;
    total: string;
    subtotal: string;
    tax: string;
    errorGeneric: string;
    errorLoading: string;
    paymentMethods: {
      cash: string;
      cib: string;
      edahabia: string;
      cheque: string;
      credit: string;
      voucher: string;
    };
  };
  languageSwitcher: {
    label: string;
    fr: string;
    ar: string;
  };
  dateRangePresets: {
    today: string;
    '7d': string;
    '30d': string;
    month: string;
    custom: string;
  };
  pos: {
    title: string;
    backoffice: string;
    logout: string;
    searchPlaceholder: string;
    noProductFound: string;
    noProductsSynced: string;
    noSearchResults: string;
    categoryAll: string;
    categoryOther: string;
    demoFooter: string;
    cart: {
      title: string;
      empty: string;
      perUnit: string;
      decrease: string;
      increase: string;
      remove: string;
    };
  };
  login: {
    setupTitle: string;
    setupSubtitle: string;
    tenantLabel: string;
    tenantPlaceholder: string;
    storeLabel: string;
    storePlaceholder: string;
    setupSubmit: string;
    setupFooter: string;
    title: string;
    subtitle: string;
    methodPin: string;
    methodPassword: string;
    pinLabel: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    changeStore: string;
    errorDefault: string;
    errorGeneric: string;
  };
  adminLogin: {
    title: string;
    subtitle: string;
    tenantLabel: string;
    tenantPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    switchToSetup: string;
    backToPos: string;
    errorDefault: string;
    errorGeneric: string;
  };
  adminSetup: {
    resultTitle: string;
    resultSubtitle: string;
    copy: string;
    copied: string;
    continueToBackoffice: string;
    title: string;
    subtitle: string;
    businessNameLabel: string;
    businessNamePlaceholder: string;
    adminNameLabel: string;
    adminNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    switchToLogin: string;
    errorDefault: string;
    errorGeneric: string;
  };
  adminShell: {
    subtitle: string;
    nav: {
      products: string;
      stock: string;
      sales: string;
      reports: string;
      suppliers: string;
      customers: string;
      team: string;
      settings: string;
    };
  };
  roles: {
    cashier: string;
    stock_manager: string;
    store_admin: string;
    super_admin: string;
  };
  products: {
    title: string;
    newProduct: string;
    searchPlaceholder: string;
    tableProduct: string;
    tableSku: string;
    tableBarcode: string;
    tableCategory: string;
    tablePrice: string;
    tableTax: string;
    tableStatus: string;
    empty: string;
    confirmDeactivate: string;
  };
  productForm: {
    titleEdit: string;
    titleNew: string;
    changeImage: string;
    addImage: string;
    removeImage: string;
    photoPlaceholder: string;
    sku: string;
    barcode: string;
    nameFr: string;
    nameAr: string;
    category: string;
    unit: string;
    price: string;
    costPrice: string;
    minSellingPrice: string;
    minSellingPricePlaceholder: string;
    marginHint: string;
    taxRate: string;
    taxExempt: string;
    threshold: string;
    thresholdPlaceholder: string;
    perishable: string;
    active: string;
    errorImageType: string;
    errorImageLoad: string;
    errorSave: string;
  };
  stock: {
    title: string;
    tableCurrent: string;
    tableThreshold: string;
    lowStock: string;
    movementHistory: string;
  };
  stockMovement: {
    currentStock: string;
    typeLabel: string;
    types: {
      purchase: string;
      adjustment: string;
      inventory_count: string;
      spoilage: string;
      sale: string;
      refund: string;
      transfer_in: string;
      transfer_out: string;
    };
    quantityLabel: string;
    quantityHintSigned: string;
    unitCost: string;
    supplier: string;
    supplierNone: string;
    amountPaid: string;
    amountPaidHint: string;
    lotNumber: string;
    expiryDate: string;
    note: string;
    notePlaceholder: string;
    save: string;
    historyTitle: string;
    tableDate: string;
    tableType: string;
    tableQuantity: string;
    tableCost: string;
    tableNote: string;
    empty: string;
    errorSave: string;
  };
  sales: {
    title: string;
    allStores: string;
    searchPlaceholder: string;
    ticket: string;
    typeRefund: string;
    typeSale: string;
    cashier: string;
    tableItem: string;
    tableQty: string;
    tableUnitPrice: string;
    tableTax: string;
    subtotalLine: string;
    taxLine: string;
    stampDutyLine: string;
    totalLine: string;
    paymentLine: string;
    refundNotice: string;
    refundsDone: string;
    makeRefund: string;
    tableTicket: string;
    tableDate: string;
    tableCashier: string;
    tablePayment: string;
    empty: string;
    payment: {
      cash: string;
      cib: string;
      edahabia: string;
      cheque: string;
      credit: string;
      voucher: string;
    };
  };
  paymentBreakdown: {
    empty: string;
  };
  revenueChart: {
    empty: string;
    viewTable: string;
    tableDate: string;
    tableSales: string;
    tableRevenue: string;
    salesCountSingular: string;
    salesCountPlural: string;
  };
  reports: {
    title: string;
    netRevenue: string;
    salesCountSingular: string;
    salesCountPlural: string;
    avgBasket: string;
    taxCollected: string;
    refunds: string;
    refundsCountSingular: string;
    refundsCountPlural: string;
    revenueByDay: string;
    byPaymentMethod: string;
    topProducts: string;
    tableQuantitySold: string;
    tableRevenue: string;
    noData: string;
    netProfit: string;
    marginHint: string;
    supplierDebts: string;
    customerDebts: string;
    topSuppliers: string;
    topCustomers: string;
    debtTableName: string;
    debtTableBalance: string;
    noDebts: string;
  };
  team: {
    title: string;
    newMember: string;
    tableName: string;
    tableEmail: string;
    tableRole: string;
    tablePin: string;
    tableStatus: string;
    empty: string;
    confirmDeactivate: string;
  };
  userForm: {
    title: string;
    name: string;
    role: string;
    email: string;
    password: string;
    passwordPlaceholder: string;
    pin: string;
    pinPlaceholder: string;
    pinHint: string;
    submit: string;
    errorSave: string;
  };
  settings: {
    title: string;
  };
  tenantSettings: {
    changeLogo: string;
    addLogo: string;
    removeLogo: string;
    logoPlaceholder: string;
    name: string;
    phone: string;
    phonePlaceholder: string;
    primaryColor: string;
    secondaryColor: string;
    saved: string;
    errorImageType: string;
    errorImageLoad: string;
    errorSave: string;
  };
  saleCheckout: {
    cash: string;
    credit: string;
    processing: string;
    errorGeneric: string;
  };
  cashModal: {
    title: string;
    totalToPay: string;
    amountReceived: string;
    exact: string;
    changeDue: string;
    insufficientAmount: string;
    confirm: string;
    confirming: string;
  };
  receipt: {
    paymentAccepted: string;
    ticket: string;
    discount: string;
    taxIncluded: string;
    paymentMethod: string;
    received: string;
    changeGiven: string;
    print: string;
    newSale: string;
    payment: {
      cash: string;
      cib: string;
      edahabia: string;
      cheque: string;
      credit: string;
      voucher: string;
    };
  };
  offlineBanner: {
    text: string;
  };
  refundForm: {
    title: string;
    tableSold: string;
    tableAlreadyRefunded: string;
    tableToRefund: string;
    refundVia: string;
    note: string;
    notePlaceholder: string;
    restock: string;
    errorNoQuantity: string;
    errorSave: string;
    amount: string;
    confirm: string;
    payment: {
      cash: string;
      cib: string;
      edahabia: string;
      cheque: string;
      credit: string;
      voucher: string;
    };
  };
  ledger: {
    historyTitle: string;
    tableDate: string;
    tableType: string;
    tableAmount: string;
    tableNote: string;
    types: {
      purchase_on_credit: string;
      sale_credit: string;
      payment: string;
      adjustment: string;
    };
    empty: string;
    recordPayment: string;
    paymentAmount: string;
    paymentNote: string;
    paymentNotePlaceholder: string;
    paymentSubmit: string;
    errorSave: string;
  };
  suppliers: {
    title: string;
    newSupplier: string;
    tableName: string;
    tablePhone: string;
    tableBalance: string;
    balanceOwed: string;
    empty: string;
  };
  supplierForm: {
    title: string;
    name: string;
    phone: string;
    address: string;
    submit: string;
    errorSave: string;
  };
  customers: {
    title: string;
    newCustomer: string;
    tableName: string;
    tablePhone: string;
    tableBalance: string;
    balanceOwed: string;
    empty: string;
  };
  customerForm: {
    title: string;
    name: string;
    phone: string;
    submit: string;
    errorSave: string;
  };
  discountEditor: {
    button: string;
    label: string;
    apply: string;
    marginWarning: string;
  };
  creditModal: {
    title: string;
    customerLabel: string;
    customerPlaceholder: string;
    noResults: string;
    amountPaidNow: string;
    remaining: string;
    confirm: string;
    confirming: string;
    errorNoCustomer: string;
  };
}

const fr: TranslationDict = {
  common: {
    loading: 'Chargement…',
    cancel: 'Annuler',
    close: 'Fermer',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    edit: 'Modifier',
    deactivate: 'Désactiver',
    active: 'Actif',
    inactive: 'Inactif',
    yes: 'Oui',
    dash: '—',
    backoffice: 'Back-office',
    logout: 'Déconnexion',
    total: 'Total',
    subtotal: 'Sous-total',
    tax: 'TVA',
    errorGeneric: 'Erreur.',
    errorLoading: 'Erreur de chargement.',
    paymentMethods: {
      cash: 'Espèces',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'Chèque',
      credit: 'Crédit',
      voucher: "Bon d'achat",
    },
  },
  languageSwitcher: {
    label: 'Langue',
    fr: 'FR',
    ar: 'AR',
  },
  dateRangePresets: {
    today: "Aujourd'hui",
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    month: 'Ce mois-ci',
    custom: 'Personnalisé',
  },
  pos: {
    title: 'Caisse',
    backoffice: 'Back-office',
    logout: 'Déconnexion',
    searchPlaceholder: 'Scanner un code-barres ou rechercher un produit…',
    noProductFound: 'Aucun produit pour « {value} »',
    noProductsSynced: "Aucun produit synchronisé. Vérifiez que l'API est démarrée et que le seed a été exécuté.",
    noSearchResults: 'Aucun produit ne correspond à cette recherche.',
    categoryAll: 'Tous',
    categoryOther: 'Autres',
    demoFooter: 'Merci de votre visite !',
    cart: {
      title: 'Panier',
      empty: 'Le panier est vide — sélectionnez un produit ou scannez un code-barres.',
      perUnit: '/ unité',
      decrease: 'Diminuer',
      increase: 'Augmenter',
      remove: 'Retirer',
    },
  },
  login: {
    setupTitle: 'Configuration du poste',
    setupSubtitle: 'À faire une seule fois par appareil — identifiants donnés par votre administrateur.',
    tenantLabel: 'Identifiant boutique (tenant)',
    tenantPlaceholder: 'ex. tenant_demo',
    storeLabel: 'Point de vente',
    storePlaceholder: 'ex. store_alger_01',
    setupSubmit: 'Enregistrer ce poste',
    setupFooter: 'POS Algérie · Caisse hors-ligne, synchronisée automatiquement',
    title: 'Connexion caisse',
    subtitle: 'Identifiez-vous pour ouvrir la session de vente',
    methodPin: 'Code PIN',
    methodPassword: 'Email / mot de passe',
    pinLabel: 'Code PIN',
    emailLabel: 'Email',
    emailPlaceholder: 'vous@commerce.dz',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    changeStore: 'Changer de boutique',
    errorDefault: 'Connexion refusée.',
    errorGeneric: 'Erreur de connexion.',
  },
  adminLogin: {
    title: 'Back-office',
    subtitle: 'Connectez-vous pour gérer votre commerce',
    tenantLabel: 'Identifiant boutique (tenant)',
    tenantPlaceholder: 'ex. tenant_demo',
    emailLabel: 'Email',
    emailPlaceholder: 'vous@commerce.dz',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    switchToSetup: 'Nouveau commerce ? Créez votre compte administrateur',
    backToPos: 'Retour à la caisse',
    errorDefault: 'Connexion refusée.',
    errorGeneric: 'Erreur de connexion.',
  },
  adminSetup: {
    resultTitle: 'Commerce créé',
    resultSubtitle: 'Notez votre identifiant boutique : il vous sera demandé à chaque connexion au back-office.',
    copy: 'Copier',
    copied: 'Copié !',
    continueToBackoffice: 'Accéder au back-office',
    title: 'Créer votre commerce',
    subtitle: "Ce compte sera l'administrateur principal de la boutique.",
    businessNameLabel: 'Nom du commerce',
    businessNamePlaceholder: 'ex. Épicerie Amine',
    adminNameLabel: 'Votre nom',
    adminNamePlaceholder: 'ex. Amine Benali',
    emailLabel: 'Email',
    emailPlaceholder: 'vous@commerce.dz',
    phoneLabel: 'Téléphone (optionnel)',
    phonePlaceholder: '0555 12 34 56',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '6 caractères minimum',
    submit: 'Créer le commerce',
    submitting: 'Création…',
    switchToLogin: 'Vous avez déjà un compte ? Connectez-vous',
    errorDefault: 'Impossible de créer le compte.',
    errorGeneric: 'Erreur de création.',
  },
  adminShell: {
    subtitle: 'Back-office',
    nav: {
      products: 'Produits',
      stock: 'Stock',
      sales: 'Ventes',
      reports: 'Rapports',
      suppliers: 'Fournisseurs',
      customers: 'Clients',
      team: 'Équipe',
      settings: 'Paramètres',
    },
  },
  roles: {
    cashier: 'Caissier',
    stock_manager: 'Gestionnaire de stock',
    store_admin: 'Administrateur boutique',
    super_admin: 'Administrateur',
  },
  products: {
    title: 'Produits',
    newProduct: 'Nouveau produit',
    searchPlaceholder: 'Rechercher par nom, SKU ou code-barres…',
    tableProduct: 'Produit',
    tableSku: 'SKU',
    tableBarcode: 'Code-barres',
    tableCategory: 'Catégorie',
    tablePrice: 'Prix',
    tableTax: 'TVA',
    tableStatus: 'Statut',
    empty: 'Aucun produit.',
    confirmDeactivate: 'Désactiver "{name}" ? Il restera visible dans l\'historique mais plus disponible à la vente.',
  },
  productForm: {
    titleEdit: 'Modifier le produit',
    titleNew: 'Nouveau produit',
    changeImage: "Changer l'image",
    addImage: 'Ajouter une image',
    removeImage: "Retirer l'image",
    photoPlaceholder: 'Photo',
    sku: 'SKU',
    barcode: 'Code-barres',
    nameFr: 'Nom (FR)',
    nameAr: 'الاسم (AR)',
    category: 'Catégorie',
    unit: 'Unité',
    price: 'Prix de vente (DZD)',
    costPrice: "Prix d'achat (DZD)",
    minSellingPrice: 'Prix de vente minimum (DZD)',
    minSellingPricePlaceholder: 'ex. 9500',
    marginHint: 'Marge estimée : {percent}%',
    taxRate: 'TVA',
    taxExempt: 'Exonéré',
    threshold: 'Seuil critique de stock',
    thresholdPlaceholder: 'ex. 5',
    perishable: 'Produit périssable (lot / date de péremption suivis au mouvement de stock)',
    active: 'Actif',
    errorImageType: 'Le fichier doit être une image.',
    errorImageLoad: "Impossible de charger l'image.",
    errorSave: "Erreur lors de l'enregistrement.",
  },
  stock: {
    title: 'Stock',
    tableCurrent: 'Stock actuel',
    tableThreshold: 'Seuil critique',
    lowStock: 'Stock faible',
    movementHistory: 'Mouvement / historique',
  },
  stockMovement: {
    currentStock: 'stock actuel : {qty} {unit}',
    typeLabel: 'Type de mouvement',
    types: {
      purchase: 'Achat (réception fournisseur)',
      adjustment: 'Correction manuelle',
      inventory_count: "Comptage d'inventaire",
      spoilage: 'Casse / péremption',
      sale: 'Vente',
      refund: 'Retour',
      transfer_in: 'Transfert entrant',
      transfer_out: 'Transfert sortant',
    },
    quantityLabel: 'Quantité',
    quantityHintSigned: '(+ ou -)',
    unitCost: 'Coût unitaire (DZD)',
    supplier: 'Fournisseur',
    supplierNone: '— Aucun —',
    amountPaid: 'Montant payé (DZD)',
    amountPaidHint: 'Le reste devient une dette envers ce fournisseur.',
    lotNumber: 'N° de lot',
    expiryDate: 'Date de péremption',
    note: 'Note',
    notePlaceholder: 'ex. inventaire annuel, verre cassé…',
    save: 'Enregistrer le mouvement',
    historyTitle: 'Historique récent',
    tableDate: 'Date',
    tableType: 'Type',
    tableQuantity: 'Quantité',
    tableCost: 'Coût',
    tableNote: 'Note',
    empty: 'Aucun mouvement enregistré.',
    errorSave: "Erreur lors de l'enregistrement du mouvement.",
  },
  sales: {
    title: 'Ventes',
    allStores: 'Toutes les boutiques',
    searchPlaceholder: 'N° de ticket…',
    ticket: 'Ticket {number}',
    typeRefund: 'Retour',
    typeSale: 'Vente',
    cashier: 'Caissier : {name}',
    tableItem: 'Article',
    tableQty: 'Qté',
    tableUnitPrice: 'PU',
    tableTax: 'TVA',
    subtotalLine: 'Sous-total : {amount}',
    taxLine: 'TVA : {amount}',
    stampDutyLine: 'Timbre fiscal : {amount}',
    totalLine: 'Total : {amount}',
    paymentLine: 'Paiement : {methods}',
    refundNotice: "Ceci est un retour lié à une vente d'origine.",
    refundsDone: 'Retours déjà effectués',
    makeRefund: 'Faire un retour',
    tableTicket: 'Ticket',
    tableDate: 'Date',
    tableCashier: 'Caissier',
    tablePayment: 'Paiement',
    empty: 'Aucune vente sur cette période.',
    payment: {
      cash: 'Espèces',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'Chèque',
      credit: 'Crédit',
      voucher: "Bon d'achat",
    },
  },
  paymentBreakdown: {
    empty: 'Aucune donnée sur cette période.',
  },
  revenueChart: {
    empty: 'Aucune donnée sur cette période.',
    viewTable: 'Voir en tableau',
    tableDate: 'Date',
    tableSales: 'Ventes',
    tableRevenue: "Chiffre d'affaires",
    salesCountSingular: 'vente',
    salesCountPlural: 'ventes',
  },
  reports: {
    title: 'Rapports',
    netRevenue: "Chiffre d'affaires net",
    salesCountSingular: 'vente',
    salesCountPlural: 'ventes',
    avgBasket: 'Panier moyen',
    taxCollected: 'TVA collectée',
    refunds: 'Retours',
    refundsCountSingular: 'retour',
    refundsCountPlural: 'retours',
    revenueByDay: "Chiffre d'affaires par jour",
    byPaymentMethod: 'Répartition par moyen de paiement',
    topProducts: 'Produits les plus vendus',
    tableQuantitySold: 'Quantité vendue',
    tableRevenue: "Chiffre d'affaires",
    noData: 'Aucune donnée.',
    netProfit: 'Bénéfice net',
    marginHint: 'Marge : {percent}%',
    supplierDebts: 'Dettes fournisseurs',
    customerDebts: 'Dettes clients',
    topSuppliers: 'Principaux fournisseurs',
    topCustomers: 'Principaux clients',
    debtTableName: 'Nom',
    debtTableBalance: 'Solde dû',
    noDebts: 'Aucune dette.',
  },
  team: {
    title: 'Équipe',
    newMember: 'Nouveau membre',
    tableName: 'Nom',
    tableEmail: 'Email',
    tableRole: 'Rôle',
    tablePin: 'PIN caisse',
    tableStatus: 'Statut',
    empty: "Aucun membre pour l'instant.",
    confirmDeactivate: 'Désactiver le compte de "{name}" ? Il ne pourra plus se connecter.',
  },
  userForm: {
    title: "Nouveau membre de l'équipe",
    name: 'Nom',
    role: 'Rôle',
    email: 'Email',
    password: 'Mot de passe',
    passwordPlaceholder: '6 caractères minimum',
    pin: 'PIN caisse',
    pinPlaceholder: 'ex. 1234',
    pinHint:
      "Le PIN est l'identifiant utilisé par le caissier pour se connecter à la caisse (identifiant boutique + PIN, sans email ni mot de passe).",
    submit: 'Créer le compte',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  settings: {
    title: 'Paramètres du commerce',
  },
  tenantSettings: {
    changeLogo: 'Changer le logo',
    addLogo: 'Ajouter un logo',
    removeLogo: 'Retirer le logo',
    logoPlaceholder: 'Logo',
    name: 'Nom du commerce',
    phone: 'Téléphone',
    phonePlaceholder: '0555 12 34 56',
    primaryColor: 'Couleur principale',
    secondaryColor: 'Couleur secondaire',
    saved: 'Paramètres enregistrés.',
    errorImageType: 'Le fichier doit être une image.',
    errorImageLoad: "Impossible de charger l'image.",
    errorSave: "Erreur lors de l'enregistrement.",
  },
  saleCheckout: {
    cash: 'Espèces',
    credit: 'Crédit client',
    processing: 'Traitement…',
    errorGeneric: "Erreur lors de l'encaissement. Réessayez.",
  },
  cashModal: {
    title: 'Paiement en espèces',
    totalToPay: 'Total à payer',
    amountReceived: 'Montant reçu',
    exact: 'Appoint',
    changeDue: 'Monnaie à rendre',
    insufficientAmount: 'Montant insuffisant',
    confirm: 'Valider le paiement',
    confirming: 'Encaissement…',
  },
  receipt: {
    paymentAccepted: 'Paiement accepté',
    ticket: 'Ticket {number}',
    discount: 'Remise',
    taxIncluded: 'Dont TVA',
    paymentMethod: 'Mode de paiement',
    received: 'Reçu',
    changeGiven: 'Monnaie rendue',
    print: 'Imprimer',
    newSale: 'Nouvelle vente',
    payment: {
      cash: 'Espèces',
      cib: 'CIB / Edahabia',
      edahabia: 'Edahabia',
      cheque: 'Chèque',
      credit: 'Crédit',
      voucher: "Bon d'achat",
    },
  },
  offlineBanner: {
    text: 'Mode hors-ligne — les ventes sont enregistrées localement et seront synchronisées automatiquement au retour de la connexion.',
  },
  refundForm: {
    title: 'Faire un retour',
    tableSold: 'Vendu',
    tableAlreadyRefunded: 'Déjà retourné',
    tableToRefund: 'À retourner',
    refundVia: 'Remboursé via',
    note: 'Note (optionnel)',
    notePlaceholder: 'ex. article défectueux',
    restock: 'Remettre les articles en stock',
    errorNoQuantity: 'Indiquez au moins une quantité à retourner.',
    errorSave: "Erreur lors de l'enregistrement du retour.",
    amount: 'Montant du retour : {amount}',
    confirm: 'Confirmer le retour',
    payment: {
      cash: 'Espèces',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'Chèque',
      credit: "Avoir / bon d'achat",
      voucher: "Bon d'achat",
    },
  },
  ledger: {
    historyTitle: 'Historique',
    tableDate: 'Date',
    tableType: 'Type',
    tableAmount: 'Montant',
    tableNote: 'Note',
    types: {
      purchase_on_credit: 'Achat non payé',
      sale_credit: 'Vente à crédit',
      payment: 'Paiement',
      adjustment: 'Ajustement',
    },
    empty: 'Aucune écriture.',
    recordPayment: 'Enregistrer un paiement',
    paymentAmount: 'Montant (DZD)',
    paymentNote: 'Note (optionnel)',
    paymentNotePlaceholder: 'ex. paiement partiel du 12/09',
    paymentSubmit: 'Enregistrer le paiement',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  suppliers: {
    title: 'Fournisseurs',
    newSupplier: 'Nouveau fournisseur',
    tableName: 'Nom',
    tablePhone: 'Téléphone',
    tableBalance: 'Dette',
    balanceOwed: 'On doit {amount}',
    empty: 'Aucun fournisseur.',
  },
  supplierForm: {
    title: 'Nouveau fournisseur',
    name: 'Nom',
    phone: 'Téléphone',
    address: 'Adresse',
    submit: 'Créer le fournisseur',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  customers: {
    title: 'Clients',
    newCustomer: 'Nouveau client',
    tableName: 'Nom',
    tablePhone: 'Téléphone',
    tableBalance: 'Doit',
    balanceOwed: 'Nous doit {amount}',
    empty: 'Aucun client.',
  },
  customerForm: {
    title: 'Nouveau client',
    name: 'Nom',
    phone: 'Téléphone',
    submit: 'Créer le client',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  discountEditor: {
    button: 'Remise',
    label: 'Remise sur la ligne (DZD)',
    apply: 'Appliquer',
    marginWarning: 'Le prix de vente minimum de ce produit n\'est pas respecté.',
  },
  creditModal: {
    title: 'Vente à crédit',
    customerLabel: 'Client',
    customerPlaceholder: 'Rechercher un client…',
    noResults: 'Aucun client trouvé.',
    amountPaidNow: 'Montant reçu maintenant (espèces)',
    remaining: 'Reste à crédit : {amount}',
    confirm: 'Valider la vente',
    confirming: 'Encaissement…',
    errorNoCustomer: 'Sélectionnez un client.',
  },
};

const ar: TranslationDict = {
  common: {
    loading: 'جارٍ التحميل…',
    cancel: 'إلغاء',
    close: 'إغلاق',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    edit: 'تعديل',
    deactivate: 'إلغاء التفعيل',
    active: 'نشط',
    inactive: 'غير نشط',
    yes: 'نعم',
    dash: '—',
    backoffice: 'الإدارة',
    logout: 'تسجيل الخروج',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    errorGeneric: 'خطأ.',
    errorLoading: 'خطأ في التحميل.',
    paymentMethods: {
      cash: 'نقدًا',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'شيك',
      credit: 'ائتمان',
      voucher: 'قسيمة شراء',
    },
  },
  languageSwitcher: {
    label: 'اللغة',
    fr: 'FR',
    ar: 'AR',
  },
  dateRangePresets: {
    today: 'اليوم',
    '7d': 'آخر 7 أيام',
    '30d': 'آخر 30 يومًا',
    month: 'هذا الشهر',
    custom: 'مخصص',
  },
  pos: {
    title: 'الصندوق',
    backoffice: 'الإدارة',
    logout: 'تسجيل الخروج',
    searchPlaceholder: 'امسح باركود أو ابحث عن منتج…',
    noProductFound: 'لا يوجد منتج مطابق لـ « {value} »',
    noProductsSynced: 'لا يوجد أي منتج تمت مزامنته. تأكد من أن واجهة البرمجة (API) قيد التشغيل وأن البيانات الأولية تم إدخالها.',
    noSearchResults: 'لا يوجد منتج يطابق هذا البحث.',
    categoryAll: 'الكل',
    categoryOther: 'أخرى',
    demoFooter: 'شكرًا لزيارتكم!',
    cart: {
      title: 'السلة',
      empty: 'السلة فارغة — اختر منتجًا أو امسح باركود.',
      perUnit: '/ الوحدة',
      decrease: 'إنقاص',
      increase: 'زيادة',
      remove: 'إزالة',
    },
  },
  login: {
    setupTitle: 'إعداد جهاز الكاشير',
    setupSubtitle: 'تُجرى مرة واحدة فقط لكل جهاز — البيانات يزوّدك بها المدير.',
    tenantLabel: 'معرّف المتجر (tenant)',
    tenantPlaceholder: 'مثال: tenant_demo',
    storeLabel: 'نقطة البيع',
    storePlaceholder: 'مثال: store_alger_01',
    setupSubmit: 'حفظ إعدادات الجهاز',
    setupFooter: 'POS الجزائر · صندوق يعمل دون اتصال، يُزامَن تلقائيًا',
    title: 'تسجيل الدخول إلى الصندوق',
    subtitle: 'سجّل الدخول لفتح جلسة البيع',
    methodPin: 'رمز PIN',
    methodPassword: 'البريد الإلكتروني / كلمة المرور',
    pinLabel: 'رمز PIN',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'vous@commerce.dz',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    submit: 'تسجيل الدخول',
    submitting: 'جارٍ تسجيل الدخول…',
    changeStore: 'تغيير المتجر',
    errorDefault: 'تم رفض تسجيل الدخول.',
    errorGeneric: 'خطأ في تسجيل الدخول.',
  },
  adminLogin: {
    title: 'الإدارة',
    subtitle: 'سجّل الدخول لإدارة متجرك',
    tenantLabel: 'معرّف المتجر (tenant)',
    tenantPlaceholder: 'مثال: tenant_demo',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'vous@commerce.dz',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    submit: 'تسجيل الدخول',
    submitting: 'جارٍ تسجيل الدخول…',
    switchToSetup: 'متجر جديد؟ أنشئ حساب المدير الخاص بك',
    backToPos: 'العودة إلى الصندوق',
    errorDefault: 'تم رفض تسجيل الدخول.',
    errorGeneric: 'خطأ في تسجيل الدخول.',
  },
  adminSetup: {
    resultTitle: 'تم إنشاء المتجر',
    resultSubtitle: 'دوّن معرّف متجرك: سيُطلب منك عند كل تسجيل دخول إلى لوحة الإدارة.',
    copy: 'نسخ',
    copied: 'تم النسخ!',
    continueToBackoffice: 'الدخول إلى لوحة الإدارة',
    title: 'أنشئ متجرك',
    subtitle: 'سيكون هذا الحساب هو المدير الرئيسي للمتجر.',
    businessNameLabel: 'اسم المتجر',
    businessNamePlaceholder: 'مثال: بقالة أمين',
    adminNameLabel: 'اسمك',
    adminNamePlaceholder: 'مثال: أمين بن علي',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'vous@commerce.dz',
    phoneLabel: 'الهاتف (اختياري)',
    phonePlaceholder: '0555 12 34 56',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '6 أحرف على الأقل',
    submit: 'إنشاء المتجر',
    submitting: 'جارٍ الإنشاء…',
    switchToLogin: 'لديك حساب بالفعل؟ سجّل الدخول',
    errorDefault: 'تعذّر إنشاء الحساب.',
    errorGeneric: 'خطأ في الإنشاء.',
  },
  adminShell: {
    subtitle: 'الإدارة',
    nav: {
      products: 'المنتجات',
      stock: 'المخزون',
      sales: 'المبيعات',
      reports: 'التقارير',
      suppliers: 'الموردون',
      customers: 'الزبائن',
      team: 'الفريق',
      settings: 'الإعدادات',
    },
  },
  roles: {
    cashier: 'كاشير',
    stock_manager: 'مسؤول المخزون',
    store_admin: 'مدير المتجر',
    super_admin: 'المدير',
  },
  products: {
    title: 'المنتجات',
    newProduct: 'منتج جديد',
    searchPlaceholder: 'ابحث بالاسم أو SKU أو الباركود…',
    tableProduct: 'المنتج',
    tableSku: 'SKU',
    tableBarcode: 'الباركود',
    tableCategory: 'الفئة',
    tablePrice: 'السعر',
    tableTax: 'الضريبة',
    tableStatus: 'الحالة',
    empty: 'لا يوجد منتج.',
    confirmDeactivate: 'إلغاء تفعيل "{name}"؟ سيبقى ظاهرًا في السجل لكن لن يكون متاحًا للبيع.',
  },
  productForm: {
    titleEdit: 'تعديل المنتج',
    titleNew: 'منتج جديد',
    changeImage: 'تغيير الصورة',
    addImage: 'إضافة صورة',
    removeImage: 'إزالة الصورة',
    photoPlaceholder: 'صورة',
    sku: 'SKU',
    barcode: 'الباركود',
    nameFr: 'الاسم (FR)',
    nameAr: 'الاسم (AR)',
    category: 'الفئة',
    unit: 'الوحدة',
    price: 'سعر البيع (دج)',
    costPrice: 'سعر الشراء (دج)',
    minSellingPrice: 'الحد الأدنى لسعر البيع (دج)',
    minSellingPricePlaceholder: 'مثال: 9500',
    marginHint: 'الهامش التقديري: {percent}%',
    taxRate: 'الضريبة',
    taxExempt: 'معفى',
    threshold: 'حد المخزون الحرج',
    thresholdPlaceholder: 'مثال: 5',
    perishable: 'منتج قابل للتلف (يُتبع رقم الدفعة/تاريخ الصلاحية عند حركة المخزون)',
    active: 'نشط',
    errorImageType: 'يجب أن يكون الملف صورة.',
    errorImageLoad: 'تعذّر تحميل الصورة.',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  stock: {
    title: 'المخزون',
    tableCurrent: 'المخزون الحالي',
    tableThreshold: 'الحد الحرج',
    lowStock: 'مخزون منخفض',
    movementHistory: 'الحركة / السجل',
  },
  stockMovement: {
    currentStock: 'المخزون الحالي: {qty} {unit}',
    typeLabel: 'نوع الحركة',
    types: {
      purchase: 'شراء (استلام من المورد)',
      adjustment: 'تصحيح يدوي',
      inventory_count: 'جرد المخزون',
      spoilage: 'تلف / انتهاء الصلاحية',
      sale: 'بيع',
      refund: 'إرجاع',
      transfer_in: 'تحويل وارد',
      transfer_out: 'تحويل صادر',
    },
    quantityLabel: 'الكمية',
    quantityHintSigned: '(+ أو -)',
    unitCost: 'التكلفة للوحدة (دج)',
    supplier: 'المورد',
    supplierNone: '— بدون —',
    amountPaid: 'المبلغ المدفوع (دج)',
    amountPaidHint: 'يتحول الباقي إلى دين على هذا المورد.',
    lotNumber: 'رقم الدفعة',
    expiryDate: 'تاريخ الصلاحية',
    note: 'ملاحظة',
    notePlaceholder: 'مثال: جرد سنوي، كسر زجاجة…',
    save: 'حفظ الحركة',
    historyTitle: 'السجل الأخير',
    tableDate: 'التاريخ',
    tableType: 'النوع',
    tableQuantity: 'الكمية',
    tableCost: 'التكلفة',
    tableNote: 'ملاحظة',
    empty: 'لا توجد حركة مسجّلة.',
    errorSave: 'خطأ أثناء حفظ الحركة.',
  },
  sales: {
    title: 'المبيعات',
    allStores: 'جميع المتاجر',
    searchPlaceholder: 'رقم التذكرة…',
    ticket: 'التذكرة {number}',
    typeRefund: 'إرجاع',
    typeSale: 'بيع',
    cashier: 'الكاشير: {name}',
    tableItem: 'الصنف',
    tableQty: 'الكمية',
    tableUnitPrice: 'سعر الوحدة',
    tableTax: 'الضريبة',
    subtotalLine: 'المجموع الفرعي: {amount}',
    taxLine: 'الضريبة: {amount}',
    stampDutyLine: 'الطابع الجبائي: {amount}',
    totalLine: 'الإجمالي: {amount}',
    paymentLine: 'الدفع: {methods}',
    refundNotice: 'هذا إرجاع مرتبط بعملية بيع أصلية.',
    refundsDone: 'المرتجعات التي تمت',
    makeRefund: 'إجراء إرجاع',
    tableTicket: 'التذكرة',
    tableDate: 'التاريخ',
    tableCashier: 'الكاشير',
    tablePayment: 'الدفع',
    empty: 'لا توجد مبيعات في هذه الفترة.',
    payment: {
      cash: 'نقدًا',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'شيك',
      credit: 'ائتمان',
      voucher: 'قسيمة شراء',
    },
  },
  paymentBreakdown: {
    empty: 'لا توجد بيانات لهذه الفترة.',
  },
  revenueChart: {
    empty: 'لا توجد بيانات لهذه الفترة.',
    viewTable: 'عرض كجدول',
    tableDate: 'التاريخ',
    tableSales: 'المبيعات',
    tableRevenue: 'الإيرادات',
    salesCountSingular: 'عملية بيع',
    salesCountPlural: 'عمليات بيع',
  },
  reports: {
    title: 'التقارير',
    netRevenue: 'صافي الإيرادات',
    salesCountSingular: 'عملية بيع',
    salesCountPlural: 'عمليات بيع',
    avgBasket: 'متوسط السلة',
    taxCollected: 'الضريبة المحصّلة',
    refunds: 'المرتجعات',
    refundsCountSingular: 'إرجاع',
    refundsCountPlural: 'إرجاعات',
    revenueByDay: 'الإيرادات حسب اليوم',
    byPaymentMethod: 'التوزيع حسب وسيلة الدفع',
    topProducts: 'المنتجات الأكثر مبيعًا',
    tableQuantitySold: 'الكمية المباعة',
    tableRevenue: 'الإيرادات',
    noData: 'لا توجد بيانات.',
    netProfit: 'صافي الربح',
    marginHint: 'الهامش: {percent}%',
    supplierDebts: 'ديون الموردين',
    customerDebts: 'ديون الزبائن',
    topSuppliers: 'أهم الموردين',
    topCustomers: 'أهم الزبائن',
    debtTableName: 'الاسم',
    debtTableBalance: 'المبلغ المستحق',
    noDebts: 'لا توجد ديون.',
  },
  team: {
    title: 'الفريق',
    newMember: 'عضو جديد',
    tableName: 'الاسم',
    tableEmail: 'البريد الإلكتروني',
    tableRole: 'الدور',
    tablePin: 'رمز الصندوق (PIN)',
    tableStatus: 'الحالة',
    empty: 'لا يوجد أي عضو حتى الآن.',
    confirmDeactivate: 'إلغاء تفعيل حساب "{name}"؟ لن يتمكن بعد ذلك من تسجيل الدخول.',
  },
  userForm: {
    title: 'عضو جديد في الفريق',
    name: 'الاسم',
    role: 'الدور',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: '6 أحرف على الأقل',
    pin: 'رمز الصندوق (PIN)',
    pinPlaceholder: 'مثال: 1234',
    pinHint:
      'رمز PIN هو المعرّف الذي يستخدمه الكاشير لتسجيل الدخول إلى الصندوق (معرّف المتجر + رمز PIN، دون الحاجة إلى بريد إلكتروني أو كلمة مرور).',
    submit: 'إنشاء الحساب',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  settings: {
    title: 'إعدادات المتجر',
  },
  tenantSettings: {
    changeLogo: 'تغيير الشعار',
    addLogo: 'إضافة شعار',
    removeLogo: 'إزالة الشعار',
    logoPlaceholder: 'الشعار',
    name: 'اسم المتجر',
    phone: 'الهاتف',
    phonePlaceholder: '0555 12 34 56',
    primaryColor: 'اللون الأساسي',
    secondaryColor: 'اللون الثانوي',
    saved: 'تم حفظ الإعدادات.',
    errorImageType: 'يجب أن يكون الملف صورة.',
    errorImageLoad: 'تعذّر تحميل الصورة.',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  saleCheckout: {
    cash: 'نقدًا',
    credit: 'بيع بالدين',
    processing: 'جارٍ المعالجة…',
    errorGeneric: 'خطأ أثناء إتمام الدفع. أعد المحاولة.',
  },
  cashModal: {
    title: 'الدفع نقدًا',
    totalToPay: 'المبلغ الإجمالي المستحق',
    amountReceived: 'المبلغ المستلم',
    exact: 'المبلغ المضبوط',
    changeDue: 'الباقي المستحق',
    insufficientAmount: 'المبلغ غير كافٍ',
    confirm: 'تأكيد الدفع',
    confirming: 'جارٍ التحصيل…',
  },
  receipt: {
    paymentAccepted: 'تم قبول الدفع',
    ticket: 'التذكرة {number}',
    discount: 'الخصم',
    taxIncluded: 'منها الضريبة',
    paymentMethod: 'طريقة الدفع',
    received: 'المستلم',
    changeGiven: 'الباقي المُعاد',
    print: 'طباعة',
    newSale: 'عملية بيع جديدة',
    payment: {
      cash: 'نقدًا',
      cib: 'CIB / Edahabia',
      edahabia: 'Edahabia',
      cheque: 'شيك',
      credit: 'ائتمان',
      voucher: 'قسيمة شراء',
    },
  },
  offlineBanner: {
    text: 'وضع عدم الاتصال — يتم تسجيل المبيعات محليًا وستتم مزامنتها تلقائيًا عند عودة الاتصال.',
  },
  refundForm: {
    title: 'إجراء إرجاع',
    tableSold: 'المُباع',
    tableAlreadyRefunded: 'المُرجَع سابقًا',
    tableToRefund: 'المطلوب إرجاعه',
    refundVia: 'استرداد عبر',
    note: 'ملاحظة (اختياري)',
    notePlaceholder: 'مثال: منتج معيب',
    restock: 'إعادة الأصناف إلى المخزون',
    errorNoQuantity: 'أدخل كمية واحدة على الأقل لإرجاعها.',
    errorSave: 'خطأ أثناء حفظ عملية الإرجاع.',
    amount: 'مبلغ الإرجاع: {amount}',
    confirm: 'تأكيد الإرجاع',
    payment: {
      cash: 'نقدًا',
      cib: 'CIB',
      edahabia: 'Edahabia',
      cheque: 'شيك',
      credit: 'رصيد / قسيمة شراء',
      voucher: 'قسيمة شراء',
    },
  },
  ledger: {
    historyTitle: 'السجل',
    tableDate: 'التاريخ',
    tableType: 'النوع',
    tableAmount: 'المبلغ',
    tableNote: 'ملاحظة',
    types: {
      purchase_on_credit: 'شراء غير مدفوع',
      sale_credit: 'بيع بالدين',
      payment: 'دفعة',
      adjustment: 'تسوية',
    },
    empty: 'لا توجد أي حركة.',
    recordPayment: 'تسجيل دفعة',
    paymentAmount: 'المبلغ (دج)',
    paymentNote: 'ملاحظة (اختياري)',
    paymentNotePlaceholder: 'مثال: دفعة جزئية بتاريخ 12/09',
    paymentSubmit: 'تسجيل الدفعة',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  suppliers: {
    title: 'الموردون',
    newSupplier: 'مورد جديد',
    tableName: 'الاسم',
    tablePhone: 'الهاتف',
    tableBalance: 'الدين',
    balanceOwed: 'نحن مدينون بـ {amount}',
    empty: 'لا يوجد أي مورد.',
  },
  supplierForm: {
    title: 'مورد جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    address: 'العنوان',
    submit: 'إنشاء المورد',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  customers: {
    title: 'الزبائن',
    newCustomer: 'زبون جديد',
    tableName: 'الاسم',
    tablePhone: 'الهاتف',
    tableBalance: 'مدين لنا',
    balanceOwed: 'مدين لنا بـ {amount}',
    empty: 'لا يوجد أي زبون.',
  },
  customerForm: {
    title: 'زبون جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    submit: 'إنشاء الزبون',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  discountEditor: {
    button: 'خصم',
    label: 'خصم على السطر (دج)',
    apply: 'تطبيق',
    marginWarning: 'الحد الأدنى لسعر بيع هذا المنتج غير محترم.',
  },
  creditModal: {
    title: 'بيع بالدين',
    customerLabel: 'الزبون',
    customerPlaceholder: 'ابحث عن زبون…',
    noResults: 'لم يتم العثور على أي زبون.',
    amountPaidNow: 'المبلغ المستلم الآن (نقدًا)',
    remaining: 'الباقي كدين: {amount}',
    confirm: 'تأكيد البيع',
    confirming: 'جارٍ التحصيل…',
    errorNoCustomer: 'اختر زبونًا.',
  },
};

export const translations: Record<Locale, TranslationDict> = { fr, ar };
