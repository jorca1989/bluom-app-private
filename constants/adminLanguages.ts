export const ADMIN_TRANSLATION_LANGUAGES = [
  { code: 'pt', label: 'PT', name: 'Portuguese' },
  { code: 'es', label: 'ES', name: 'Spanish' },
  { code: 'fr', label: 'FR', name: 'French' },
  { code: 'de', label: 'DE', name: 'German' },
  { code: 'nl', label: 'NL', name: 'Dutch' },
  { code: 'bg', label: 'BG', name: 'Bulgarian' },
  { code: 'da', label: 'DA', name: 'Danish' },
  { code: 'el', label: 'EL', name: 'Greek' },
  { code: 'lt', label: 'LT', name: 'Lithuanian' },
  { code: 'lv', label: 'LV', name: 'Latvian' },
  { code: 'no', label: 'NO', name: 'Norwegian' },
  { code: 'pl', label: 'PL', name: 'Polish' },
  { code: 'ro', label: 'RO', name: 'Romanian' },
  { code: 'sv', label: 'SV', name: 'Swedish' },
  { code: 'tr', label: 'TR', name: 'Turkish' },
] as const;

export type AdminTranslationLanguageCode = (typeof ADMIN_TRANSLATION_LANGUAGES)[number]['code'];
