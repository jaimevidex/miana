export const LOCALES = ['pt', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'pt' || value === 'en';
}

export function parseLocale(value: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  return isLocale(value) ? value : fallback;
}

export function localeLabel(locale: Locale): string {
  return locale === 'en' ? 'English' : 'Português';
}

export function localeDateTag(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'pt-PT';
}
