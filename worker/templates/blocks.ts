// Blocos gerados (preços, pagamento, botões) injectados em {{bloco}}.

import type { Pricing } from '../pricing';
import { beautyQuoteTotal, bridalQuoteTotal, parseTravelFee } from '../bridal-pricing';
import { fieldRow, sectionTitle, priceRow } from './base';
import { DEFAULT_LOCALE, type Locale } from '../locale';

const BLOCK = {
  pt: {
    data: 'Dados',
    services: 'Serviços',
    investment: 'Valor',
    total: 'Valor total',
    travel: 'Deslocação',
    notes: 'Notas',
    name: 'Nome',
    weddingDate: 'Data do casamento',
    readyTime: 'Hora de estar pronta',
    prepLocation: 'Local da preparação',
    trialLocation: 'Local da prova',
    bride: 'Noiva',
    eventDate: 'Data do evento',
    eventLocation: 'Local do evento',
    service: 'Serviço',
    people: 'Número de pessoas',
    extras: 'Adicionais',
    packComplete: 'Pack Completo (Hair + Makeup)',
    plan: 'Plano',
    chosenPlan: 'Plano escolhido',
    solo: 'Solo Call (1 sessão)',
    duo: 'Duo Call (2 sessões)',
    trio: 'Trio Call (3 sessões)',
    quatro: 'Quatro Call (4 sessões)',
    format: 'Formato',
    location: 'Local',
    datetime: 'Data e hora',
    type: 'Tipo',
    modality: 'Modalidade',
    participants: 'Número de participantes',
    regime: 'Regime',
    message: 'Mensagem',
    workshop: 'Workshop',
    payment: 'Dados de pagamento',
    accountHolder: 'Titular',
    joinMeet: 'Entrar no Google Meet',
    beforeCall: 'Antes da chamada, preenche por favor o formulário de avaliação de pele:',
    openForm: 'Abrir formulário',
    openDiag: 'Abrir avaliação de pele',
  },
  en: {
    data: 'Details',
    services: 'Services',
    investment: 'Amount',
    total: 'Total amount',
    travel: 'Travel',
    notes: 'Notes',
    name: 'Name',
    weddingDate: 'Wedding date',
    readyTime: 'Ready-by time',
    prepLocation: 'Getting-ready location',
    trialLocation: 'Trial location',
    bride: 'Bride',
    eventDate: 'Event date',
    eventLocation: 'Event location',
    service: 'Service',
    people: 'Number of people',
    extras: 'Extras',
    packComplete: 'Full pack (Hair + Makeup)',
    plan: 'Plan',
    chosenPlan: 'Chosen plan',
    solo: 'Solo Call (1 session)',
    duo: 'Duo Call (2 sessions)',
    trio: 'Trio Call (3 sessions)',
    quatro: 'Quatro Call (4 sessions)',
    format: 'Format',
    location: 'Location',
    datetime: 'Date and time',
    type: 'Type',
    modality: 'Modality',
    participants: 'Number of participants',
    regime: 'Format',
    message: 'Message',
    workshop: 'Workshop',
    payment: 'Payment details',
    accountHolder: 'Account holder',
    joinMeet: 'Join Google Meet',
    beforeCall: 'Before the call, please fill in the skin assessment form:',
    openForm: 'Open form',
    openDiag: 'Open skin assessment',
  },
} as const;

function L(locale: Locale = DEFAULT_LOCALE) {
  return BLOCK[locale] || BLOCK.pt;
}

function notesHtml(notes: string | undefined, locale: Locale): string {
  if (!notes) return '';
  return `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">${L(locale).notes}</h3><p>${notes}</p>`;
}

function isPlaceholder(value: string | undefined): boolean {
  return !!value && /^\{\{\w+\}\}$/.test(value);
}

function showValue(raw: string | undefined, computed: string): string {
  return isPlaceholder(raw) ? raw! : computed;
}

function travelRow(formData: Record<string, string>, locale: Locale): string {
  const travel = parseTravelFee(formData);
  return travel > 0 ? priceRow(L(locale).travel, travel) : '';
}

function totalRow(label: string, amount: number): string {
  return `
    <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #e5ded7;padding-top:8px;display:flex;justify-content:space-between">
      <strong>${label}</strong>
      <strong>${amount}€</strong>
    </p>`;
}

export function bridalBlock(formData: Record<string, string>, pricing: Pricing, notes?: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  const quote = bridalQuoteTotal(formData, pricing);
  const g = pricing.beauty;
  const { guests } = quote;
  const guestRows = [
    guests.makeup > 0
      ? priceRow(`Guests makeup × ${guests.makeup} × ${g.makeup}€`, guests.makeup * g.makeup)
      : '',
    guests.hair > 0
      ? priceRow(`Guests hair × ${guests.hair} × ${g.hair}€`, guests.hair * g.hair)
      : '',
    guests.pack > 0
      ? priceRow(`Guests pack × ${guests.pack} × ${g.pack}€`, guests.pack * g.pack)
      : '',
  ].join('');

  return `
    ${sectionTitle(t.data)}
    ${fieldRow(t.name, formData.nome || '')}
    ${fieldRow(t.weddingDate, formData.data_casamento || '')}
    ${fieldRow(t.readyTime, formData.hora_pronta || '')}
    ${fieldRow(t.prepLocation, formData.local_preparacao || '')}
    ${fieldRow(t.trialLocation, formData.local_prova || '')}
    ${sectionTitle(t.services)}
    ${fieldRow(t.bride, showValue(formData.servicos_procurados, quote.brideLabel))}
    ${fieldRow('Guests makeup', showValue(formData.guests_makeup, guests.makeup > 0 ? String(guests.makeup) : '0'))}
    ${fieldRow('Guests hair', showValue(formData.guests_hair, guests.hair > 0 ? String(guests.hair) : '0'))}
    ${fieldRow('Guests pack', showValue(formData.guests_pack, guests.pack > 0 ? String(guests.pack) : '0'))}
    ${formData.addon_skin_call ? fieldRow('Add-on Skin Call', formData.addon_skin_call) : ''}
    ${sectionTitle(t.investment)}
    ${priceRow('Bridal - ' + quote.brideLabel, quote.bridePrice)}
    ${guestRows}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total)}
    ${notesHtml(notes, locale)}
  `;
}

export function beautyBlock(formData: Record<string, string>, pricing: Pricing, notes?: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  const g = pricing.beauty;
  const quote = beautyQuoteTotal(formData, pricing);
  const { guests } = quote;

  const serviceRows = quote.legacy
    ? `${fieldRow(t.service, showValue(formData.servicos_procurados_guests, quote.servicoLabel))}
    ${fieldRow(t.people, showValue(formData.numero_pessoas, quote.pessoas > 0 ? String(quote.pessoas) : ''))}`
    : `${fieldRow('Guests makeup', showValue(formData.guests_makeup, guests.makeup > 0 ? String(guests.makeup) : '0'))}
    ${fieldRow('Guests hair', showValue(formData.guests_hair, guests.hair > 0 ? String(guests.hair) : '0'))}
    ${fieldRow('Guests pack', showValue(formData.guests_pack, guests.pack > 0 ? String(guests.pack) : '0'))}`;

  const priceRows = quote.legacy
    ? `${priceRow('Beauty - ' + quote.servicoLabel, quote.base)}
    ${quote.extras > 0 ? priceRow(`${t.extras} × ` + (quote.pessoas - 1) + ' × ' + g.hair + '€', quote.extras) : ''}`
    : [
        guests.makeup > 0 ? priceRow(`Guests makeup × ${guests.makeup} × ${g.makeup}€`, guests.makeup * g.makeup) : '',
        guests.hair > 0 ? priceRow(`Guests hair × ${guests.hair} × ${g.hair}€`, guests.hair * g.hair) : '',
        guests.pack > 0 ? priceRow(`Guests pack × ${guests.pack} × ${g.pack}€`, guests.pack * g.pack) : '',
      ].join('');

  return `
    ${sectionTitle(t.data)}
    ${fieldRow(t.eventDate, formData.data_evento || '')}
    ${fieldRow(t.readyTime, formData.hora_pronta_evento || '')}
    ${fieldRow(t.eventLocation, formData.local_evento || '')}
    ${sectionTitle(t.services)}
    ${serviceRows}
    ${sectionTitle(t.investment)}
    ${priceRows}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total)}
    ${notesHtml(notes, locale)}
  `;
}

export function skinCallBlock(formData: Record<string, string>, pricing: Pricing, notes?: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  const p = pricing.skin_call;
  const plano = formData.plano || '';
  let total = 0;
  let planoLabel = plano;
  if (plano.includes('Solo')) {
    total = p.session1;
    planoLabel = t.solo;
  } else if (plano.includes('Duo')) {
    total = p.session2;
    planoLabel = t.duo;
  } else if (plano.includes('Trio')) {
    total = p.session3;
    planoLabel = t.trio;
  } else if (plano.includes('Quatro')) {
    total = p.session4;
    planoLabel = t.quatro;
  }

  const travel = parseTravelFee(formData);
  const showPrices = !isPlaceholder(formData.plano);
  return `
    ${sectionTitle(t.plan)}
    ${fieldRow(t.chosenPlan, showValue(formData.plano, planoLabel))}
    ${showPrices ? `${sectionTitle(t.investment)}${priceRow(planoLabel, total)}${travelRow(formData, locale)}${travel > 0 ? totalRow(t.total, total + travel) : ''}` : ''}
    ${notesHtml(notes, locale)}
  `;
}

export function educationBlock(formData: Record<string, string>, pricing: Pricing, notes?: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  const travel = parseTravelFee(formData);
  const workshop = pricing.education.workshop;
  return `
    ${sectionTitle(t.data)}
    ${fieldRow(t.format, formData.formato || '')}
    ${fieldRow(t.location, formData.local_workshop || '')}
    ${fieldRow(t.datetime, formData.data_hora || '')}
    ${fieldRow(t.type, formData.tipo || '')}
    ${fieldRow(t.modality, formData.modalidade || '')}
    ${fieldRow(t.participants, formData.numero_participantes || '')}
    ${fieldRow(t.regime, formData.regime || '')}
    ${fieldRow(t.message, formData.mensagem || '')}
    ${sectionTitle(t.investment)}
    ${priceRow(t.workshop, workshop)}
    ${travelRow(formData, locale)}
    ${travel > 0 ? totalRow(t.total, workshop + travel) : ''}
    ${notesHtml(notes, locale)}
  `;
}

export function termsBlock(opts: { iban: string; accountName: string; mbway: string; notes?: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">${t.payment}</h3>
    <p style="margin:4px 0"><strong>${t.accountHolder}:</strong> ${opts.accountName}</p>
    <p style="margin:4px 0"><strong>IBAN:</strong> ${opts.iban}</p>
    <p style="margin:4px 0"><strong>MB Way:</strong> ${opts.mbway}</p>
    ${opts.notes ? `<p>${opts.notes}</p>` : ''}
  `;
}

export function scheduleFormBlock(opts: { meetUrl: string; formUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <p style="text-align:center;margin:28px 0;">
      <a href="${opts.meetUrl}" style="display:inline-block;background:#8a2831;color:#fbf5ef;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;">
        ${t.joinMeet}
      </a>
    </p>
    <p>${t.beforeCall}</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${opts.formUrl}" style="display:inline-block;background:transparent;color:#8a2831;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;border:1.5px solid #8a2831;">
        ${t.openForm}
      </a>
    </p>
  `;
}

export function diagnosticBlock(url: string, locale: Locale = DEFAULT_LOCALE): string {
  return `
    <p style="text-align:center; margin:32px 0;">
      <a href="${url}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
        ${L(locale).openDiag}
      </a>
    </p>
  `;
}

export type EmailDemoId = 'bridal' | 'beauty' | 'skin_call' | 'education';

export const DEMO_FORM: Record<EmailDemoId, Record<string, string>> = {
  bridal: {
    nome: '{{nome}}',
    data_casamento: '{{data_casamento}}',
    hora_pronta: '{{hora_pronta}}',
    local_preparacao: '{{local_preparacao}}',
    local_prova: '{{local_prova}}',
    servicos_procurados: '{{servicos_procurados}}',
    guests_makeup: '{{guests_makeup}}',
    guests_hair: '{{guests_hair}}',
    guests_pack: '{{guests_pack}}',
    addon_skin_call: '{{addon_skin_call}}',
  },
  beauty: {
    nome: '{{nome}}',
    data_evento: '{{data_evento}}',
    hora_pronta_evento: '{{hora_pronta_evento}}',
    local_evento: '{{local_evento}}',
    guests_makeup: '{{guests_makeup}}',
    guests_hair: '{{guests_hair}}',
    guests_pack: '{{guests_pack}}',
  },
  skin_call: {
    nome: '{{nome}}',
    plano: '{{plano}}',
  },
  education: {
    nome: '{{nome}}',
    formato: '{{formato}}',
    local_workshop: '{{local_workshop}}',
    data_hora: '{{data_hora}}',
    tipo: '{{tipo}}',
    modalidade: '{{modalidade}}',
    numero_participantes: '{{numero_participantes}}',
    regime: '{{regime}}',
    mensagem: '{{mensagem}}',
  },
};
