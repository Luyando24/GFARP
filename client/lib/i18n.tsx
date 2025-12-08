import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define supported languages
export type LanguageCode = 'en' | 'es' | 'fr' | 'pt' | 'de' | 'it' | 'ar' | 'zh';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

// Translation keys
export type TranslationKey = 
  // Navigation
  | 'nav.about' | 'nav.support' | 'nav.blog' | 'nav.help' | 'nav.features' | 'nav.benefits' | 'nav.pricing' | 'nav.testimonials' | 'nav.contact' | 'nav.getStarted' | 'nav.register'
  // Hero
  | 'hero.badge' | 'hero.title1' | 'hero.title2' | 'hero.subtitle' | 'hero.cta.register' | 'hero.cta.start'
  // Features
  | 'features.title.main' | 'features.title.sub' | 'features.playerReg.title' | 'features.playerReg.desc' | 'features.docMgmt.title' | 'features.docMgmt.desc' | 'features.finMgmt.title' | 'features.finMgmt.desc' | 'features.fifaComp.title' | 'features.fifaComp.desc'
  // Dashboard
  | 'dash.menu.dashboard' | 'dash.menu.players' | 'dash.menu.transfers' | 'dash.menu.finances' | 'dash.menu.compliance' | 'dash.menu.settings' | 'dash.welcome' | 'dash.role' | 'dash.search'
  // Common
  | 'common.loading' | 'common.error' | 'common.success' | 'common.save' | 'common.cancel' | 'common.delete' | 'common.edit' | 'common.view';

// Translations dictionary
const translations: Record<LanguageCode, Partial<Record<TranslationKey, string>>> = {
  en: {
    'nav.about': 'ABOUT US',
    'nav.support': 'SUPPORT',
    'nav.blog': 'BLOG',
    'nav.help': 'HELP CENTER',
    'nav.features': 'FEATURES',
    'nav.benefits': 'BENEFITS',
    'nav.pricing': 'PRICING',
    'nav.testimonials': 'TESTIMONIALS',
    'nav.contact': 'CONTACT',
    'nav.getStarted': 'GET STARTED',
    'nav.register': 'REGISTER ACADEMY',
    'hero.badge': 'SOCCER CIRCULAR PLATFORM',
    'hero.title1': "INVEST IN YOUR PLAYERS'",
    'hero.title2': 'FUTURE WITH SOCCER CIRCULAR',
    'hero.subtitle': 'Register your academy players today • Secure future compensation payments • Your first step towards long-term financial stability',
    'hero.cta.register': 'REGISTER ACADEMY',
    'hero.cta.start': 'GET STARTED',
    'features.title.main': 'WORLD-CLASS',
    'features.title.sub': 'PLATFORM FEATURES',
    'features.playerReg.title': 'PLAYER REGISTRATION SYSTEM',
    'features.playerReg.desc': 'Championship-level player registration with FIFA-compliant documentation, medical records, and comprehensive contract management system.',
    'features.docMgmt.title': 'DOCUMENT MANAGEMENT',
    'features.docMgmt.desc': 'Elite-grade secure cloud storage for player documents, contracts, medical certificates, and FIFA registration forms with military-level encryption.',
    'features.finMgmt.title': 'FINANCIAL MANAGEMENT',
    'features.finMgmt.desc': 'Complete financial suite with invoice generation, expense tracking, revenue monitoring, and automated compensation calculations.',
    'features.fifaComp.title': 'FIFA COMPLIANCE',
    'features.fifaComp.desc': 'World Cup-standard automated compliance checks, training compensation calculations, and solidarity mechanism management with real-time FIFA integration.',
    'dash.menu.dashboard': 'Dashboard',
    'dash.menu.players': 'Players',
    'dash.menu.transfers': 'Transfers',
    'dash.menu.finances': 'Finances',
    'dash.menu.compliance': 'FIFA Compliance',
    'dash.menu.settings': 'Settings',
    'dash.welcome': 'Welcome back',
    'dash.role': 'Academy Director',
    'dash.search': 'Search players, transactions, documents...',
  },
  es: {
    'nav.about': 'SOBRE NOSOTROS',
    'nav.support': 'SOPORTE',
    'nav.blog': 'BLOG',
    'nav.help': 'CENTRO DE AYUDA',
    'nav.features': 'CARACTERÍSTICAS',
    'nav.benefits': 'BENEFICIOS',
    'nav.pricing': 'PRECIOS',
    'nav.testimonials': 'TESTIMONIOS',
    'nav.contact': 'CONTACTO',
    'nav.getStarted': 'COMENZAR',
    'nav.register': 'REGISTRAR ACADEMIA',
    'hero.badge': 'PLATAFORMA SOCCER CIRCULAR',
    'hero.title1': 'INVIERTA EN EL FUTURO',
    'hero.title2': 'DE SUS JUGADORES CON SOCCER CIRCULAR',
    'hero.subtitle': 'Registre a los jugadores de su academia hoy • Asegure futuros pagos de compensación • Su primer paso hacia la estabilidad financiera a largo plazo',
    'hero.cta.register': 'REGISTRAR ACADEMIA',
    'hero.cta.start': 'COMENZAR',
    'features.title.main': 'CLASE MUNDIAL',
    'features.title.sub': 'CARACTERÍSTICAS DE LA PLATAFORMA',
    'features.playerReg.title': 'SISTEMA DE REGISTRO DE JUGADORES',
    'features.playerReg.desc': 'Registro de jugadores de nivel campeonato con documentación compatible con FIFA, registros médicos y sistema integral de gestión de contratos.',
    'features.docMgmt.title': 'GESTIÓN DOCUMENTAL',
    'features.docMgmt.desc': 'Almacenamiento seguro en la nube para documentos de jugadores, contratos, certificados médicos y formularios de registro FIFA con cifrado de nivel militar.',
    'features.finMgmt.title': 'GESTIÓN FINANCIERA',
    'features.finMgmt.desc': 'Suite financiera completa con generación de facturas, seguimiento de gastos, monitoreo de ingresos y cálculos automatizados de compensación.',
    'features.fifaComp.title': 'CUMPLIMIENTO FIFA',
    'features.fifaComp.desc': 'Verificaciones automatizadas de cumplimiento estándar de la Copa Mundial, cálculos de compensación por formación y gestión del mecanismo de solidaridad con integración FIFA en tiempo real.',
    'dash.menu.dashboard': 'Panel',
    'dash.menu.players': 'Jugadores',
    'dash.menu.transfers': 'Transferencias',
    'dash.menu.finances': 'Finanzas',
    'dash.menu.compliance': 'Cumplimiento FIFA',
    'dash.menu.settings': 'Configuración',
    'dash.welcome': 'Bienvenido de nuevo',
    'dash.role': 'Director de Academia',
    'dash.search': 'Buscar jugadores, transacciones, documentos...',
  },
  fr: {
    'nav.about': 'À PROPOS',
    'nav.support': 'SUPPORT',
    'nav.blog': 'BLOG',
    'nav.help': 'AIDE',
    'nav.features': 'FONCTIONNALITÉS',
    'nav.benefits': 'AVANTAGES',
    'nav.pricing': 'TARIFS',
    'nav.testimonials': 'TÉMOIGNAGES',
    'nav.contact': 'CONTACT',
    'nav.getStarted': 'COMMENCER',
    'nav.register': 'ENREGISTRER L\'ACADÉMIE',
    'hero.badge': 'PLATEFORME SOCCER CIRCULAR',
    'hero.title1': 'INVESTISSEZ DANS L\'AVENIR',
    'hero.title2': 'DE VOS JOUEURS AVEC SOCCER CIRCULAR',
    'hero.subtitle': 'Inscrivez les joueurs de votre académie aujourd\'hui • Sécurisez les futurs paiements de compensation • Votre premier pas vers la stabilité financière à long terme',
    'hero.cta.register': 'ENREGISTRER L\'ACADÉMIE',
    'hero.cta.start': 'COMMENCER',
    'features.title.main': 'CLASSE MONDIALE',
    'features.title.sub': 'FONCTIONNALITÉS DE LA PLATEFORME',
    'features.playerReg.title': 'SYSTÈME D\'INSCRIPTION DES JOUEURS',
    'features.playerReg.desc': 'Inscription des joueurs de niveau championnat avec documentation conforme à la FIFA, dossiers médicaux et système complet de gestion des contrats.',
    'features.docMgmt.title': 'GESTION DOCUMENTAIRE',
    'features.docMgmt.desc': 'Stockage cloud sécurisé de niveau élite pour les documents des joueurs, contrats, certificats médicaux et formulaires d\'inscription FIFA avec cryptage de niveau militaire.',
    'features.finMgmt.title': 'GESTION FINANCIÈRE',
    'features.finMgmt.desc': 'Suite financière complète avec génération de factures, suivi des dépenses, surveillance des revenus et calculs automatisés de compensation.',
    'features.fifaComp.title': 'CONFORMITÉ FIFA',
    'features.fifaComp.desc': 'Vérifications automatisées de conformité standard Coupe du Monde, calculs de compensation de formation et gestion du mécanisme de solidarité avec intégration FIFA en temps réel.',
    'dash.menu.dashboard': 'Tableau de bord',
    'dash.menu.players': 'Joueurs',
    'dash.menu.transfers': 'Transferts',
    'dash.menu.finances': 'Finances',
    'dash.menu.compliance': 'Conformité FIFA',
    'dash.menu.settings': 'Paramètres',
    'dash.welcome': 'Bon retour',
    'dash.role': 'Directeur d\'Académie',
    'dash.search': 'Rechercher joueurs, transactions, documents...',
  },
  pt: {
    'nav.about': 'SOBRE NÓS',
    'nav.support': 'SUPORTE',
    'nav.blog': 'BLOG',
    'nav.help': 'AJUDA',
    'nav.features': 'RECURSOS',
    'nav.benefits': 'BENEFÍCIOS',
    'nav.pricing': 'PREÇOS',
    'nav.testimonials': 'DEPOIMENTOS',
    'nav.contact': 'CONTATO',
    'nav.getStarted': 'COMEÇAR',
    'nav.register': 'REGISTRAR ACADEMIA',
    'hero.badge': 'PLATAFORMA SOCCER CIRCULAR',
    'hero.title1': 'INVISTA NO FUTURO',
    'hero.title2': 'DOS SEUS JOGADORES COM SOCCER CIRCULAR',
    'hero.subtitle': 'Registre os jogadores da sua academia hoje • Garanta pagamentos futuros de compensação • Seu primeiro passo para a estabilidade financeira a longo prazo',
    'hero.cta.register': 'REGISTRAR ACADEMIA',
    'hero.cta.start': 'COMEÇAR',
    'features.title.main': 'CLASSE MUNDIAL',
    'features.title.sub': 'RECURSOS DA PLATAFORMA',
    'features.playerReg.title': 'SISTEMA DE REGISTRO DE JOGADORES',
    'features.playerReg.desc': 'Registro de jogadores de nível campeonato com documentação compatível com a FIFA, registros médicos e sistema abrangente de gestão de contratos.',
    'features.docMgmt.title': 'GESTÃO DE DOCUMENTOS',
    'features.docMgmt.desc': 'Armazenamento em nuvem seguro de nível de elite para documentos de jogadores, contratos, certificados médicos e formulários de registro da FIFA com criptografia de nível militar.',
    'features.finMgmt.title': 'GESTÃO FINANCEIRA',
    'features.finMgmt.desc': 'Suíte financeira completa com geração de faturas, rastreamento de despesas, monitoramento de receitas e cálculos automatizados de compensação.',
    'features.fifaComp.title': 'CONFORMIDADE FIFA',
    'features.fifaComp.desc': 'Verificações automatizadas de conformidade padrão Copa do Mundo, cálculos de compensação de treinamento e gestão do mecanismo de solidariedade com integração FIFA em tempo real.',
    'dash.menu.dashboard': 'Painel',
    'dash.menu.players': 'Jogadores',
    'dash.menu.transfers': 'Transferências',
    'dash.menu.finances': 'Finanças',
    'dash.menu.compliance': 'Conformidade FIFA',
    'dash.menu.settings': 'Configurações',
    'dash.welcome': 'Bem-vindo de volta',
    'dash.role': 'Diretor da Academia',
    'dash.search': 'Buscar jogadores, transações, documentos...',
  },
  de: {
    'nav.about': 'ÜBER UNS',
    'nav.support': 'SUPPORT',
    'nav.blog': 'BLOG',
    'nav.help': 'HILFE',
    'nav.features': 'FUNKTIONEN',
    'nav.benefits': 'VORTEILE',
    'nav.pricing': 'PREISE',
    'nav.testimonials': 'REFERENZEN',
    'nav.contact': 'KONTAKT',
    'nav.getStarted': 'LOSLEGEN',
    'nav.register': 'AKADEMIE REGISTRIEREN',
    'hero.badge': 'SOCCER CIRCULAR PLATTFORM',
    'hero.title1': 'INVESTIEREN SIE IN DIE ZUKUNFT',
    'hero.title2': 'IHRES SPIELERS MIT SOCCER CIRCULAR',
    'hero.subtitle': 'Registrieren Sie Ihre Akademie-Spieler noch heute • Sichern Sie sich zukünftige Ausbildungsentschädigungen • Ihr erster Schritt zu langfristiger finanzieller Stabilität',
    'hero.cta.register': 'AKADEMIE REGISTRIEREN',
    'hero.cta.start': 'LOSLEGEN',
    'dash.menu.dashboard': 'Dashboard',
    'dash.menu.players': 'Spieler',
    'dash.menu.transfers': 'Transfers',
    'dash.menu.finances': 'Finanzen',
    'dash.menu.compliance': 'FIFA-Compliance',
    'dash.menu.settings': 'Einstellungen',
    'dash.welcome': 'Willkommen zurück',
    'dash.role': 'Akademie-Direktor',
    'dash.search': 'Suchen Sie Spieler, Transaktionen, Dokumente...',
  },
  it: {
    'nav.about': 'CHI SIAMO',
    'nav.support': 'SUPPORTO',
    'nav.blog': 'BLOG',
    'nav.help': 'AIUTO',
    'nav.features': 'FUNZIONALITÀ',
    'nav.benefits': 'VANTAGGI',
    'nav.pricing': 'PREZZI',
    'nav.testimonials': 'TESTIMONIANZE',
    'nav.contact': 'CONTATTO',
    'nav.getStarted': 'INIZIA',
    'nav.register': 'REGISTRA ACCADEMIA',
    'hero.badge': 'PIATTAFORMA SOCCER CIRCULAR',
    'hero.title1': 'INVESTI NEL FUTURO',
    'hero.title2': 'DEI TUOI GIOCATORI CON SOCCER CIRCULAR',
    'hero.subtitle': 'Registra i giocatori della tua accademia oggi • Assicura i futuri pagamenti di compensazione • Il tuo primo passo verso la stabilità finanziaria a lungo termine',
    'hero.cta.register': 'REGISTRA ACCADEMIA',
    'hero.cta.start': 'INIZIA',
    'dash.menu.dashboard': 'Dashboard',
    'dash.menu.players': 'Giocatori',
    'dash.menu.transfers': 'Trasferimenti',
    'dash.menu.finances': 'Finanze',
    'dash.menu.compliance': 'Conformità FIFA',
    'dash.menu.settings': 'Impostazioni',
    'dash.welcome': 'Bentornato',
    'dash.role': 'Direttore Accademia',
    'dash.search': 'Cerca giocatori, transazioni, documenti...',
  },
  ar: {
    'nav.about': 'معلومات عنا',
    'nav.support': 'الدعم',
    'nav.blog': 'المدونة',
    'nav.help': 'مركز المساعدة',
    'nav.features': 'الميزات',
    'nav.benefits': 'الفوائد',
    'nav.pricing': 'الأسعار',
    'nav.testimonials': 'الشهادات',
    'nav.contact': 'اتصل بنا',
    'nav.getStarted': 'ابدأ الآن',
    'nav.register': 'تسجيل الأكاديمية',
    'hero.badge': 'منصة سوكر سيركولار',
    'hero.title1': 'استثمر في مستقبل',
    'hero.title2': 'لاعبيك مع سوكر سيركولار',
    'hero.subtitle': 'سجل لاعبي أكاديميتك اليوم • اضمن مدفوعات التعويض المستقبلية • خطوتك الأولى نحو الاستقرار المالي طويل الأجل',
    'hero.cta.register': 'تسجيل الأكاديمية',
    'hero.cta.start': 'ابدأ الآن',
    'dash.menu.dashboard': 'لوحة القيادة',
    'dash.menu.players': 'اللاعبين',
    'dash.menu.transfers': 'الانتقالات',
    'dash.menu.finances': 'المالية',
    'dash.menu.compliance': 'الامتثال للفيفا',
    'dash.menu.settings': 'الإعدادات',
    'dash.welcome': 'مرحبا بعودتك',
    'dash.role': 'مدير الأكاديمية',
    'dash.search': 'البحث عن اللاعبين والمعاملات والمستندات ...',
  },
  zh: {
    'nav.about': '关于我们',
    'nav.support': '支持',
    'nav.blog': '博客',
    'nav.help': '帮助中心',
    'nav.features': '功能',
    'nav.benefits': '优势',
    'nav.pricing': '定价',
    'nav.testimonials': '客户评价',
    'nav.contact': '联系我们',
    'nav.getStarted': '立即开始',
    'nav.register': '注册学院',
    'hero.badge': 'SOCCER CIRCULAR 平台',
    'hero.title1': '投资于球员的未来',
    'hero.title2': '与 SOCCER CIRCULAR 一起',
    'hero.subtitle': '立即注册您的学院球员 • 确保未来的补偿金 • 迈向长期财务稳定的第一步',
    'hero.cta.register': '注册学院',
    'hero.cta.start': '立即开始',
    'dash.menu.dashboard': '仪表板',
    'dash.menu.players': '球员',
    'dash.menu.transfers': '转会',
    'dash.menu.finances': '财务',
    'dash.menu.compliance': 'FIFA 合规',
    'dash.menu.settings': '设置',
    'dash.welcome': '欢迎回来',
    'dash.role': '学院院长',
    'dash.search': '搜索球员、交易、文件...',
  }
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load saved language from local storage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as LanguageCode;
    if (savedLang && languages.some(l => l.code === savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
