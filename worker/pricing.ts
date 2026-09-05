// Pricing + timing + contacts from settings DB (single source of truth).

import { createDb } from './db';
import { settings as settingsTable } from './db/schema';
import type { Env } from './lib';

export interface Pricing {
  bridal: { hair: number; makeup: number; pack: number };
  beauty: { hair: number; makeup: number; pack: number };
  skin_call: { session1: number; session2: number; session3: number; session4: number };
  education: { workshop: number };
}

export interface Timing {
  setup: number;
  bridal: number;
  guest: number;
}

export interface Contacts {
  email: string;
  phone: string;
  address: string;
}

export const PRICING_FALLBACKS: Pricing = {
  bridal: { hair: 250, makeup: 250, pack: 475 },
  beauty: { hair: 60, makeup: 60, pack: 110 },
  skin_call: { session1: 80, session2: 150, session3: 210, session4: 260 },
  education: { workshop: 150 },
};

export const TIMING_FALLBACKS: Timing = {
  setup: 15,
  bridal: 60,
  guest: 45,
};

export const CONTACT_FALLBACKS: Contacts = {
  email: 'hello@marianapita.pt',
  phone: '',
  address: '',
};

async function loadSettingsMap(env: Env): Promise<Record<string, string>> {
  try {
    const db = createDb(env);
    const rows = await db.select().from(settingsTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return {};
  }
}

function num(map: Record<string, string>, key: string, fallback: number): number {
  const v = map[key];
  return v ? parseInt(v, 10) || fallback : fallback;
}

export async function getPricing(env: Env): Promise<Pricing> {
  const map = await loadSettingsMap(env);
  const F = PRICING_FALLBACKS;
  return {
    bridal: {
      hair: num(map, 'price_bridal_hair', F.bridal.hair),
      makeup: num(map, 'price_bridal_makeup', F.bridal.makeup),
      pack: num(map, 'price_bridal_pack', F.bridal.pack),
    },
    beauty: {
      hair: num(map, 'price_beauty_hair', F.beauty.hair),
      makeup: num(map, 'price_beauty_makeup', F.beauty.makeup),
      pack: num(map, 'price_beauty_pack', F.beauty.pack),
    },
    skin_call: {
      session1: num(map, 'price_skin_session1', F.skin_call.session1),
      session2: num(map, 'price_skin_session2', F.skin_call.session2),
      session3: num(map, 'price_skin_session3', F.skin_call.session3),
      session4: num(map, 'price_skin_session4', F.skin_call.session4),
    },
    education: {
      workshop: num(map, 'price_education_workshop', F.education.workshop),
    },
  };
}

export async function getTiming(env: Env): Promise<Timing> {
  const map = await loadSettingsMap(env);
  const F = TIMING_FALLBACKS;
  return {
    setup: num(map, 'time_setup', F.setup),
    bridal: num(map, 'time_bridal', F.bridal),
    guest: num(map, 'time_guest', F.guest),
  };
}

export async function getContacts(env: Env): Promise<Contacts> {
  const map = await loadSettingsMap(env);
  return {
    email: map.contact_email || CONTACT_FALLBACKS.email,
    phone: map.contact_phone || CONTACT_FALLBACKS.phone,
    address: map.contact_address || CONTACT_FALLBACKS.address,
  };
}

export interface PaymentDetails {
  iban: string;
  accountName: string;
  mbway: string;
}

export const PAYMENT_FALLBACKS: PaymentDetails = {
  iban: '[IBAN - substituir]',
  accountName: '[Titular da conta - substituir]',
  mbway: '[MB Way - substituir]',
};

export async function getPaymentDetails(env: Env): Promise<PaymentDetails> {
  const map = await loadSettingsMap(env);
  return {
    iban: map.payment_iban || PAYMENT_FALLBACKS.iban,
    accountName: map.payment_account_name || PAYMENT_FALLBACKS.accountName,
    mbway: map.payment_mbway || PAYMENT_FALLBACKS.mbway,
  };
}
