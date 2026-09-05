// Bridal quote pricing helpers (shared by email template).

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

export function bridalQuoteTotal(formData: Record<string, string>, pricing: Pricing): {
  bridePrice: number;
  guestTotal: number;
  total: number;
  guests: { makeup: number; hair: number; pack: number };
  brideLabel: string;
} {
  const guests = parseGuestCounts(formData);
  const bridePrice = bridalBridePrice(formData.servicos_procurados || '', pricing);
  const guestTotal = bridalGuestTotal(guests, pricing);
  return {
    bridePrice,
    guestTotal,
    total: bridePrice + guestTotal,
    guests,
    brideLabel: brideServiceLabel(formData.servicos_procurados || ''),
  };
}
