import { en } from './en';
import { pt } from './pt';
import { DEFAULT_LOCALE, type Locale, parseLocale } from './types';

export type { Locale } from './types';
export { DEFAULT_LOCALE, LOCALES, isLocale, parseLocale } from './types';
export type { SiteCopy } from './pt';

const dictionaries = { pt, en } as const;

export function copy(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function localeFromPath(pathname: string): Locale {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/en' || p.startsWith('/en/')) return 'en';
  return 'pt';
}

/** Path without the `/en` prefix. */
export function stripLocalePrefix(pathname: string): string {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/en') return '/';
  if (p.startsWith('/en/')) return p.slice(3) || '/';
  return p;
}

/** Prefix a site-absolute path for the given locale. */
export function localizePath(path: string, locale: Locale): string {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const queryIndex = path.indexOf('?');
  const query = queryIndex >= 0 && (hashIndex < 0 || queryIndex < hashIndex)
    ? path.slice(queryIndex, hashIndex >= 0 ? hashIndex : undefined)
    : '';
  const raw = path.slice(0, queryIndex >= 0 ? queryIndex : hashIndex >= 0 ? hashIndex : undefined);
  const clean = (raw.startsWith('/') ? raw : `/${raw}`).replace(/\/+$/, '') || '/';
  const bare = stripLocalePrefix(clean);

  if (locale === 'pt') return `${bare === '/' ? '/' : bare}${query}${hash}`;
  if (bare === '/') return `/en${query}${hash}`;
  return `/en${bare}${query}${hash}`;
}

export function switchLocalePath(pathname: string): string {
  const locale = localeFromPath(pathname);
  const other: Locale = locale === 'pt' ? 'en' : 'pt';
  return localizePath(pathname, other);
}

export function localeHtmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'pt';
}

export function localeOg(locale: Locale): string {
  return locale === 'en' ? 'en_GB' : 'pt_PT';
}
