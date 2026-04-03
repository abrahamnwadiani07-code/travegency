import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../data/translations';

const LanguageContext = createContext();

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'ar', name: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
  { code: 'pt', name: 'Português',  flag: '🇧🇷' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'sw', name: 'Kiswahili',  flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa',      flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá',     flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo',       flag: '🇳🇬' },
  { code: 'am', name: 'አማርኛ',      flag: '🇪🇹' },
];

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem('tragency-lang');
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem('tragency-lang', lang);
    } catch (e) {
      // localStorage not available
    }
    // Set document direction for RTL languages
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    document.documentElement.dir = langConfig?.dir || 'ltr';
  }, []);

  const t = useCallback((key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[currentLanguage] || entry.en || key;
  }, [currentLanguage]);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { SUPPORTED_LANGUAGES };
export default LanguageContext;
