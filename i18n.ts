import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import enHome from './locales/en/translation.json';
import ptHome from './locales/pt/translation.json';

const resources = {
  en: { translation: enHome },
  pt: { translation: ptHome },
};

// Detect device locale and map to supported language
function detectLanguage(): string {
  const supported = ['pt', 'en'];
  const locales = Localization.getLocales?.() ?? [];
  for (const loc of locales) {
    const tag = loc.languageTag ?? '';    // e.g. "pt-PT", "en-US"
    const lang = loc.languageCode ?? ''; // e.g. "pt", "en"
    const byTag = supported.find(s => tag.toLowerCase().startsWith(s));
    if (byTag) return byTag;
    const byLang = supported.find(s => s === lang.toLowerCase());
    if (byLang) return byLang;
  }
  return 'en';
}

const detectedLng = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectedLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    debug: false,
    returnNull: false,
  });

export default i18n;
