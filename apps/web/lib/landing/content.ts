export type LandingLocale = 'fr' | 'ar' | 'en';

interface Item { title: string; text: string }
interface Showcase { eyebrow: string; title: string; text: string; points: string[]; alt: string }

export interface LandingDict {
  meta: { title: string };
  nav: { features: string; how: string; offline: string; faq: string; open: string; backoffice: string; menu: string };
  hero: { title: string; text: string; cta: string; ctaSecondary: string; note: string; alt: string };
  showcase: { pos: Showcase; stock: Showcase; reports: Showcase };
  features: { eyebrow: string; title: string; items: Item[] };
  whitelabel: { eyebrow: string; title: string; text: string; items: Item[] };
  pricing: { eyebrow: string; title: string; trialLabel: string; trialValue: string; trialText: string; lifetimeLabel: string; price: string; currency: string; once: string; lifetimeText: string; points: string[]; cta: string; whatsappMessage: string };
  how: { eyebrow: string; title: string; steps: Item[] };
  offline: { eyebrow: string; title: string; text: string; points: string[] };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  cta: { title: string; text: string; button: string };
  contact: { eyebrow: string; title: string; text: string; button: string; floating: string; hoursLabel: string; hours: string; replyLabel: string; reply: string; helpLabel: string; help: string[]; message: string; unavailable: string };
  footer: { tagline: string; pos: string; admin: string; rights: string; contact: string };
  lang: { label: string };
}

const fr: LandingDict = {
  meta: { title: 'POS Algérie — Caisse & gestion de stock' },
  nav: { features: 'Fonctionnalités', how: 'Comment ça marche', offline: 'Hors-ligne', faq: 'FAQ', open: 'Ouvrir la caisse', backoffice: 'Back-office', menu: 'Menu' },
  hero: {
    title: 'La caisse et le stock de votre commerce, dans un seul outil',
    text: 'Encaissez rapidement, suivez vos stocks et comprenez vos ventes. Fonctionne sans Internet, en français, en arabe et en anglais, avec le dinar et la TVA locale.',
    cta: 'Ouvrir la caisse',
    ctaSecondary: 'Accéder au back-office',
    note: 'Aucune connexion nécessaire pour vendre.',
    alt: 'Écran de caisse du logiciel',
  },
  showcase: {
    pos: { eyebrow: 'Caisse', title: 'Une caisse rapide, pensée pour le comptoir', text: 'Scannez, ajustez les quantités et encaissez en quelques secondes. Tout se fait au clavier ou à la douchette, sans quitter l’écran de vente.', points: ['Scan code-barres et recherche instantanée', 'Paniers en attente et remises par ligne', 'Espèces, CIB / Edahabia, crédit client'], alt: 'Écran de caisse avec un panier en cours' },
    stock: { eyebrow: 'Gestion de stock', title: 'Sachez toujours ce qu’il reste en rayon', text: 'Le stock se met à jour à chaque vente. Les produits sous leur seuil critique sont signalés pour que vous réapprovisionniez à temps.', points: ['Alertes de stock faible', 'Lots et dates de péremption', 'Suggestions de réapprovisionnement'], alt: 'Écran de gestion de stock avec alertes de stock faible' },
    reports: { eyebrow: 'Rapports', title: 'Comprenez vos ventes et vos marges', text: 'Chiffre d’affaires, panier moyen, TVA collectée et bénéfice net, avec le détail par jour, par moyen de paiement et par produit.', points: ['Chiffre d’affaires et marge', 'Produits les plus vendus', 'Export comptable'], alt: 'Écran de rapports avec chiffre d’affaires et marge' },
  },
  features: {
    eyebrow: 'Fonctionnalités',
    title: 'Tout ce qu’il faut pour tenir un commerce',
    items: [
      { title: 'Vente au poids', text: 'Balances, codes-barres à poids intégré et prix au kilo.' },
      { title: 'Tickets thermiques', text: 'Impression sur imprimantes ESC/POS.' },
      { title: 'Caissiers et rôles', text: 'Connexion par code PIN et droits par rôle.' },
      { title: 'Catalogue produits', text: 'Catégories, codes-barres et étiquettes imprimables.' },
      { title: 'Fournisseurs', text: 'Historique des prix et soldes fournisseurs.' },
      { title: 'Documents commerciaux', text: 'Devis, bons de livraison et factures numérotés.' },
      { title: 'Crédit client', text: 'Suivi des ventes à crédit et des soldes clients.' },
      { title: 'Sauvegarde et synchronisation', text: 'Sauvegardes locales et synchronisation entre postes.' },
    ],
  },
  whitelabel: {
    eyebrow: 'Marque blanche',
    title: 'Votre marque, votre caisse',
    text: 'Revendez ou déployez la solution sous votre propre identité, et adaptez-la aux besoins de chaque commerce.',
    items: [
      { title: 'Marque blanche', text: 'Votre nom, votre logo et vos couleurs à la place des nôtres.' },
      { title: 'Personnalisation sur mesure', text: 'Tickets, documents, champs et fonctionnalités adaptés à votre métier.' },
      { title: 'Multi-boutiques', text: 'Une identité propre pour chaque client, boutique ou franchise.' },
      { title: 'Accompagnement', text: 'Mise en place, formation et évolutions à la demande.' },
    ],
  },
  pricing: {
    eyebrow: 'Tarif',
    title: 'Un seul paiement, pour toujours',
    trialLabel: 'Essai gratuit',
    trialValue: '14 jours',
    trialText: 'Testez toutes les fonctionnalités, sans engagement.',
    lifetimeLabel: 'Licence à vie',
    price: '8 000',
    currency: 'DZD',
    once: 'paiement unique',
    lifetimeText: 'Payez une fois, utilisez sans limite de durée.',
    points: ['Toutes les fonctionnalités incluses', 'Aucun abonnement mensuel', 'Fonctionne hors-ligne'],
    cta: 'Commencer l’essai de 14 jours',
    whatsappMessage: 'Bonjour, je souhaite démarrer l’essai gratuit de 14 jours de POS Algérie.',
  },
  how: {
    eyebrow: 'Comment ça marche',
    title: 'Prêt en trois étapes',
    steps: [
      { title: 'Configurez votre commerce', text: 'Créez la boutique, vos taxes, vos caissiers et importez votre catalogue.' },
      { title: 'Vendez au quotidien', text: 'Scannez, encaissez, imprimez. Le stock se met à jour à chaque vente.' },
      { title: 'Pilotez votre activité', text: 'Suivez les ventes, les marges et les ruptures depuis le back-office.' },
    ],
  },
  offline: {
    eyebrow: 'Fiabilité',
    title: 'Une coupure Internet ne doit jamais arrêter une vente',
    text: 'L’application garde une base locale sur le poste et envoie les changements dès que la connexion revient.',
    points: ['Application bureau Windows avec base locale intégrée', 'Synchronisation automatique et sans doublons', 'Interface complète en arabe (RTL), français et anglais', 'Données séparées pour chaque commerce'],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions fréquentes',
    items: [
      { q: 'Faut-il une connexion Internet ?', a: 'Non. La caisse fonctionne entièrement hors-ligne. La connexion n’est utile que pour synchroniser plusieurs postes ou sauvegarder dans le cloud.' },
      { q: 'Quel matériel est compatible ?', a: 'Un PC Windows, une douchette code-barres (émulation clavier), une imprimante thermique ESC/POS et une balance avec codes-barres à poids intégré.' },
      { q: 'Gère-t-il la TVA et les moyens de paiement locaux ?', a: 'Oui : dinar algérien, TVA, CIB, Edahabia, chèque et crédit client sont pris en charge.' },
      { q: 'Peut-on gérer plusieurs boutiques ?', a: 'Oui. Chaque commerce a ses données isolées, avec plusieurs boutiques, utilisateurs et rôles.' },
      { q: 'L’interface est-elle disponible en arabe ?', a: 'Oui, en français, en arabe avec une vraie mise en page de droite à gauche, et en anglais sur cette page.' },
    ],
  },
  cta: { title: 'Prêt à moderniser votre point de vente ?', text: 'Ouvrez la caisse et réalisez votre première vente en quelques minutes.', button: 'Ouvrir la caisse' },
  contact: {
    eyebrow: 'Contact',
    title: 'Parlons de votre commerce',
    text: 'Une question, une démonstration ou un devis ? Écrivez-nous directement sur WhatsApp : nous vous répondons personnellement.',
    button: 'Discuter sur WhatsApp',
    floating: 'Contacter la boutique sur WhatsApp',
    hoursLabel: 'Horaires',
    hours: 'Samedi – Jeudi, 9h – 20h (heure d’Alger)',
    replyLabel: 'Délai de réponse',
    reply: 'Généralement en moins d’une heure',
    helpLabel: 'Nous pouvons vous aider pour',
    help: ['Démarrer l’essai gratuit de 14 jours', 'Acheter la licence à vie (CIB / Edahabia)', 'Installation, formation et assistance', 'Marque blanche et personnalisation'],
    message: 'Bonjour, j’ai une question sur POS Algérie.',
    unavailable: 'Numéro WhatsApp bientôt disponible.',
  },
  footer: { tagline: 'Caisse et gestion de stock pour commerces algériens.', pos: 'Caisse', admin: 'Back-office', rights: 'Tous droits réservés.', contact: 'Contact WhatsApp' },
  lang: { label: 'Langue' },
};

const ar: LandingDict = {
  meta: { title: 'POS الجزائر — نقطة بيع وإدارة مخزون' },
  nav: { features: 'المميزات', how: 'كيف يعمل', offline: 'بدون إنترنت', faq: 'الأسئلة', open: 'فتح الصندوق', backoffice: 'لوحة الإدارة', menu: 'القائمة' },
  hero: {
    title: 'صندوق محلك ومخزونه في أداة واحدة',
    text: 'حصّل بسرعة، تابع مخزونك وافهم مبيعاتك. يعمل بدون إنترنت، بالعربية والفرنسية والإنجليزية، وبالدينار والضريبة المحلية.',
    cta: 'فتح الصندوق',
    ctaSecondary: 'الدخول إلى لوحة الإدارة',
    note: 'لا حاجة للاتصال بالإنترنت للبيع.',
    alt: 'شاشة الصندوق في البرنامج',
  },
  showcase: {
    pos: { eyebrow: 'الصندوق', title: 'صندوق سريع مصمم للمحل', text: 'امسح، عدّل الكميات وحصّل في ثوانٍ. كل شيء بلوحة المفاتيح أو بقارئ الباركود دون مغادرة شاشة البيع.', points: ['مسح الباركود وبحث فوري', 'سلات معلّقة وتخفيضات على كل سطر', 'نقدًا، CIB / الذهبية، دين الزبون'], alt: 'شاشة الصندوق مع سلة قيد التحضير' },
    stock: { eyebrow: 'إدارة المخزون', title: 'اعرف دائمًا ما تبقى في الرفوف', text: 'يتحدّث المخزون مع كل عملية بيع. تُنبَّه إلى المنتجات التي نزلت تحت حدّها الحرج لتعيد التموين في الوقت المناسب.', points: ['تنبيهات المخزون المنخفض', 'الدفعات وتواريخ الصلاحية', 'اقتراحات إعادة التموين'], alt: 'شاشة إدارة المخزون مع تنبيهات المخزون المنخفض' },
    reports: { eyebrow: 'التقارير', title: 'افهم مبيعاتك وهوامش ربحك', text: 'رقم الأعمال، متوسط السلة، الضريبة المحصّلة والربح الصافي، مع التفصيل حسب اليوم وطريقة الدفع والمنتج.', points: ['رقم الأعمال والهامش', 'المنتجات الأكثر مبيعًا', 'تصدير محاسبي'], alt: 'شاشة التقارير مع رقم الأعمال والهامش' },
  },
  features: {
    eyebrow: 'المميزات',
    title: 'كل ما تحتاجه لإدارة محلك',
    items: [
      { title: 'البيع بالوزن', text: 'موازين وباركود بوزن مدمج وسعر الكيلوغرام.' },
      { title: 'تذاكر حرارية', text: 'الطباعة على طابعات ESC/POS.' },
      { title: 'الصرّافون والصلاحيات', text: 'دخول برمز PIN وصلاحيات حسب الدور.' },
      { title: 'كتالوج المنتجات', text: 'فئات وباركود وملصقات قابلة للطباعة.' },
      { title: 'الموردون', text: 'سجل الأسعار وأرصدة الموردين.' },
      { title: 'الوثائق التجارية', text: 'عروض أسعار وسندات تسليم وفواتير مرقّمة.' },
      { title: 'دين الزبائن', text: 'متابعة المبيعات بالآجل وأرصدة الزبائن.' },
      { title: 'نسخ احتياطي ومزامنة', text: 'نسخ احتياطية محلية ومزامنة بين الأجهزة.' },
    ],
  },
  whitelabel: {
    eyebrow: 'علامة بيضاء',
    title: 'علامتك التجارية، صندوقك الخاص',
    text: 'أعد بيع الحل أو انشره باسمك وهويتك، وطوّعه لاحتياجات كل متجر.',
    items: [
      { title: 'علامة بيضاء', text: 'اسمك وشعارك وألوانك بدل علامتنا.' },
      { title: 'تخصيص حسب الطلب', text: 'تذاكر ووثائق وحقول وميزات مناسبة لنشاطك.' },
      { title: 'متعدد المتاجر', text: 'هوية خاصة لكل زبون أو متجر أو فرع.' },
      { title: 'مرافقة', text: 'تركيب وتدريب وتطويرات عند الطلب.' },
    ],
  },
  pricing: {
    eyebrow: 'الأسعار',
    title: 'دفعة واحدة، مدى الحياة',
    trialLabel: 'تجربة مجانية',
    trialValue: '14 يومًا',
    trialText: 'جرّب جميع الميزات دون أي التزام.',
    lifetimeLabel: 'ترخيص مدى الحياة',
    price: '8 000',
    currency: 'دج',
    once: 'دفعة واحدة',
    lifetimeText: 'ادفع مرة واحدة واستعمل دون حد زمني.',
    points: ['جميع الميزات مشمولة', 'بدون اشتراك شهري', 'يعمل دون إنترنت'],
    cta: 'ابدأ التجربة لمدة 14 يومًا',
    whatsappMessage: 'مرحبًا، أريد بدء التجربة المجانية لمدة 14 يومًا لنظام POS الجزائر.',
  },
  how: {
    eyebrow: 'كيف يعمل',
    title: 'جاهز في ثلاث خطوات',
    steps: [
      { title: 'هيّئ محلك', text: 'أنشئ المتجر والضرائب والصرّافين واستورد كتالوج منتجاتك.' },
      { title: 'بع يوميًا', text: 'امسح، حصّل، اطبع. يتحدّث المخزون مع كل عملية بيع.' },
      { title: 'تحكّم في نشاطك', text: 'تابع المبيعات والهوامش والنفاد من لوحة الإدارة.' },
    ],
  },
  offline: {
    eyebrow: 'الموثوقية',
    title: 'انقطاع الإنترنت لا يجب أن يوقف أي عملية بيع',
    text: 'يحتفظ التطبيق بقاعدة بيانات محلية على الجهاز ويرسل التغييرات فور عودة الاتصال.',
    points: ['تطبيق ويندوز مكتبي بقاعدة بيانات محلية مدمجة', 'مزامنة تلقائية دون تكرار', 'واجهة كاملة بالعربية (من اليمين لليسار) والفرنسية والإنجليزية', 'بيانات منفصلة لكل محل'],
  },
  faq: {
    eyebrow: 'الأسئلة',
    title: 'الأسئلة الشائعة',
    items: [
      { q: 'هل أحتاج إلى اتصال بالإنترنت؟', a: 'لا. يعمل الصندوق بالكامل بدون إنترنت. الاتصال مفيد فقط لمزامنة عدة أجهزة أو النسخ الاحتياطي السحابي.' },
      { q: 'ما هي الأجهزة المتوافقة؟', a: 'حاسوب ويندوز، قارئ باركود (محاكاة لوحة المفاتيح)، طابعة حرارية ESC/POS، وميزان بباركود بوزن مدمج.' },
      { q: 'هل يدعم الضريبة وطرق الدفع المحلية؟', a: 'نعم: الدينار الجزائري، الضريبة، CIB، الذهبية، الشيك ودين الزبون.' },
      { q: 'هل يمكن إدارة عدة محلات؟', a: 'نعم. لكل نشاط بياناته المعزولة، مع عدة متاجر ومستخدمين وأدوار.' },
      { q: 'هل الواجهة متوفرة بالعربية؟', a: 'نعم، بالعربية بتخطيط حقيقي من اليمين لليسار، وبالفرنسية، وبالإنجليزية في هذه الصفحة.' },
    ],
  },
  cta: { title: 'جاهز لتحديث نقطة البيع؟', text: 'افتح الصندوق وأنجز أول عملية بيع خلال دقائق.', button: 'فتح الصندوق' },
  contact: {
    eyebrow: 'تواصل معنا',
    title: 'لنتحدث عن محلّك',
    text: 'لديك سؤال أو تريد عرضًا تجريبيًا أو عرض سعر؟ راسلنا مباشرة عبر واتساب وسنرد عليك شخصيًا.',
    button: 'تواصل عبر واتساب',
    floating: 'تواصل مع المتجر عبر واتساب',
    hoursLabel: 'أوقات العمل',
    hours: 'من السبت إلى الخميس، 9:00 – 20:00 (توقيت الجزائر)',
    replyLabel: 'مدة الرد',
    reply: 'عادةً خلال أقل من ساعة',
    helpLabel: 'يمكننا مساعدتك في',
    help: ['بدء التجربة المجانية لمدة 14 يومًا', 'شراء الرخصة مدى الحياة (CIB / الذهبية)', 'التركيب والتدريب والدعم', 'العلامة البيضاء والتخصيص'],
    message: 'مرحبًا، لدي سؤال حول نظام POS الجزائر.',
    unavailable: 'رقم واتساب سيتوفر قريبًا.',
  },
  footer: { tagline: 'نقطة بيع وإدارة مخزون للمحلات الجزائرية.', pos: 'الصندوق', admin: 'لوحة الإدارة', rights: 'جميع الحقوق محفوظة.', contact: 'تواصل عبر واتساب' },
  lang: { label: 'اللغة' },
};

const en: LandingDict = {
  meta: { title: 'POS Algeria — Point of sale & stock management' },
  nav: { features: 'Features', how: 'How it works', offline: 'Offline', faq: 'FAQ', open: 'Open the POS', backoffice: 'Back-office', menu: 'Menu' },
  hero: {
    title: 'Your shop’s checkout and stock in one tool',
    text: 'Check out quickly, track your stock and understand your sales. Works without Internet, in French, Arabic and English, with the dinar and local VAT.',
    cta: 'Open the POS',
    ctaSecondary: 'Go to the back-office',
    note: 'No connection needed to sell.',
    alt: 'Checkout screen of the software',
  },
  showcase: {
    pos: { eyebrow: 'Point of sale', title: 'A fast checkout built for the counter', text: 'Scan, adjust quantities and charge in seconds. Everything works from the keyboard or the scanner, without leaving the sales screen.', points: ['Barcode scanning and instant search', 'Held carts and per-line discounts', 'Cash, CIB / Edahabia, customer credit'], alt: 'Checkout screen with a cart in progress' },
    stock: { eyebrow: 'Stock management', title: 'Always know what is left on the shelf', text: 'Stock updates with every sale. Products below their critical threshold are flagged so you can reorder in time.', points: ['Low-stock alerts', 'Batches and expiry dates', 'Restocking suggestions'], alt: 'Stock screen with low-stock alerts' },
    reports: { eyebrow: 'Reports', title: 'Understand your sales and margins', text: 'Revenue, average basket, VAT collected and net profit, broken down by day, payment method and product.', points: ['Revenue and margin', 'Best-selling products', 'Accounting export'], alt: 'Reports screen with revenue and margin' },
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything you need to run a shop',
    items: [
      { title: 'Sell by weight', text: 'Scales, weight-embedded barcodes and price per kilo.' },
      { title: 'Thermal receipts', text: 'Printing on ESC/POS printers.' },
      { title: 'Cashiers & roles', text: 'PIN login and role-based permissions.' },
      { title: 'Product catalogue', text: 'Categories, barcodes and printable labels.' },
      { title: 'Suppliers', text: 'Price history and supplier balances.' },
      { title: 'Commercial documents', text: 'Numbered quotes, delivery notes and invoices.' },
      { title: 'Customer credit', text: 'Track credit sales and customer balances.' },
      { title: 'Backup & sync', text: 'Local backups and sync across devices.' },
    ],
  },
  whitelabel: {
    eyebrow: 'White label',
    title: 'Your brand, your POS',
    text: "Resell or deploy the solution under your own identity, and tailor it to each store's needs.",
    items: [
      { title: 'White label', text: 'Your name, logo and colors in place of ours.' },
      { title: 'Custom tailoring', text: 'Receipts, documents, fields and features adapted to your trade.' },
      { title: 'Multi-store', text: 'A dedicated identity for each client, store or franchise.' },
      { title: 'Support', text: 'Setup, training and changes on request.' },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'One payment, for life',
    trialLabel: 'Free trial',
    trialValue: '14 days',
    trialText: 'Try every feature, no commitment.',
    lifetimeLabel: 'Lifetime license',
    price: '8,000',
    currency: 'DZD',
    once: 'one-time payment',
    lifetimeText: 'Pay once, use with no time limit.',
    points: ['All features included', 'No monthly subscription', 'Works offline'],
    cta: 'Start the 14-day trial',
    whatsappMessage: 'Hello, I would like to start the 14-day free trial of POS Algérie.',
  },
  how: {
    eyebrow: 'How it works',
    title: 'Ready in three steps',
    steps: [
      { title: 'Set up your business', text: 'Create your store, taxes and cashiers, and import your catalogue.' },
      { title: 'Sell every day', text: 'Scan, charge, print. Stock updates with every sale.' },
      { title: 'Run your business', text: 'Track sales, margins and stock-outs from the back-office.' },
    ],
  },
  offline: {
    eyebrow: 'Reliability',
    title: 'An Internet outage should never stop a sale',
    text: 'The app keeps a local database on the device and sends changes as soon as the connection returns.',
    points: ['Windows desktop app with a built-in local database', 'Automatic, duplicate-free synchronisation', 'Full interface in Arabic (RTL) and French', 'Separate data for each business'],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      { q: 'Do I need an Internet connection?', a: 'No. The POS works fully offline. A connection is only useful to sync several devices or back up to the cloud.' },
      { q: 'What hardware is supported?', a: 'A Windows PC, a barcode scanner (keyboard emulation), an ESC/POS thermal printer and a scale with weight-embedded barcodes.' },
      { q: 'Does it handle VAT and local payment methods?', a: 'Yes: Algerian dinar, VAT, CIB, Edahabia, cheque and customer credit are supported.' },
      { q: 'Can I manage several stores?', a: 'Yes. Each business has isolated data, with multiple stores, users and roles.' },
      { q: 'Is the interface available in Arabic?', a: 'Yes. The app is available in French and in Arabic with a true right-to-left layout; this page is also in English.' },
    ],
  },
  cta: { title: 'Ready to modernise your point of sale?', text: 'Open the POS and ring up your first sale in minutes.', button: 'Open the POS' },
  contact: {
    eyebrow: 'Contact',
    title: 'Let’s talk about your shop',
    text: 'A question, a demo or a quote? Message us directly on WhatsApp — you’ll get a personal reply.',
    button: 'Chat on WhatsApp',
    floating: 'Contact the shop on WhatsApp',
    hoursLabel: 'Opening hours',
    hours: 'Saturday – Thursday, 9am – 8pm (Algiers time)',
    replyLabel: 'Response time',
    reply: 'Usually within an hour',
    helpLabel: 'We can help you with',
    help: ['Starting the 14-day free trial', 'Buying the lifetime licence (CIB / Edahabia)', 'Setup, training and support', 'White-label and customisation'],
    message: 'Hello, I have a question about POS Algérie.',
    unavailable: 'WhatsApp number coming soon.',
  },
  footer: { tagline: 'Point of sale and stock management for Algerian businesses.', pos: 'POS', admin: 'Back-office', rights: 'All rights reserved.', contact: 'WhatsApp contact' },
  lang: { label: 'Language' },
};

export const landingContent: Record<LandingLocale, LandingDict> = { fr, ar, en };
export const LANDING_LOCALES: { code: LandingLocale; short: string; name: string }[] = [
  { code: 'fr', short: 'FR', name: 'Français' },
  { code: 'ar', short: 'ع', name: 'العربية' },
  { code: 'en', short: 'EN', name: 'English' },
];
