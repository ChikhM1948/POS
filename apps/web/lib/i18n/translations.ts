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
    reactivate: string;
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
    promoBadge: string;
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
      clear: string;
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
    localNotConfigured: string;
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
    methodEmail: string;
    methodPhone: string;
    phoneLoginLabel: string;
    errorInvalidEmail: string;
    errorInvalidPhone: string;
    modeLabel: string;
    modeSyncTitle: string;
    modeSyncDescription: string;
    modeLocalTitle: string;
    modeLocalDescription: string;
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
      taxes: string;
      documents: string;
      accounting: string;
      suppliers: string;
      barcodes: string;
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
    deletePermanently: string;
    confirmDeletePermanently: string;
  };
  barcodes: {
    title: string;
    print: string;
    selectAll: string;
    clear: string;
    generate: string;
    generateMissing: string;
    copies: string;
    labelSize: string;
    a4Sheet: string;
    showName: string;
    showPrice: string;
    showCode: string;
    rotate: string;
    offsetY: string;
    offsetYHint: string;
    usesSku: string;
    hint: string;
    preview: string;
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
    promoPrice: string;
    promoStart: string;
    promoEnd: string;
    soldByWeight: string;
    marginHint: string;
    taxRate: string;
    taxExempt: string;
    threshold: string;
    thresholdPlaceholder: string;
    perishable: string;
    unitOther: string;
    unitCustomPlaceholder: string;
    initialQuantity: string;
    addQuantity: string;
    initialQuantityHint: string;
    expiryDate: string;
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
    outOfStock: string;
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
    tablePurchasePrice: string;
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
    canViewPurchasePrice: string;
    submit: string;
    errorSave: string;
  };
  cloudSync: {
    title: string;
    intro: string;
    serverUrl: string;
    email: string;
    password: string;
    connect: string;
    connecting: string;
    connected: string;
    syncNow: string;
    syncing: string;
    disconnect: string;
    pending: string;
    lastSync: string;
    never: string;
    errorPrefix: string;
    passwordNote: string;
  };
  backup: {
    title: string;
    intro: string;
    folder: string;
    choose: string;
    folderPlaceholder: string;
    auto: string;
    every: string;
    hours: string;
    keep: string;
    save: string;
    backupNow: string;
    working: string;
    lastBackup: string;
    never: string;
    errorPrefix: string;
    unavailable: string;
    available: string;
    history: string;
    noBackups: string;
    restore: string;
    restoreFromFile: string;
    restoreConfirm: string;
    restoring: string;
    secretsNote: string;
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
    palette: string;
    palettePresets: string;
    preview: string;
    resetColors: string;
    lowContrast: string;
    invalidColor: string;
    syncEnabled: string;
    syncEnabledHint: string;
    saved: string;
    errorImageType: string;
    errorImageLoad: string;
    errorSave: string;
    legalTitle: string;
    address: string;
    nif: string;
    nis: string;
    rc: string;
    ai: string;
    taxRegime: string;
    taxRegimeReal: string;
    taxRegimeIfu: string;
    taxRegimeHint: string;
  };
  taxes: {
    title: string;
    titleG50: string;
    titleG12: string;
    print: string;
    regimeLabel: string;
    regimeIfu: string;
    regimeReal: string;
    hintG50: string;
    hintG12: string;
    turnoverHt: string;
    turnoverTtc: string;
    tvaCollected: string;
    stampDuty: string;
    cashPart: string;
    refundsShort: string;
    g50Table: string;
    rate: string;
    baseHt: string;
    tva: string;
    ttc: string;
    exempt: string;
    total: string;
    empty: string;
    annualTurnover: string;
    ifuEstimate: string;
    ifuMin: string;
    ceiling: string;
    ceilingNear: string;
    ceilingExceeded: string;
    activityType: string;
    activityGoods: string;
    activityServices: string;
    monthly: string;
    month: string;
    turnover: string;
    disclaimer: string;
  };
  hold: {
    button: string;
    title: string;
    empty: string;
    resume: string;
    discard: string;
    items: string;
    heldAt: string;
    swapped: string;
  };
  shortcuts: {
    title: string;
    scan: string;
    cash: string;
    cib: string;
    credit: string;
    hold: string;
    recall: string;
    discount: string;
    clear: string;
    qty: string;
    remove: string;
    select: string;
    toggle: string;
  };
  expiry: {
    expired: string;
    daysLeft: string;
    expiredWarning: string;
  };
  inventory: {
    tabStock: string;
    tabBatches: string;
    tabReorder: string;
    lowOnly: string;
    alertsLow: string;
    alertsExpiring: string;
    alertsExpired: string;
    batchesIntro: string;
    tableLot: string;
    tableExpiry: string;
    tableQuantity: string;
    tableStatus: string;
    noLot: string;
    noExpiry: string;
    statusExpired: string;
    statusSoon: string;
    statusOk: string;
    noBatches: string;
    reorderIntro: string;
    reorderEmpty: string;
    noSupplier: string;
    suggested: string;
    orderQty: string;
    currentQty: string;
    threshold: string;
    unitCost: string;
    estimatedTotal: string;
    print: string;
    copy: string;
    copied: string;
    orderTitle: string;
    orderDate: string;
    supplier: string;
    product: string;
    quantity: string;
    lineTotal: string;
  };
  docs: {
    invoice: string;
    deliveryNote: string;
    proforma: string;
    menuLabel: string;
    print: string;
    back: string;
    clientInfo: string;
    clientName: string;
    clientAddress: string;
    clientNote: string;
    nif: string;
    nis: string;
    rc: string;
    ai: string;
    phone: string;
    number: string;
    date: string;
    designation: string;
    qty: string;
    unitHt: string;
    vat: string;
    totalHt: string;
    base: string;
    vatAmount: string;
    totalVat: string;
    totalTtc: string;
    stampDuty: string;
    netToPay: string;
    paymentMode: string;
    proformaNote: string;
    proformaValidity: string;
    refundNotice: string;
    receivedBy: string;
    signatureSeller: string;
    missingLegal: string;
    amountInWords: string;
    quote: string;
    order: string;
    validUntil: string;
    dueDate: string;
    saleRef: string;
    sourceRef: string;
    cancelledStamp: string;
    notes: string;
    einvoicePending: string;
    issueAndShow: string;
    issuing: string;
    issueNote: string;
    errorIssue: string;
    deliveryNoteNoPrice: string;
  };
  documents: {
    title: string;
    newDocument: string;
    searchPlaceholder: string;
    allKinds: string;
    allStatuses: string;
    statusIssued: string;
    statusCancelled: string;
    colNumber: string;
    colType: string;
    colDate: string;
    colClient: string;
    colTotal: string;
    colStatus: string;
    colRef: string;
    empty: string;
    view: string;
    convertTo: string;
    cancelAction: string;
    cancelReason: string;
    cancelReasonPlaceholder: string;
    cancelConfirm: string;
    cancelledBanner: string;
    converted: string;
    einvoiceTitle: string;
    einvoiceStatus: Record<'not_submitted' | 'pending' | 'submitted' | 'accepted' | 'rejected', string>;
    einvoiceNote: string;
    integrityTitle: string;
    buyerSection: string;
    linesSection: string;
    addLine: string;
    removeLine: string;
    designation: string;
    quantity: string;
    unitHt: string;
    discount: string;
    vatRate: string;
    lineTotal: string;
    paymentMethod: string;
    noPayment: string;
    validUntil: string;
    notes: string;
    totalHt: string;
    totalVat: string;
    totalTtc: string;
    stampDuty: string;
    netToPay: string;
    pickProduct: string;
    submit: string;
    submitting: string;
    errorLines: string;
    numberingNote: string;
    errorLoad: string;
  };
  accounting: {
    title: string;
    subtitle: string;
    periodMonth: string;
    periodQuarter: string;
    periodYear: string;
    quarter: string;
    allStores: string;
    salesCount: string;
    refundsCount: string;
    invoicesCount: string;
    totalHt: string;
    totalVat: string;
    totalTtc: string;
    stampDuty: string;
    vatByRate: string;
    vatByMonth: string;
    journal: string;
    journalHint: string;
    exportCsv: string;
    exportXlsx: string;
    print: string;
    noData: string;
    disclaimer: string;
    sourceNote: string;
    colDate: string;
    colType: string;
    colNumber: string;
    colInvoice: string;
    colClient: string;
    colNif: string;
    colBase: string;
    colVat: string;
    colTotalHt: string;
    colTotalVat: string;
    colTotalTtc: string;
    colStamp: string;
    colPayment: string;
    colRate: string;
    colMonth: string;
    total: string;
    kindSale: string;
    kindRefund: string;
    kindInvoice: string;
    journalFile: string;
    vatFile: string;
    workbookFile: string;
    exportAll: string;
  };
  priceHistory: {
    button: string;
    title: string;
    empty: string;
    colProduct: string;
    colLatest: string;
    colPrevious: string;
    colChange: string;
    colHistory: string;
    alertBadge: string;
    alertBanner: string;
    thresholdHint: string;
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
    openDrawer: string;
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
    localModeText: string;
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
    modePayment: string;
    debtAmount: string;
    debtNotePlaceholder: string;
    debtSubmit: string;
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
    totalLabel: string;
    countLabel: string;
    onlyWithBalance: string;
    searchPlaceholder: string;
    settle: string;
    addDebt: string;
  };
  supplierForm: {
    title: string;
    name: string;
    phone: string;
    address: string;
    submit: string;
    errorSave: string;
    openingBalance: string;
  };
  customers: {
    title: string;
    newCustomer: string;
    tableName: string;
    tablePhone: string;
    tableBalance: string;
    balanceOwed: string;
    empty: string;
    totalLabel: string;
    countLabel: string;
    onlyWithBalance: string;
    searchPlaceholder: string;
    settle: string;
    addDebt: string;
  };
  customerForm: {
    title: string;
    name: string;
    phone: string;
    submit: string;
    errorSave: string;
    openingBalance: string;
    creditLimit: string;
  };
  discountEditor: {
    button: string;
    label: string;
    apply: string;
    marginWarning: string;
  };
  weightModal: {
    title: string;
    label: string;
    confirm: string;
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
    limitInfo: string;
    limitExceeded: string;
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
    reactivate: 'Réactiver',
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
    promoBadge: 'Promo',
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
      clear: 'Vider',
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
    localNotConfigured: "Aucun commerce n'est encore enregistré sur ce poste. Ouvrez le back-office (Ctrl+2) pour créer votre compte administrateur.",
    title: 'Connexion caisse',
    subtitle: 'Identifiez-vous pour ouvrir la session de vente',
    methodPin: 'Code PIN',
    methodPassword: 'Email ou téléphone / mot de passe',
    pinLabel: 'Code PIN',
    emailLabel: 'Email ou téléphone',
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
    emailLabel: 'Email ou téléphone',
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
    methodEmail: 'Email',
    methodPhone: 'Téléphone',
    phoneLoginLabel: 'Numéro de téléphone',
    errorInvalidEmail: 'Saisissez une adresse email valide.',
    errorInvalidPhone: 'Saisissez un numéro de téléphone valide (8 à 15 chiffres).',
    modeLabel: 'Mode de fonctionnement',
    modeSyncTitle: 'Synchronisé',
    modeSyncDescription: 'Données en ligne, accessibles depuis le web.',
    modeLocalTitle: 'Local',
    modeLocalDescription: 'Hors ligne uniquement, aucune donnée envoyée en ligne.',
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
      taxes: 'Déclarations',
      documents: 'Documents',
      accounting: 'Export comptable',
      suppliers: 'Fournisseurs',
      barcodes: 'Étiquettes',
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
    deletePermanently: 'Supprimer',
    confirmDeletePermanently: 'Supprimer définitivement "{name}" ? Cette action est irréversible. Elle est refusée si le produit apparaît dans des ventes, des documents ou des mouvements de stock.',
  },
  barcodes: {
    title: 'Étiquettes code-barres',
    print: 'Imprimer',
    selectAll: 'Tout sélectionner',
    clear: 'Désélectionner',
    generate: 'Générer',
    generateMissing: 'Générer les {count} codes manquants',
    copies: 'Copies',
    labelSize: 'Format d\'étiquette',
    a4Sheet: 'Planche A4 (3 × 7)',
    showName: 'Nom du produit',
    showPrice: 'Prix',
    showCode: 'Numéro sous le code',
    rotate: 'Pivoter de 90° (si l’impression sort à la verticale)',
    offsetY: 'Décalage vertical',
    offsetYHint: 'Si le contenu est coupé en haut, augmentez ; coupé en bas, diminuez. Test avec une seule étiquette.',
    usesSku: '{count} produit(s) sans code-barres : le SKU sera utilisé.',
    hint: 'Dans la fenêtre d\'impression, choisissez votre imprimante d\'étiquettes, marges « Aucune » et échelle 100 %.',
    preview: 'Aperçu',
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
    promoPrice: 'Prix promo (DZD, optionnel)',
    promoStart: 'Début promo',
    promoEnd: 'Fin promo',
    soldByWeight: 'Vendu au poids — le prix de vente est le prix par unité de poids (ex. kg). Code-barres balance : « 2XXXXXX » (7 premiers chiffres).',
    marginHint: 'Marge estimée : {percent}%',
    taxRate: 'TVA',
    taxExempt: 'Exonéré',
    threshold: 'Seuil critique de stock',
    thresholdPlaceholder: 'ex. 5',
    perishable: 'Produit périssable (lot / date de péremption suivis au mouvement de stock)',
    unitOther: 'Autre…',
    unitCustomPlaceholder: 'Saisir une unité',
    initialQuantity: 'Quantité en stock (initiale)',
    addQuantity: 'Quantité à ajouter au stock',
    initialQuantityHint: 'Enregistrée comme premier mouvement de stock.',
    expiryDate: 'Date de péremption',
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
    outOfStock: 'Rupture de stock',
    movementHistory: 'Ajouter du stock / historique',
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
    tablePurchasePrice: "Voit le prix d'achat",
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
    canViewPurchasePrice: "Autoriser ce caissier à voir le prix d'achat des produits",
    submit: 'Créer le compte',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  cloudSync: {
    title: 'Synchronisation en ligne',
    intro: "Envoie automatiquement vos données (ventes, stock, produits, clients) vers la base en ligne avec le même compte. Fonctionne sans Internet : l'envoi reprend dès que la connexion revient.",
    serverUrl: 'Adresse du serveur en ligne',
    email: 'Email ou téléphone administrateur',
    password: 'Mot de passe',
    connect: 'Connecter et synchroniser',
    connecting: 'Connexion…',
    connected: 'Connecté à',
    syncNow: 'Synchroniser maintenant',
    syncing: 'Synchronisation…',
    disconnect: 'Déconnecter',
    pending: 'Éléments en attente',
    lastSync: 'Dernière synchro',
    never: 'jamais',
    errorPrefix: 'Dernière erreur',
    passwordNote: 'Le mot de passe est conservé sur ce poste pour reconnecter automatiquement le compte en ligne.',
  },
  backup: {
    title: 'Sauvegarde et restauration',
    intro: "Copie automatiquement la base de ce poste (ventes, stock, clients…) vers une clé USB, un disque externe ou un dossier synchronisé par un service cloud (Google Drive, OneDrive, Dropbox).",
    folder: 'Dossier de sauvegarde',
    choose: 'Parcourir…',
    folderPlaceholder: 'Ex. E:\\Sauvegardes-POS',
    auto: 'Sauvegarde automatique',
    every: 'Toutes les',
    hours: 'heures',
    keep: 'Copies conservées',
    save: 'Enregistrer',
    backupNow: 'Sauvegarder maintenant',
    working: 'En cours…',
    lastBackup: 'Dernière sauvegarde',
    never: 'jamais',
    errorPrefix: 'Dernière erreur',
    unavailable: 'Dossier inaccessible — clé USB débranchée ?',
    available: 'Dossier accessible',
    history: 'Sauvegardes disponibles',
    noBackups: 'Aucune sauvegarde dans ce dossier.',
    restore: 'Restaurer',
    restoreFromFile: 'Restaurer depuis un fichier…',
    restoreConfirm: "Remplacer TOUTES les données actuelles par cette sauvegarde ? Les ventes faites depuis seront perdues (une copie de l'état actuel est gardée dans le dossier pre-restore). L'application va redémarrer.",
    restoring: 'Restauration… redémarrage de l’application.',
    secretsNote: 'Les identifiants de la synchronisation en ligne ne sont pas inclus dans les sauvegardes.',
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
    secondaryColor: 'Couleur secondaire (accent)',
    palette: 'Palette de couleurs',
    palettePresets: 'Palettes prêtes à l’emploi',
    preview: 'Aperçu',
    resetColors: 'Rétablir les couleurs par défaut',
    lowContrast: 'Couleur trop claire : le texte blanc des boutons sera difficile à lire. Choisissez une teinte plus foncée.',
    invalidColor: 'Couleur invalide (format #RRGGBB).',
    syncEnabled: 'Synchronisation en ligne',
    syncEnabledHint: 'Activée : les données sont accessibles depuis le web. Désactivée : le commerce reste local, aucune donnée ne quitte le poste.',
    saved: 'Paramètres enregistrés.',
    errorImageType: 'Le fichier doit être une image.',
    errorImageLoad: "Impossible de charger l'image.",
    errorSave: "Erreur lors de l'enregistrement.",
    legalTitle: 'Informations légales (factures, bons de livraison)',
    address: 'Adresse',
    nif: 'NIF',
    nis: 'NIS',
    rc: 'RC (registre de commerce)',
    ai: 'AI (article d’imposition)',
    taxRegime: 'Régime fiscal',
    taxRegimeReal: 'Réel (déclaration G50)',
    taxRegimeIfu: 'IFU forfaitaire (déclaration G12)',
    taxRegimeHint: 'Détermine la déclaration proposée dans Déclarations.',
  },
  taxes: {
    title: "Déclarations fiscales",
    titleG50: "Déclaration G50 (régime du réel)",
    titleG12: "Déclaration G12 (IFU)",
    print: "Imprimer",
    regimeLabel: "Régime fiscal",
    regimeIfu: "IFU (forfaitaire)",
    regimeReal: "Réel",
    hintG50: "à déposer avant le 20 du mois suivant (vérifiez la périodicité auprès de votre inspection).",
    hintG12: "G12 : déclaration prévisionnelle ; G12 bis : chiffre d’affaires réalisé, en début d’année suivante.",
    turnoverHt: "Chiffre d’affaires HT",
    turnoverTtc: "Chiffre d’affaires TTC",
    tvaCollected: "TVA collectée",
    stampDuty: "Droit de timbre",
    cashPart: "Part espèces",
    refundsShort: "retour(s)",
    g50Table: "TVA par taux (ventes moins retours)",
    rate: "Taux",
    baseHt: "Base HT",
    tva: "TVA",
    ttc: "TTC",
    exempt: "Exonéré",
    total: "Total",
    empty: "Aucune vente sur la période.",
    annualTurnover: "Chiffre d’affaires annuel",
    ifuEstimate: "IFU estimé",
    ifuMin: "minimum",
    ceiling: "Seuil du régime IFU",
    ceilingNear: "Le chiffre d’affaires approche du seuil du régime IFU : anticipez un passage au régime du réel.",
    ceilingExceeded: "Le chiffre d’affaires dépasse le seuil du régime IFU : le passage au régime du réel est probablement obligatoire.",
    activityType: "Nature de l’activité",
    activityGoods: "Vente / production de biens",
    activityServices: "Prestations de services",
    monthly: "Chiffre d’affaires par mois",
    month: "Mois",
    turnover: "Chiffre d’affaires",
    disclaimer: "Document de préparation calculé depuis vos ventes : il ne remplace pas la déclaration officielle. Taux et seuils (voir lib/taxDeclarations.ts) à confirmer avec votre comptable ou l’inspection des impôts.",
  },
  hold: {
    button: 'Mettre en attente',
    title: 'Paniers en attente',
    empty: 'Aucun panier en attente.',
    resume: 'Reprendre',
    discard: 'Supprimer',
    items: '{n} article(s)',
    heldAt: 'Mis en attente à {time}',
    swapped: 'Le panier en cours a été mis en attente.',
  },
  shortcuts: {
    title: 'Raccourcis clavier',
    scan: 'Scanner / rechercher',
    cash: 'Encaisser en espèces',
    cib: 'Paiement CIB / Edahabia',
    credit: 'Crédit client',
    hold: 'Mettre en attente',
    recall: 'Paniers en attente',
    discount: 'Remise sur la ligne',
    clear: 'Vider le panier',
    qty: 'Quantité +/−',
    remove: 'Retirer la ligne',
    select: 'Sélectionner une ligne',
    toggle: 'Afficher / masquer cette aide',
  },
  expiry: {
    expired: 'Périmé',
    daysLeft: 'Expire dans {n} j',
    expiredWarning: '« {name} » : un lot périmé est encore en stock !',
  },
  inventory: {
    tabStock: 'Stock',
    tabBatches: 'Lots & péremption',
    tabReorder: 'À réapprovisionner',
    lowOnly: 'Stock faible uniquement',
    alertsLow: '{n} produit(s) sous le seuil',
    alertsExpiring: '{n} lot(s) bientôt périmé(s)',
    alertsExpired: '{n} lot(s) périmé(s)',
    batchesIntro: 'Les ventes décomptent automatiquement le lot qui expire en premier (FEFO).',
    tableLot: 'Lot',
    tableExpiry: 'Péremption',
    tableQuantity: 'Quantité',
    tableStatus: 'État',
    noLot: 'Sans n° de lot',
    noExpiry: 'Sans date',
    statusExpired: 'Périmé',
    statusSoon: 'Bientôt périmé',
    statusOk: 'OK',
    noBatches: 'Aucun lot suivi. Renseignez un lot et une date de péremption lors d’une réception (produit périssable).',
    reorderIntro: 'Produits sous leur seuil, regroupés par fournisseur habituel. Ajustez les quantités puis imprimez le bon de commande.',
    reorderEmpty: 'Rien à commander : tous les produits avec seuil sont au-dessus de leur seuil.',
    noSupplier: 'Fournisseur non défini',
    suggested: 'Suggéré',
    orderQty: 'Qté à commander',
    currentQty: 'En stock',
    threshold: 'Seuil',
    unitCost: 'Dernier coût',
    estimatedTotal: 'Total estimé',
    print: 'Imprimer le bon de commande',
    copy: 'Copier (WhatsApp)',
    copied: 'Copié !',
    orderTitle: 'Bon de commande',
    orderDate: 'Date',
    supplier: 'Fournisseur',
    product: 'Produit',
    quantity: 'Quantité',
    lineTotal: 'Montant',
  },
  docs: {
    invoice: 'Facture',
    deliveryNote: 'Bon de livraison',
    proforma: 'Facture proforma',
    menuLabel: 'Documents',
    print: 'Imprimer (A4)',
    back: 'Retour',
    clientInfo: 'Informations client (facultatif pour un particulier)',
    clientName: 'Nom / Raison sociale',
    clientAddress: 'Adresse',
    clientNote: 'Pour une vente à une entreprise, renseignez NIF, RC, NIS et AI du client.',
    nif: 'NIF',
    nis: 'NIS',
    rc: 'RC',
    ai: 'AI',
    phone: 'Tél',
    number: 'N°',
    date: 'Date',
    designation: 'Désignation',
    qty: 'Qté',
    unitHt: 'P.U. HT',
    vat: 'TVA',
    totalHt: 'Total HT',
    base: 'Base HT',
    vatAmount: 'Montant TVA',
    totalVat: 'Total TVA',
    totalTtc: 'Total TTC',
    stampDuty: 'Droit de timbre',
    netToPay: 'Net à payer',
    paymentMode: 'Mode de paiement',
    proformaNote: "Document non valable comme facture — il ne constitue pas une demande de paiement.",
    proformaValidity: 'Offre valable 15 jours.',
    refundNotice: "Ce document est un retour : utilisez la vente d'origine pour générer une facture.",
    receivedBy: 'Reçu par (nom, date, signature)',
    signatureSeller: 'Cachet et signature',
    missingLegal: "Mentions légales incomplètes : renseignez NIF, NIS, RC, AI et adresse dans Paramètres.",
    amountInWords: 'Arrêté le présent document à la somme de :',
    quote: 'Devis',
    order: 'Bon de commande',
    validUntil: 'Valable jusqu’au',
    dueDate: 'Échéance',
    saleRef: 'Ticket de caisse',
    sourceRef: 'Établi depuis',
    cancelledStamp: 'ANNULÉ',
    notes: 'Observations',
    einvoicePending: 'Facturation électronique : transmission non activée (données prêtes).',
    issueAndShow: 'Émettre le document',
    issuing: 'Émission…',
    issueNote: 'Le numéro est attribué à l’émission et ne pourra plus être modifié ni réutilisé. Un document émis ne s’annule que par un motif consigné.',
    errorIssue: 'Impossible d’émettre le document.',
    deliveryNoteNoPrice: 'Sans prix',
  },
  documents: {
    title: 'Documents commerciaux',
    newDocument: 'Nouveau document',
    searchPlaceholder: 'N° de document, client ou ticket…',
    allKinds: 'Tous les types',
    allStatuses: 'Tous les statuts',
    statusIssued: 'Émis',
    statusCancelled: 'Annulé',
    colNumber: 'N°',
    colType: 'Type',
    colDate: 'Date',
    colClient: 'Client',
    colTotal: 'Total TTC',
    colStatus: 'Statut',
    colRef: 'Référence',
    empty: 'Aucun document pour ces filtres.',
    view: 'Voir',
    convertTo: 'Transformer en',
    cancelAction: 'Annuler le document',
    cancelReason: 'Motif d’annulation',
    cancelReasonPlaceholder: 'Ex. erreur de saisie, client désisté…',
    cancelConfirm: 'Confirmer l’annulation',
    cancelledBanner: 'Document annulé — son numéro reste dans la séquence et ne sera pas réattribué.',
    converted: 'Document {number} émis.',
    einvoiceTitle: 'Facturation électronique',
    einvoiceStatus: {
      not_submitted: 'Non transmis',
      pending: 'En attente',
      submitted: 'Transmis',
      accepted: 'Accepté',
      rejected: 'Rejeté',
    },
    einvoiceNote: 'Chaque document porte déjà un identifiant unique, les identités figées du vendeur et de l’acheteur, les montants HT/TVA par taux et une empreinte chaînée. La transmission à l’administration sera branchée sur ces données dès que le format officiel sera arrêté.',
    integrityTitle: 'Empreinte d’intégrité',
    buyerSection: 'Client',
    linesSection: 'Lignes',
    addLine: 'Ajouter une ligne',
    removeLine: 'Retirer',
    designation: 'Désignation',
    quantity: 'Qté',
    unitHt: 'P.U. HT',
    discount: 'Remise HT',
    vatRate: 'TVA',
    lineTotal: 'Total HT',
    paymentMethod: 'Mode de règlement',
    noPayment: 'Non précisé',
    validUntil: 'Valable jusqu’au',
    notes: 'Observations',
    totalHt: 'Total HT',
    totalVat: 'Total TVA',
    totalTtc: 'Total TTC',
    stampDuty: 'Droit de timbre',
    netToPay: 'Net à payer',
    pickProduct: 'Ajouter un produit du catalogue…',
    submit: 'Émettre',
    submitting: 'Émission…',
    errorLines: 'Ajoutez au moins une ligne avec une désignation et une quantité.',
    numberingNote: 'Numérotation continue par type et par année (ex. FA-2026-00001), sans trou ni réutilisation.',
    errorLoad: 'Impossible de charger les documents.',
  },
  accounting: {
    title: 'Export comptable',
    subtitle: 'Journal des ventes et récapitulatif TVA pour la déclaration G50.',
    periodMonth: 'Mois',
    periodQuarter: 'Trimestre',
    periodYear: 'Année',
    quarter: 'T{n}',
    allStores: 'Toutes les boutiques',
    salesCount: 'Tickets',
    refundsCount: 'Retours',
    invoicesCount: 'Factures hors caisse',
    totalHt: 'Chiffre d’affaires HT',
    totalVat: 'TVA collectée',
    totalTtc: 'Total TTC',
    stampDuty: 'Droit de timbre',
    vatByRate: 'TVA par taux',
    vatByMonth: 'TVA par mois',
    journal: 'Journal des ventes',
    journalHint: '{count} écriture(s)',
    exportCsv: 'CSV',
    exportXlsx: 'Excel (XLSX)',
    print: 'Imprimer',
    noData: 'Aucune écriture sur cette période.',
    disclaimer: 'Récapitulatif indicatif établi à partir des ventes enregistrées : à faire valider par votre comptable avant dépôt de la G50.',
    sourceNote: 'Tickets de caisse nets des retours + factures émises hors caisse et non annulées. Les factures tirées d’un ticket ne sont pas comptées deux fois. Les achats (TVA déductible) ne figurent pas ici.',
    colDate: 'Date',
    colType: 'Type',
    colNumber: 'N° pièce',
    colInvoice: 'N° facture',
    colClient: 'Client',
    colNif: 'NIF client',
    colBase: 'Base HT',
    colVat: 'TVA',
    colTotalHt: 'Total HT',
    colTotalVat: 'Total TVA',
    colTotalTtc: 'Total TTC',
    colStamp: 'Timbre',
    colPayment: 'Règlement',
    colRate: 'Taux',
    colMonth: 'Mois',
    total: 'Total',
    kindSale: 'Vente',
    kindRefund: 'Retour',
    kindInvoice: 'Facture',
    journalFile: 'journal-ventes',
    vatFile: 'recap-tva',
    workbookFile: 'export-comptable',
    exportAll: 'Exports',
  },
  priceHistory: {
    button: 'Prix d’achat',
    title: 'Historique des prix d’achat — {name}',
    empty: 'Aucun achat enregistré chez ce fournisseur.',
    colProduct: 'Produit',
    colLatest: 'Dernier prix',
    colPrevious: 'Précédent',
    colChange: 'Variation',
    colHistory: 'Historique',
    alertBadge: '{count} hausse(s)',
    alertBanner: 'Ce fournisseur a augmenté ses prix sur {count} produit(s).',
    thresholdHint: 'Alerte à partir de +3 % entre les deux derniers achats.',
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
    openDrawer: 'Ouvrir le tiroir-caisse',
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
    localModeText: 'Mode local — ce commerce ne synchronise pas ses données en ligne.',
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
    modePayment: 'Paiement',
    debtAmount: 'Montant à ajouter (DZD)',
    debtNotePlaceholder: 'ex. ancien solde, marchandise du 05/10',
    debtSubmit: 'Ajouter au solde',
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
    tableBalance: 'Dette (on doit)',
    balanceOwed: 'On doit {amount}',
    empty: 'Aucun fournisseur.',
    totalLabel: 'Total des dettes fournisseurs',
    countLabel: '{count} fournisseur(s) à payer',
    onlyWithBalance: 'Avec dette uniquement',
    searchPlaceholder: 'Rechercher un fournisseur…',
    settle: 'Payer',
    addDebt: 'Ajouter une dette',
  },
  supplierForm: {
    title: 'Nouveau fournisseur',
    name: 'Nom',
    phone: 'Téléphone',
    address: 'Adresse',
    openingBalance: 'Dette initiale envers ce fournisseur (DZD, optionnel)',
    submit: 'Créer le fournisseur',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  customers: {
    title: 'Clients',
    newCustomer: 'Nouveau client',
    tableName: 'Nom',
    tablePhone: 'Téléphone',
    tableBalance: 'Créance (nous doit)',
    balanceOwed: 'Nous doit {amount}',
    empty: 'Aucun client.',
    totalLabel: 'Total des créances clients',
    countLabel: '{count} client(s) débiteur(s)',
    onlyWithBalance: 'Avec créance uniquement',
    searchPlaceholder: 'Rechercher un client…',
    settle: 'Encaisser',
    addDebt: 'Ajouter une créance',
  },
  customerForm: {
    title: 'Nouveau client',
    name: 'Nom',
    phone: 'Téléphone',
    openingBalance: 'Créance initiale — ce client nous doit (DZD, optionnel)',
    creditLimit: 'Plafond de crédit (DZD, vide = illimité)',
    submit: 'Créer le client',
    errorSave: "Erreur lors de l'enregistrement.",
  },
  discountEditor: {
    button: 'Remise',
    label: 'Remise sur la ligne (DZD)',
    apply: 'Appliquer',
    marginWarning: 'Le prix de vente minimum de ce produit n\'est pas respecté.',
  },
  weightModal: {
    title: 'Pesée — {name}',
    label: 'Poids / quantité ({unit})',
    confirm: 'Ajouter au panier',
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
    limitInfo: 'Dette actuelle : {balance} · Plafond : {limit}',
    limitExceeded: 'Plafond dépassé de {amount}. Encaissez davantage ou choisissez un autre mode de paiement.',
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
    reactivate: 'إعادة التفعيل',
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
    promoBadge: 'عرض',
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
      clear: 'تفريغ',
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
    localNotConfigured: 'لا يوجد أي متجر مسجَّل على هذا الجهاز بعد. افتح لوحة الإدارة (Ctrl+2) لإنشاء حساب المدير.',
    title: 'تسجيل الدخول إلى الصندوق',
    subtitle: 'سجّل الدخول لفتح جلسة البيع',
    methodPin: 'رمز PIN',
    methodPassword: 'البريد الإلكتروني أو الهاتف / كلمة المرور',
    pinLabel: 'رمز PIN',
    emailLabel: 'البريد الإلكتروني أو الهاتف',
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
    emailLabel: 'البريد الإلكتروني أو الهاتف',
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
    methodEmail: 'البريد الإلكتروني',
    methodPhone: 'الهاتف',
    phoneLoginLabel: 'رقم الهاتف',
    errorInvalidEmail: 'أدخل عنوان بريد إلكتروني صالحًا.',
    errorInvalidPhone: 'أدخل رقم هاتف صالحًا (من 8 إلى 15 رقمًا).',
    modeLabel: 'طريقة العمل',
    modeSyncTitle: 'متزامن',
    modeSyncDescription: 'بيانات عبر الإنترنت، يمكن الوصول إليها من الويب.',
    modeLocalTitle: 'محلي',
    modeLocalDescription: 'دون اتصال فقط، لا تُرسل أي بيانات عبر الإنترنت.',
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
      taxes: 'التصريحات',
      documents: 'الوثائق',
      accounting: 'التصدير المحاسبي',
      suppliers: 'الموردون',
      barcodes: 'الملصقات',
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
    deletePermanently: 'حذف',
    confirmDeletePermanently: 'حذف "{name}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء. يُرفض الحذف إذا كان المنتج مذكورًا في مبيعات أو مستندات أو حركات مخزون.',
  },
  barcodes: {
    title: 'ملصقات الباركود',
    print: 'طباعة',
    selectAll: 'تحديد الكل',
    clear: 'إلغاء التحديد',
    generate: 'توليد',
    generateMissing: 'توليد {count} باركود ناقص',
    copies: 'النسخ',
    labelSize: 'حجم الملصق',
    a4Sheet: 'ورقة A4 (3 × 7)',
    showName: 'اسم المنتج',
    showPrice: 'السعر',
    showCode: 'الرقم تحت الباركود',
    rotate: 'تدوير 90° (إذا خرجت الطباعة عمودية)',
    offsetY: 'الإزاحة العمودية',
    offsetYHint: 'إذا قُطع المحتوى من الأعلى فزد القيمة، ومن الأسفل فأنقصها. جرّب بملصق واحد.',
    usesSku: '{count} منتج بدون باركود: سيتم استعمال SKU.',
    hint: 'في نافذة الطباعة اختر طابعة الملصقات، الهوامش «بدون» والمقياس 100%.',
    preview: 'معاينة',
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
    promoPrice: 'سعر العرض (دج، اختياري)',
    promoStart: 'بداية العرض',
    promoEnd: 'نهاية العرض',
    soldByWeight: 'يُباع بالوزن — سعر البيع هو سعر الوحدة من الوزن (مثلاً كغ). باركود الميزان: «2XXXXXX» (أول 7 أرقام).',
    marginHint: 'الهامش التقديري: {percent}%',
    taxRate: 'الضريبة',
    taxExempt: 'معفى',
    threshold: 'حد المخزون الحرج',
    thresholdPlaceholder: 'مثال: 5',
    perishable: 'منتج قابل للتلف (يُتبع رقم الدفعة/تاريخ الصلاحية عند حركة المخزون)',
    unitOther: 'أخرى…',
    unitCustomPlaceholder: 'أدخل الوحدة',
    initialQuantity: 'الكمية في المخزون (ابتدائية)',
    addQuantity: 'الكمية المراد إضافتها للمخزون',
    initialQuantityHint: 'تُسجَّل كأول حركة مخزون.',
    expiryDate: 'تاريخ الصلاحية',
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
    outOfStock: 'نفاد المخزون',
    movementHistory: 'إضافة مخزون / السجل',
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
    tablePurchasePrice: 'يرى سعر الشراء',
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
    canViewPurchasePrice: 'السماح لهذا الكاشير برؤية سعر شراء المنتجات',
    submit: 'إنشاء الحساب',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  cloudSync: {
    title: 'المزامنة عبر الإنترنت',
    intro: 'يرسل بياناتك (المبيعات، المخزون، المنتجات، الزبائن) تلقائيًا إلى قاعدة البيانات على الإنترنت بنفس الحساب. يعمل بدون إنترنت: يستأنف الإرسال عند عودة الاتصال.',
    serverUrl: 'عنوان الخادم على الإنترنت',
    email: 'البريد الإلكتروني أو رقم هاتف المسؤول',
    password: 'كلمة المرور',
    connect: 'اتصال ومزامنة',
    connecting: 'جارٍ الاتصال…',
    connected: 'متصل بـ',
    syncNow: 'زامن الآن',
    syncing: 'جارٍ المزامنة…',
    disconnect: 'قطع الاتصال',
    pending: 'عناصر قيد الانتظار',
    lastSync: 'آخر مزامنة',
    never: 'أبدًا',
    errorPrefix: 'آخر خطأ',
    passwordNote: 'تُحفظ كلمة المرور على هذا الجهاز لإعادة الاتصال بالحساب تلقائيًا.',
  },
  backup: {
    title: 'النسخ الاحتياطي والاستعادة',
    intro: 'ينسخ قاعدة بيانات هذا الجهاز (المبيعات، المخزون، الزبائن…) تلقائيًا إلى مفتاح USB أو قرص خارجي أو مجلد متزامن مع خدمة سحابية (Google Drive، OneDrive، Dropbox).',
    folder: 'مجلد النسخ الاحتياطي',
    choose: 'استعراض…',
    folderPlaceholder: 'مثال: E:\\Sauvegardes-POS',
    auto: 'نسخ احتياطي تلقائي',
    every: 'كل',
    hours: 'ساعات',
    keep: 'عدد النسخ المحفوظة',
    save: 'حفظ',
    backupNow: 'انسخ الآن',
    working: 'جارٍ العمل…',
    lastBackup: 'آخر نسخة',
    never: 'أبدًا',
    errorPrefix: 'آخر خطأ',
    unavailable: 'المجلد غير متاح — هل فُصل مفتاح USB؟',
    available: 'المجلد متاح',
    history: 'النسخ المتوفرة',
    noBackups: 'لا توجد نسخ في هذا المجلد.',
    restore: 'استعادة',
    restoreFromFile: 'استعادة من ملف…',
    restoreConfirm: 'استبدال جميع البيانات الحالية بهذه النسخة؟ ستفقد المبيعات المنجزة بعدها (تُحفظ نسخة من الحالة الحالية في المجلد pre-restore). سيُعاد تشغيل التطبيق.',
    restoring: 'جارٍ الاستعادة… سيُعاد تشغيل التطبيق.',
    secretsNote: 'بيانات اعتماد المزامنة عبر الإنترنت غير مُضمَّنة في النسخ الاحتياطية.',
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
    secondaryColor: 'اللون الثانوي (التمييز)',
    palette: 'لوحة الألوان',
    palettePresets: 'لوحات جاهزة',
    preview: 'معاينة',
    resetColors: 'استعادة الألوان الافتراضية',
    lowContrast: 'اللون فاتح جدًا: سيصعب قراءة النص الأبيض على الأزرار. اختر درجة أغمق.',
    invalidColor: 'لون غير صالح (الصيغة #RRGGBB).',
    syncEnabled: 'المزامنة عبر الإنترنت',
    syncEnabledHint: 'مفعّلة: يمكن الوصول إلى البيانات من الويب. معطّلة: يبقى المتجر محليًا، لا تغادر أي بيانات الجهاز.',
    saved: 'تم حفظ الإعدادات.',
    errorImageType: 'يجب أن يكون الملف صورة.',
    errorImageLoad: 'تعذّر تحميل الصورة.',
    errorSave: 'خطأ أثناء الحفظ.',
    legalTitle: 'البيانات القانونية (الفواتير، وصولات التسليم)',
    address: 'العنوان',
    nif: 'NIF (رقم التعريف الجبائي)',
    nis: 'NIS (رقم التعريف الإحصائي)',
    rc: 'RC (السجل التجاري)',
    ai: 'AI (مادة الإخضاع)',
    taxRegime: 'النظام الجبائي',
    taxRegimeReal: 'النظام الحقيقي (التصريح G50)',
    taxRegimeIfu: 'الضريبة الجزافية الوحيدة (التصريح G12)',
    taxRegimeHint: 'يحدد التصريح المعروض في صفحة التصريحات.',
  },
  taxes: {
    title: "التصريحات الجبائية",
    titleG50: "التصريح G50 (النظام الحقيقي)",
    titleG12: "التصريح G12 (الضريبة الجزافية الوحيدة)",
    print: "طباعة",
    regimeLabel: "النظام الجبائي",
    regimeIfu: "الضريبة الجزافية الوحيدة (IFU)",
    regimeReal: "النظام الحقيقي",
    hintG50: "يودع قبل 20 من الشهر الموالي (تحقق من دورية التصريح لدى مفتشيتك).",
    hintG12: "G12: تصريح تقديري؛ G12 مكرر: رقم الأعمال المحقق في بداية السنة الموالية.",
    turnoverHt: "رقم الأعمال خارج الرسم",
    turnoverTtc: "رقم الأعمال بالرسم",
    tvaCollected: "الرسم على القيمة المضافة المحصّل",
    stampDuty: "حق الطابع",
    cashPart: "الحصة النقدية",
    refundsShort: "مرتجع",
    g50Table: "الرسم حسب المعدل (المبيعات ناقص المرتجعات)",
    rate: "المعدل",
    baseHt: "الأساس خارج الرسم",
    tva: "الرسم",
    ttc: "بالرسم",
    exempt: "معفى",
    total: "المجموع",
    empty: "لا توجد مبيعات في هذه الفترة.",
    annualTurnover: "رقم الأعمال السنوي",
    ifuEstimate: "الضريبة الجزافية المقدّرة",
    ifuMin: "الحد الأدنى",
    ceiling: "سقف نظام IFU",
    ceilingNear: "رقم الأعمال يقترب من سقف نظام IFU: استعد للانتقال إلى النظام الحقيقي.",
    ceilingExceeded: "رقم الأعمال تجاوز سقف نظام IFU: الانتقال إلى النظام الحقيقي مرجّح أن يكون إلزاميًا.",
    activityType: "طبيعة النشاط",
    activityGoods: "بيع / إنتاج السلع",
    activityServices: "تقديم الخدمات",
    monthly: "رقم الأعمال حسب الشهر",
    month: "الشهر",
    turnover: "رقم الأعمال",
    disclaimer: "وثيقة تحضيرية محسوبة من مبيعاتك ولا تغني عن التصريح الرسمي. المعدلات والسقوف (lib/taxDeclarations.ts) يجب تأكيدها مع المحاسب أو مفتشية الضرائب.",
  },
  hold: {
    button: 'تعليق السلة',
    title: 'السلال المعلّقة',
    empty: 'لا توجد سلال معلّقة.',
    resume: 'استئناف',
    discard: 'حذف',
    items: '{n} منتج',
    heldAt: 'عُلّقت على الساعة {time}',
    swapped: 'تم تعليق السلة الحالية.',
  },
  shortcuts: {
    title: 'اختصارات لوحة المفاتيح',
    scan: 'مسح / بحث',
    cash: 'الدفع نقدًا',
    cib: 'الدفع CIB / الذهبية',
    credit: 'بيع بالدين',
    hold: 'تعليق السلة',
    recall: 'السلال المعلّقة',
    discount: 'تخفيض على السطر',
    clear: 'تفريغ السلة',
    qty: 'الكمية +/−',
    remove: 'حذف السطر',
    select: 'اختيار سطر',
    toggle: 'إظهار / إخفاء هذه المساعدة',
  },
  expiry: {
    expired: 'منتهي الصلاحية',
    daysLeft: 'ينتهي بعد {n} يوم',
    expiredWarning: '« {name} »: توجد دفعة منتهية الصلاحية في المخزون!',
  },
  inventory: {
    tabStock: 'المخزون',
    tabBatches: 'الدفعات والصلاحية',
    tabReorder: 'للتزوّد',
    lowOnly: 'المخزون المنخفض فقط',
    alertsLow: '{n} منتج تحت الحد',
    alertsExpiring: '{n} دفعة قاربت على الانتهاء',
    alertsExpired: '{n} دفعة منتهية',
    batchesIntro: 'تخصم المبيعات تلقائيًا الدفعة الأقرب انتهاءً أولًا (FEFO).',
    tableLot: 'الدفعة',
    tableExpiry: 'تاريخ الانتهاء',
    tableQuantity: 'الكمية',
    tableStatus: 'الحالة',
    noLot: 'بدون رقم دفعة',
    noExpiry: 'بدون تاريخ',
    statusExpired: 'منتهية',
    statusSoon: 'قاربت على الانتهاء',
    statusOk: 'سليمة',
    noBatches: 'لا توجد دفعات متتبَّعة. أدخل رقم الدفعة وتاريخ الانتهاء عند استلام منتج قابل للتلف.',
    reorderIntro: 'منتجات تحت حدّها مجمّعة حسب المورّد المعتاد. عدّل الكميات ثم اطبع طلب الشراء.',
    reorderEmpty: 'لا شيء للطلب: كل المنتجات ذات الحد فوق حدّها.',
    noSupplier: 'مورّد غير محدد',
    suggested: 'مقترح',
    orderQty: 'الكمية المطلوبة',
    currentQty: 'في المخزون',
    threshold: 'الحد',
    unitCost: 'آخر تكلفة',
    estimatedTotal: 'المجموع التقديري',
    print: 'طباعة طلب الشراء',
    copy: 'نسخ (واتساب)',
    copied: 'تم النسخ!',
    orderTitle: 'طلب شراء',
    orderDate: 'التاريخ',
    supplier: 'المورّد',
    product: 'المنتج',
    quantity: 'الكمية',
    lineTotal: 'المبلغ',
  },
  docs: {
    invoice: 'فاتورة',
    deliveryNote: 'وصل التسليم',
    proforma: 'فاتورة شكلية',
    menuLabel: 'المستندات',
    print: 'طباعة (A4)',
    back: 'رجوع',
    clientInfo: 'معلومات الزبون (اختياري للأفراد)',
    clientName: 'الاسم / الشركة',
    clientAddress: 'العنوان',
    clientNote: 'عند البيع لشركة، أدخل NIF وRC وNIS وAI الخاصة بالزبون.',
    nif: 'NIF',
    nis: 'NIS',
    rc: 'RC',
    ai: 'AI',
    phone: 'الهاتف',
    number: 'رقم',
    date: 'التاريخ',
    designation: 'البيان',
    qty: 'الكمية',
    unitHt: 'السعر دون رسم',
    vat: 'ر.ق.م',
    totalHt: 'المجموع دون رسم',
    base: 'الأساس دون رسم',
    vatAmount: 'مبلغ الرسم',
    totalVat: 'مجموع الرسم',
    totalTtc: 'المجموع بكل الرسوم',
    stampDuty: 'حق الطابع',
    netToPay: 'الصافي للدفع',
    paymentMode: 'طريقة الدفع',
    proformaNote: 'وثيقة غير صالحة كفاتورة — ولا تعتبر طلب دفع.',
    proformaValidity: 'العرض صالح لمدة 15 يومًا.',
    refundNotice: 'هذا المستند إرجاع: استعمل عملية البيع الأصلية لإنشاء فاتورة.',
    receivedBy: 'استلمه (الاسم، التاريخ، الإمضاء)',
    signatureSeller: 'الختم والإمضاء',
    missingLegal: 'البيانات القانونية ناقصة: أدخل NIF وNIS وRC وAI والعنوان في الإعدادات.',
    amountInWords: '',
    quote: 'عرض سعر',
    order: 'سند طلب',
    validUntil: 'صالح إلى غاية',
    dueDate: 'تاريخ الاستحقاق',
    saleRef: 'تذكرة الصندوق',
    sourceRef: 'محرر انطلاقا من',
    cancelledStamp: 'ملغى',
    notes: 'ملاحظات',
    einvoicePending: 'الفوترة الإلكترونية: الإرسال غير مفعّل (البيانات جاهزة).',
    issueAndShow: 'إصدار الوثيقة',
    issuing: 'جارٍ الإصدار…',
    issueNote: 'يُمنح الرقم عند الإصدار ولا يمكن تعديله أو إعادة استعماله. لا تُلغى الوثيقة الصادرة إلا بسبب مدوَّن.',
    errorIssue: 'تعذّر إصدار الوثيقة.',
    deliveryNoteNoPrice: 'بدون أسعار',
  },
  documents: {
    title: 'الوثائق التجارية',
    newDocument: 'وثيقة جديدة',
    searchPlaceholder: 'رقم الوثيقة أو الزبون أو التذكرة…',
    allKinds: 'كل الأنواع',
    allStatuses: 'كل الحالات',
    statusIssued: 'صادرة',
    statusCancelled: 'ملغاة',
    colNumber: 'الرقم',
    colType: 'النوع',
    colDate: 'التاريخ',
    colClient: 'الزبون',
    colTotal: 'المجموع بالرسوم',
    colStatus: 'الحالة',
    colRef: 'المرجع',
    empty: 'لا توجد وثائق لهذه المرشحات.',
    view: 'عرض',
    convertTo: 'تحويل إلى',
    cancelAction: 'إلغاء الوثيقة',
    cancelReason: 'سبب الإلغاء',
    cancelReasonPlaceholder: 'مثال: خطأ في الإدخال، تراجع الزبون…',
    cancelConfirm: 'تأكيد الإلغاء',
    cancelledBanner: 'وثيقة ملغاة — يبقى رقمها ضمن التسلسل ولن يُعاد استعماله.',
    converted: 'تم إصدار الوثيقة {number}.',
    einvoiceTitle: 'الفوترة الإلكترونية',
    einvoiceStatus: {
      not_submitted: 'غير مرسلة',
      pending: 'قيد الانتظار',
      submitted: 'مرسلة',
      accepted: 'مقبولة',
      rejected: 'مرفوضة',
    },
    einvoiceNote: 'تحمل كل وثيقة معرّفا فريدا وهوية البائع والمشتري مثبتة ومبالغ خارج الرسم والرسم حسب كل نسبة وبصمة متسلسلة. سيُربط الإرسال إلى الإدارة بهذه البيانات فور اعتماد الصيغة الرسمية.',
    integrityTitle: 'بصمة السلامة',
    buyerSection: 'الزبون',
    linesSection: 'السطور',
    addLine: 'إضافة سطر',
    removeLine: 'حذف',
    designation: 'البيان',
    quantity: 'الكمية',
    unitHt: 'السعر خ.ر',
    discount: 'تخفيض خ.ر',
    vatRate: 'الرسم',
    lineTotal: 'المجموع خ.ر',
    paymentMethod: 'طريقة الدفع',
    noPayment: 'غير محددة',
    validUntil: 'صالح إلى غاية',
    notes: 'ملاحظات',
    totalHt: 'المجموع خارج الرسم',
    totalVat: 'مجموع الرسم',
    totalTtc: 'المجموع بكل الرسوم',
    stampDuty: 'حق الطابع',
    netToPay: 'الصافي للدفع',
    pickProduct: 'إضافة منتج من الكتالوج…',
    submit: 'إصدار',
    submitting: 'جارٍ الإصدار…',
    errorLines: 'أضف سطرا واحدا على الأقل مع البيان والكمية.',
    numberingNote: 'ترقيم متواصل حسب النوع والسنة (مثال FA-2026-00001) دون فراغات أو إعادة استعمال.',
    errorLoad: 'تعذّر تحميل الوثائق.',
  },
  accounting: {
    title: 'التصدير المحاسبي',
    subtitle: 'يومية المبيعات وملخص الرسم على القيمة المضافة لتصريح G50.',
    periodMonth: 'شهر',
    periodQuarter: 'ثلاثي',
    periodYear: 'سنة',
    quarter: 'ث{n}',
    allStores: 'كل المتاجر',
    salesCount: 'التذاكر',
    refundsCount: 'المرتجعات',
    invoicesCount: 'فواتير خارج الصندوق',
    totalHt: 'رقم الأعمال خارج الرسم',
    totalVat: 'الرسم المحصّل',
    totalTtc: 'المجموع بكل الرسوم',
    stampDuty: 'حق الطابع',
    vatByRate: 'الرسم حسب النسبة',
    vatByMonth: 'الرسم حسب الشهر',
    journal: 'يومية المبيعات',
    journalHint: '{count} قيد',
    exportCsv: 'CSV',
    exportXlsx: 'إكسل (XLSX)',
    print: 'طباعة',
    noData: 'لا توجد قيود في هذه الفترة.',
    disclaimer: 'ملخص تقديري مبني على المبيعات المسجلة: يجب أن يراجعه محاسبك قبل إيداع تصريح G50.',
    sourceNote: 'تذاكر الصندوق بعد خصم المرتجعات + الفواتير الصادرة خارج الصندوق غير الملغاة. الفواتير المحررة من تذكرة لا تُحتسب مرتين. المشتريات (الرسم القابل للخصم) غير مشمولة.',
    colDate: 'التاريخ',
    colType: 'النوع',
    colNumber: 'رقم القطعة',
    colInvoice: 'رقم الفاتورة',
    colClient: 'الزبون',
    colNif: 'رقم تعريف الزبون الجبائي',
    colBase: 'الأساس خ.ر',
    colVat: 'الرسم',
    colTotalHt: 'المجموع خ.ر',
    colTotalVat: 'مجموع الرسم',
    colTotalTtc: 'المجموع بالرسوم',
    colStamp: 'الطابع',
    colPayment: 'الدفع',
    colRate: 'النسبة',
    colMonth: 'الشهر',
    total: 'المجموع',
    kindSale: 'بيع',
    kindRefund: 'مرتجع',
    kindInvoice: 'فاتورة',
    journalFile: 'journal-ventes',
    vatFile: 'recap-tva',
    workbookFile: 'export-comptable',
    exportAll: 'التصدير',
  },
  priceHistory: {
    button: 'أسعار الشراء',
    title: 'سجل أسعار الشراء — {name}',
    empty: 'لا توجد مشتريات مسجّلة عند هذا المورد.',
    colProduct: 'المنتج',
    colLatest: 'آخر سعر',
    colPrevious: 'السابق',
    colChange: 'التغيّر',
    colHistory: 'السجل',
    alertBadge: '{count} ارتفاع',
    alertBanner: 'رفع هذا المورد أسعاره على {count} منتج.',
    thresholdHint: 'ينبّه عند ارتفاع 3% أو أكثر بين آخر عمليتي شراء.',
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
    openDrawer: 'فتح درج النقود',
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
    localModeText: 'وضع محلي — هذا المتجر لا يزامن بياناته عبر الإنترنت.',
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
    modePayment: 'دفعة',
    debtAmount: 'المبلغ المراد إضافته (دج)',
    debtNotePlaceholder: 'مثال: رصيد قديم، بضاعة بتاريخ 05/10',
    debtSubmit: 'إضافة إلى الرصيد',
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
    totalLabel: 'إجمالي ديون الموردين',
    countLabel: '{count} مورد(ين) للدفع',
    onlyWithBalance: 'الذين عليهم دين فقط',
    searchPlaceholder: 'ابحث عن مورد…',
    settle: 'دفع',
    addDebt: 'إضافة دين',
  },
  supplierForm: {
    title: 'مورد جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    address: 'العنوان',
    openingBalance: 'دين ابتدائي للمورد (دج، اختياري)',
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
    totalLabel: 'إجمالي ديون الزبائن',
    countLabel: '{count} زبون(ين) مدينون',
    onlyWithBalance: 'المدينون فقط',
    searchPlaceholder: 'ابحث عن زبون…',
    settle: 'تحصيل',
    addDebt: 'إضافة دين زبون',
  },
  customerForm: {
    title: 'زبون جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    openingBalance: 'دين ابتدائي على الزبون (دج، اختياري)',
    creditLimit: 'سقف الدين (دج، فارغ = غير محدود)',
    submit: 'إنشاء الزبون',
    errorSave: 'خطأ أثناء الحفظ.',
  },
  discountEditor: {
    button: 'خصم',
    label: 'خصم على السطر (دج)',
    apply: 'تطبيق',
    marginWarning: 'الحد الأدنى لسعر بيع هذا المنتج غير محترم.',
  },
  weightModal: {
    title: 'الوزن — {name}',
    label: 'الوزن / الكمية ({unit})',
    confirm: 'إضافة إلى السلة',
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
    limitInfo: 'الدين الحالي: {balance} · السقف: {limit}',
    limitExceeded: 'تم تجاوز السقف بمقدار {amount}. اقبض مبلغًا أكبر أو اختر طريقة دفع أخرى.',
  },
};

export const translations: Record<Locale, TranslationDict> = { fr, ar };
