/**
 * utils/localize.ts
 *
 * Central helpers for pulling the right language out of multilingual
 * database fields.  Two patterns exist in this codebase:
 *
 *  Pattern A – exerciseLibrary  name field:
 *    { en: "Bench Press", pt: "Supino", nl: "Bankdrukken", ... }
 *
 *  Pattern B – videoWorkouts / publicRecipes:
 *    Base field:          title = "Bench Press"
 *    Translations object: titleLocalizations = { pt: "Supino", nl: "Bankdrukken" }
 */

type LocalizedObject = { en: string; pt?: string; nl?: string; es?: string; de?: string; fr?: string; [key: string]: string | undefined };
type LocalizationsMap  = { pt?: string; nl?: string; es?: string; de?: string; fr?: string; [key: string]: string | undefined };

/**
 * getLocalized
 *
 * Handles both patterns in one call.
 *
 * @param base          The base English string (or a LocalizedObject for Pattern A)
 * @param localizations The optional *Localizations map (Pattern B) – pass null if N/A
 * @param lang          Two-letter language code e.g. 'pt', 'nl', 'es'
 * @returns             Translated string, falling back to English / base
 */
export function getLocalized(
  base: string | LocalizedObject | undefined | null,
  localizations: LocalizationsMap | undefined | null,
  lang: string,
): string {
  const code = lang?.split('-')[0] ?? 'en';

  // Pattern A — base is itself a {en, pt, ...} object
  if (base && typeof base === 'object') {
    return (base as LocalizedObject)[code] ?? (base as LocalizedObject).en ?? '';
  }

  const baseStr = (base as string) ?? '';

  // Pattern B — look up in the *Localizations side-object
  if (code !== 'en' && localizations && localizations[code]) {
    return localizations[code] as string;
  }

  return baseStr;
}

/**
 * getLocalizedField
 *
 * Convenience wrapper for Pattern B: given a DB document and a field name,
 * reads `doc[field]` + `doc[field + 'Localizations']` and returns the right string.
 *
 * e.g. getLocalizedField(workout, 'title', 'pt')
 *      → workout.titleLocalizations.pt ?? workout.title
 */
export function getLocalizedField(
  doc: Record<string, any> | undefined | null,
  field: string,
  lang: string,
): string {
  if (!doc) return '';
  return getLocalized(doc[field], doc[`${field}Localizations`], lang);
}

/**
 * getLocalizedExerciseName
 *
 * Exercise names from exerciseLibrary are stored as either:
 *   - Legacy:  string          "Bench Press"
 *   - Current: object          { en: "Bench Press", pt: "Supino" }
 *
 * This helper normalises both.
 */
export function getLocalizedExerciseName(
  name: string | LocalizedObject | undefined | null,
  lang: string,
): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  const code = lang?.split('-')[0] ?? 'en';
  return name[code] ?? name.en ?? '';
}
