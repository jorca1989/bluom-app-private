import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import enHome from './locales/en/translation.json';
import ptHome from './locales/pt/translation.json';
import esHome from './locales/es/translation.json';
import frHome from './locales/fr/translation.json';
import nlHome from './locales/nl/translation.json';
import deHome from './locales/de/translation.json';
import plHome from './locales/pl/translation.json';
import svHome from './locales/sv/translation.json';
import noHome from './locales/no/translation.json';
import daHome from './locales/da/translation.json';
import trHome from './locales/tr/translation.json';
import elHome from './locales/el/translation.json';
import bgHome from './locales/bg/translation.json';
import roHome from './locales/ro/translation.json';
import ltHome from './locales/lt/translation.json';
import lvHome from './locales/lv/translation.json';

const resources = {
  en: { translation: enHome },
  pt: { translation: ptHome },
  es: { translation: esHome },
  fr: { translation: frHome },
  nl: { translation: nlHome },
  de: { translation: deHome },
  pl: { translation: plHome },
  sv: { translation: svHome },
  no: { translation: noHome },
  da: { translation: daHome },
  tr: { translation: trHome },
  el: { translation: elHome },
  bg: { translation: bgHome },
  ro: { translation: roHome },
  lt: { translation: ltHome },
  lv: { translation: lvHome },
};

const LANG_KEY = 'app_language';
const supported = ['pt', 'es', 'fr', 'nl', 'de', 'pl', 'sv', 'no', 'da', 'tr', 'el', 'bg', 'ro', 'lt', 'lv', 'en'];

// Detect device locale and map to supported language
function detectLanguage(): string {
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

/**
 * Call this early in _layout.tsx (before rendering) to restore the
 * user-chosen language from SecureStore. Falls back to convexUser.preferredLanguage
 * once the DB loads, but this ensures no flash to the wrong language.
 */
export async function restoreSavedLanguage(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(LANG_KEY);
    if (saved && supported.includes(saved) && i18n.language !== saved) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // SecureStore unavailable — proceed with detected language
  }
}

/**
 * Persist a language choice to SecureStore so it survives app restarts.
 */
export async function saveLanguagePreference(lang: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export default i18n;
