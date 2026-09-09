// Bridal quote pricing helpers (shared by email template).

import type { LeadType } from './lib';
import { DEFAULT_LOCALE, parseLocale, type Locale } from './locale';
import type { Pricing } from './pricing';

export type BrideService = 'Makeup' | 'Hair' | 'Pack' | string;

export function parseGuestCounts(formData: Record<string, string>): {
  makeup: number;
  hair: number;
  pack: number;
} {
  // Legacy fallback: single numero_guests counted as hair (old quotes)
  const legacy = parseInt(formData.numero_guests || '', 10);
  const hasNew =
    formData.guests_makeup != null ||
    formData.guests_hair != null ||
    formData.guests_pack != null;

  if (!hasNew && !Number.isNaN(legacy) && legacy > 0) {
    return { makeup: 0, hair: legacy, pack: 0 };
  }

  return {
    makeup: Math.max(0, parseInt(formData.guests_makeup || '0', 10) || 0),
    hair: Math.max(0, parseInt(formData.guests_hair || '0', 10) || 0),
    pack: Math.max(0, parseInt(formData.guests_pack || '0', 10) || 0),
  };
}

export function normalizeBrideService(servicos: string): BrideService {
  if (servicos === 'Pack Makeup & Hair' || servicos === 'Pack') return 'Pack';
  if (servicos === 'Makeup' || servicos === 'Hair') return servicos;
  return servicos || 'Pack';
}

export function brideServiceLabel(servicos: string): string {
  const s = normalizeBrideService(servicos);
  if (s === 'Makeup') return 'Makeup';
  if (s === 'Hair') return 'Hair';
  if (s === 'Pack') return 'Pack (Pack Makeup & Hair)';
  return s;
}

export function bridalBridePrice(servicos: string, pricing: Pricing): number {
  const s = normalizeBrideService(servicos);
  const p = pricing.bridal;
  if (s === 'Makeup') return p.makeup;
  if (s === 'Hair') return p.hair;
  return p.pack;
}

export function bridalGuestTotal(
  counts: { makeup: number; hair: number; pack: number },
  pricing: Pricing
): number {
  const g = pricing.beauty;
  return counts.makeup * g.makeup + counts.hair * g.hair + counts.pack * g.pack;
}

export function hasPerServiceGuests(formData: Record<string, string>): boolean {
  return (
    formData.guests_makeup != null ||
    formData.guests_hair != null ||
    formData.guests_pack != null
  );
}

export function beautyHeadcount(formData: Record<string, string>): number {
  if (hasPerServiceGuests(formData)) {
    const guests = parseGuestCounts(formData);
    return guests.makeup + guests.hair + guests.pack;
  }
  return Math.max(0, parseInt(formData.numero_pessoas || '0', 10) || 0);
}

export function parseTravelFee(formData: Record<string, string>): number {
  const n = parseFloat((formData.valor_deslocacao || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Inteiro: `250€`. Com cêntimos: `237,50€` (pt) / `237.50€` (en). Sem arredondar o valor. */
export function formatEuro(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  if (Number.isInteger(amount)) return `${amount}€`;
  const [whole, frac] = amount.toFixed(2).split('.');
  return `${whole}${locale === 'en' ? '.' : ','}${frac}€`;
}

/** Plano Skin Call (formulário ou addon Bridal) → preço Settings. Vazio / "-" → null. */
export function skinCallPlanPrice(
  plano: string | undefined,
  pricing: Pricing,
): { label: string; price: number } | null {
  const raw = (plano || '').trim();
  if (!raw || raw === '-' || /^\{\{\w+\}\}$/.test(raw)) return null;
  const p = pricing.skin_call;
  if (/full year|12m|quatro/i.test(raw)) return { label: raw, price: p.session4 };
  if (/triple|trio|9m/i.test(raw)) return { label: raw, price: p.session3 };
  if (/duo|6m/i.test(raw)) return { label: raw, price: p.session2 };
  if (/one time|solo|3m/i.test(raw)) return { label: raw, price: p.session1 };
  return null;
}

export function beautyQuoteTotal(formData: Record<string, string>, pricing: Pricing): {
  guests: { makeup: number; hair: number; pack: number };
  guestTotal: number;
  travel: number;
  total: number;
  legacy: boolean;
  servicoLabel: string;
  base: number;
  extras: number;
  pessoas: number;
} {
  const travel = parseTravelFee(formData);
  if (hasPerServiceGuests(formData)) {
    const guests = parseGuestCounts(formData);
    const guestTotal = bridalGuestTotal(guests, pricing);
    return {
      guests,
      guestTotal,
      travel,
      total: guestTotal + travel,
      legacy: false,
      servicoLabel: '',
      base: 0,
      extras: 0,
      pessoas: guests.makeup + guests.hair + guests.pack,
    };
  }

  const p = pricing.beauty;
  const servicos = formData.servicos_procurados_guests || '';
  const pessoas = Math.max(0, parseInt(formData.numero_pessoas || '0', 10) || 0);
  let base = p.pack;
  let servicoLabel = 'Pack Makeup & Hair';
  if (servicos === 'Makeup') {
    base = p.makeup;
    servicoLabel = 'Makeup';
  } else if (servicos === 'Hair') {
    base = p.hair;
    servicoLabel = 'Hair';
  }
  const extras = pessoas > 1 ? (pessoas - 1) * p.hair : 0;
  return {
    guests: { makeup: 0, hair: 0, pack: 0 },
    guestTotal: base + extras,
    travel,
    total: base + extras + travel,
    legacy: true,
    servicoLabel,
    base,
    extras,
    pessoas,
  };
}

export function bridalQuoteTotal(formData: Record<string, string>, pricing: Pricing): {
  bridePrice: number;
  guestTotal: number;
  travel: number;
  addonPrice: number;
  addonLabel: string;
  total: number;
  guests: { makeup: number; hair: number; pack: number };
  brideLabel: string;
} {
  const guests = parseGuestCounts(formData);
  const bridePrice = bridalBridePrice(formData.servicos_procurados || '', pricing);
  const guestTotal = bridalGuestTotal(guests, pricing);
  const travel = parseTravelFee(formData);
  const addon = skinCallPlanPrice(formData.addon_skin_call, pricing);
  const addonPrice = addon?.price ?? 0;
  return {
    bridePrice,
    guestTotal,
    travel,
    addonPrice,
    addonLabel: addon?.label || '',
    total: bridePrice + guestTotal + travel + addonPrice,
    guests,
    brideLabel: brideServiceLabel(formData.servicos_procurados || ''),
  };
}

export function educationQuoteTotal(formData: Record<string, string>, pricing: Pricing): {
  workshop: number;
  travel: number;
  total: number;
} {
  const workshop = pricing.education.workshop;
  const travel = parseTravelFee(formData);
  return { workshop, travel, total: workshop + travel };
}

/** Sinal de reserva. Skin Call não tem. Metade exacta, sem arredondar. */
export function reservationDeposit(
  type: LeadType,
  formData: Record<string, string>,
  pricing: Pricing,
): number | null {
  if (type === 'skin-call') return null;
  if (type === 'bridal') {
    const quote = bridalQuoteTotal(formData, pricing);
    return quote.travel + quote.addonPrice + quote.bridePrice / 2;
  }
  if (type === 'beauty') {
    return beautyQuoteTotal(formData, pricing).total / 2;
  }
  return educationQuoteTotal(formData, pricing).total / 2;
}

export function formatSinalReserva(
  amount: number | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return amount == null ? '' : formatEuro(amount, locale);
}

export function attachSinalVars(
  type: LeadType,
  formData: Record<string, string>,
  pricing: Pricing,
  locale?: Locale,
): Record<string, string> {
  const loc = locale ?? parseLocale(formData.locale);
  const value = formatSinalReserva(reservationDeposit(type, formData, pricing), loc);
  return value ? { sinal_reserva: value } : {};
}
