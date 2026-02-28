/**
 * TITAN DEV AI — Internationalization (i18n)
 * Bangla/English language support for Client Dashboard
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type Language = 'en' | 'bn';

// Translation dictionary
const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.home': { en: 'Home', bn: 'হোম' },
  'nav.tasks': { en: 'Tasks', bn: 'কার্যসমূহ' },
  'nav.messages': { en: 'Messages', bn: 'বার্তা' },
  'nav.billing': { en: 'Billing', bn: 'বিলিং' },
  'nav.more': { en: 'More', bn: 'আরো' },

  // Home
  'home.welcome': { en: 'Welcome Back', bn: 'স্বাগতম' },
  'home.packageUsage': { en: 'Package Usage', bn: 'প্যাকেজ ব্যবহার' },
  'home.quickActions': { en: 'Quick Actions', bn: 'দ্রুত কার্য' },
  'home.recentActivity': { en: 'Recent Activity', bn: 'সাম্প্রতিক কার্যকলাপ' },
  'home.walletBalance': { en: 'Wallet Balance', bn: 'ওয়ালেট ব্যালেন্স' },
  'home.requestDesign': { en: 'Request Design', bn: 'ডিজাইন রিকোয়েস্ট' },
  'home.newCampaign': { en: 'New Campaign', bn: 'নতুন ক্যাম্পেইন' },
  'home.viewInvoices': { en: 'View Invoices', bn: 'ইনভয়েস দেখুন' },
  'home.analytics': { en: 'Analytics', bn: 'এনালিটিক্স' },

  // Tasks
  'tasks.title': { en: 'My Tasks', bn: 'আমার কার্যসমূহ' },
  'tasks.newRequest': { en: 'New Request', bn: 'নতুন রিকোয়েস্ট' },
  'tasks.pending': { en: 'Pending', bn: 'অমীমাংসিত' },
  'tasks.inProgress': { en: 'In Progress', bn: 'চলমান' },
  'tasks.review': { en: 'In Review', bn: 'পর্যালোচনায়' },
  'tasks.approved': { en: 'Approved', bn: 'অনুমোদিত' },
  'tasks.delivered': { en: 'Delivered', bn: 'ডেলিভার হয়েছে' },
  'tasks.all': { en: 'All', bn: 'সব' },

  // Billing
  'billing.title': { en: 'Billing & Wallet', bn: 'বিলিং ও ওয়ালেট' },
  'billing.wallet': { en: 'Wallet', bn: 'ওয়ালেট' },
  'billing.invoices': { en: 'Invoices', bn: 'ইনভয়েস' },
  'billing.addFund': { en: 'Add Fund', bn: 'ফান্ড যোগ করুন' },
  'billing.paid': { en: 'Paid', bn: 'পরিশোধিত' },
  'billing.overdue': { en: 'Overdue', bn: 'মেয়াদোত্তীর্ণ' },
  'billing.autoPayment': { en: 'Auto Payment', bn: 'স্বয়ংক্রিয় পেমেন্ট' },

  // More Menu
  'more.profile': { en: 'Business Profile', bn: 'ব্যবসায়িক প্রোফাইল' },
  'more.notifications': { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
  'more.files': { en: 'Files & Assets', bn: 'ফাইল ও অ্যাসেট' },
  'more.package': { en: 'Package Details', bn: 'প্যাকেজ বিবরণ' },
  'more.paymentHistory': { en: 'Payment History', bn: 'পেমেন্ট ইতিহাস' },
  'more.boost': { en: 'Boost Campaigns', bn: 'বুস্ট ক্যাম্পেইন' },
  'more.analytics': { en: 'Analytics & Reports', bn: 'এনালিটিক্স ও রিপোর্ট' },
  'more.calendar': { en: 'Content Calendar', bn: 'কন্টেন্ট ক্যালেন্ডার' },
  'more.brandKit': { en: 'Brand Kit', bn: 'ব্র্যান্ড কিট' },
  'more.support': { en: 'Help & Support', bn: 'সাহায্য ও সহায়তা' },
  'more.settings': { en: 'Account Settings', bn: 'অ্যাকাউন্ট সেটিংস' },
  'more.signOut': { en: 'Sign Out', bn: 'সাইন আউট' },

  // Settings
  'settings.title': { en: 'Account Settings', bn: 'অ্যাকাউন্ট সেটিংস' },
  'settings.security': { en: 'Security', bn: 'নিরাপত্তা' },
  'settings.notifications': { en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
  'settings.appearance': { en: 'Appearance', bn: 'অ্যাপিয়ারেন্স' },
  'settings.language': { en: 'Language', bn: 'ভাষা' },
  'settings.changePassword': { en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন' },
  'settings.twoFactor': { en: 'Two-Factor Authentication', bn: 'টু-ফ্যাক্টর অথেনটিকেশন' },
  'settings.darkMode': { en: 'Dark Mode', bn: 'ডার্ক মোড' },
  'settings.lightMode': { en: 'Light Mode', bn: 'লাইট মোড' },
  'settings.systemMode': { en: 'System', bn: 'সিস্টেম' },
  'settings.save': { en: 'Save Changes', bn: 'পরিবর্তন সংরক্ষণ করুন' },

  // Support
  'support.title': { en: 'Help & Support', bn: 'সাহায্য ও সহায়তা' },
  'support.newTicket': { en: 'New Ticket', bn: 'নতুন টিকেট' },
  'support.faq': { en: 'FAQ', bn: 'জিজ্ঞাসা' },

  // Analytics
  'analytics.title': { en: 'Analytics & Reports', bn: 'এনালিটিক্স ও রিপোর্ট' },
  'analytics.export': { en: 'Export Report', bn: 'রিপোর্ট এক্সপোর্ট' },
  'analytics.performance': { en: 'Performance', bn: 'পারফরম্যান্স' },

  // Common
  'common.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
  'common.error': { en: 'Something went wrong', bn: 'কিছু সমস্যা হয়েছে' },
  'common.retry': { en: 'Retry', bn: 'আবার চেষ্টা করুন' },
  'common.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'common.submit': { en: 'Submit', bn: 'জমা দিন' },
  'common.back': { en: 'Back', bn: 'পিছনে' },
  'common.close': { en: 'Close', bn: 'বন্ধ' },
  'common.savedSuccessfully': { en: 'Changes saved successfully!', bn: 'পরিবর্তন সফলভাবে সংরক্ষিত!' },
  'common.noData': { en: 'No data available', bn: 'কোনো ডেটা নেই' },
  'common.refresh': { en: 'Refresh', bn: 'রিফ্রেশ' },
  'common.download': { en: 'Download', bn: 'ডাউনলোড' },
  'common.enabled': { en: 'Enabled', bn: 'সক্রিয়' },
  'common.disabled': { en: 'Disabled', bn: 'নিষ্ক্রিয়' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'titan_language';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'bn' ? 'bn' : 'en') as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback((key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry['en'] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Safe fallback
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => {
        const entry = translations[key];
        return entry?.en || key;
      },
    };
  }
  return context;
}
