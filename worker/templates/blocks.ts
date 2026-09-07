// Blocos gerados (preços, pagamento, botões) injectados em {{bloco}} ou tokens de botão.

import type { Pricing } from '../pricing';
import { beautyQuoteTotal, bridalQuoteTotal, parseTravelFee, skinCallPlanPrice } from '../bridal-pricing';
import { fieldRow, sectionTitle, priceRow } from './base';
import { DEFAULT_LOCALE, type Locale } from '../locale';

const BLOCK = {
  pt: {
    data: 'Dados',
    services: 'Serviços',
    investment: 'Valor',
    total: 'Valor total',
    travel: 'Deslocação',
    pending: 'a calcular',
    addon: 'Add-on Skin Call',
    guestsMakeup: 'Guests makeup',
    guestsHair: 'Guests hair',
    guestsPack: 'Guests pack',
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
    joinMeet: 'Entrar na Chamada',
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
    pending: 'to be calculated',
    addon: 'Add-on Skin Call',
    guestsMakeup: 'Guests makeup',
    guestsHair: 'Guests hair',
    guestsPack: 'Guests pack',
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
    joinMeet: 'Join the Call',
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

function priceRowOpen(label: string, amount: number | string): string {
  const value = typeof amount === 'number' ? `${amount}€` : amount;
  return `<p style="margin:4px 0;display:flex;justify-content:space-between"><span>${label}</span><strong>${value}</strong></p>`;
}

function travelRow(formData: Record<string, string>, locale: Locale): string {
  const travel = parseTravelFee(formData);
  const t = L(locale);
  return travel > 0 ? priceRow(t.travel, travel) : priceRowOpen(t.travel, t.pending);
}

function totalRow(label: string, amount: number): string {
  return `
    <p style="margin:12px 0 0;font-size:16px;padding-top:8px;display:flex;justify-content:space-between">
      <strong>${label}</strong>
      <strong>${amount}€</strong>
    </p>`;
}

function guestPriceRows(
  guests: { makeup: number; hair: number; pack: number },
  pricing: Pricing,
  locale: Locale,
  preview: boolean,
): string {
  const t = L(locale);
  const g = pricing.beauty;
  const lines = [
    { qty: guests.makeup, unit: g.makeup, label: t.guestsMakeup },
    { qty: guests.hair, unit: g.hair, label: t.guestsHair },
    { qty: guests.pack, unit: g.pack, label: t.guestsPack },
  ];
  return lines.map((line) => {
    if (!preview && line.qty <= 0) return '';
    return priceRow(`${line.label} × ${line.qty} × ${line.unit}€`, line.qty * line.unit);
  }).join('');
}

export function bridalBlock(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  locale: Locale = DEFAULT_LOCALE,
  preview = false,
): string {
  const t = L(locale);
  const quote = bridalQuoteTotal(formData, pricing);
  const addonRow = quote.addonPrice > 0
    ? priceRow(`${t.addon} - ${quote.addonLabel}`, quote.addonPrice)
    : preview
      ? priceRowOpen(t.addon, '—')
      : '';

  return `
    ${sectionTitle(t.investment)}
    ${priceRow('Bridal - ' + quote.brideLabel, quote.bridePrice)}
    ${guestPriceRows(quote.guests, pricing, locale, preview)}
    ${addonRow}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total)}
    ${notesHtml(notes, locale)}
  `;
}

export function beautyBlock(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  locale: Locale = DEFAULT_LOCALE,
  preview = false,
): string {
  const t = L(locale);
  const g = pricing.beauty;
  const quote = beautyQuoteTotal(formData, pricing);
  const priceRows = quote.legacy
    ? `${priceRow('Beauty - ' + quote.servicoLabel, quote.base)}
    ${quote.extras > 0 || preview ? priceRow(`${t.extras} × ` + Math.max(0, quote.pessoas - 1) + ' × ' + g.hair + '€', quote.extras) : ''}`
    : guestPriceRows(quote.guests, pricing, locale, preview);

  return `
    ${sectionTitle(t.investment)}
    ${priceRows}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total)}
    ${notesHtml(notes, locale)}
  `;
}

export function skinCallBlock(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  locale: Locale = DEFAULT_LOCALE,
  preview = false,
): string {
  const t = L(locale);
  const plan = skinCallPlanPrice(formData.plano, pricing);
  const travel = parseTravelFee(formData);
  const planRow = plan
    ? priceRow(plan.label, plan.price)
    : preview
      ? priceRowOpen(t.plan, '—')
      : '';
  const total = (plan?.price ?? 0) + travel;

  return `
    ${sectionTitle(t.investment)}
    ${planRow}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, total)}
    ${notesHtml(notes, locale)}
  `;
}

export function educationBlock(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = L(locale);
  const travel = parseTravelFee(formData);
  const workshop = pricing.education.workshop;
  return `
    ${sectionTitle(t.investment)}
    ${priceRow(t.workshop, workshop)}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, workshop + travel)}
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

export function meetCallButton(opts: { meetUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <p style="text-align:center;margin:28px 0;" contenteditable="false">
      <a href="${opts.meetUrl}" contenteditable="false" style="display:inline-block;background:#8a2831;color:#fbf5ef;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;">
        ${t.joinMeet}
      </a>
    </p>
  `;
}

export function formCallButton(opts: { formUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <p style="text-align:center;margin:28px 0;" contenteditable="false">
      <a href="${opts.formUrl}" contenteditable="false" style="display:inline-block;background:transparent;color:#8a2831;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;border:1.5px solid #8a2831;">
        ${t.openForm}
      </a>
    </p>
  `;
}

export function scheduleFormBlock(opts: { meetUrl: string; formUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  return `${meetCallButton({ meetUrl: opts.meetUrl }, locale)}${formCallButton({ formUrl: opts.formUrl }, locale)}`;
}

export function diagnosticBlock(url: string, locale: Locale = DEFAULT_LOCALE): string {
  return `
    <p style="text-align:center; margin:32px 0;" contenteditable="false">
      <a href="${url}" contenteditable="false" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
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
    valor_deslocacao: '{{valor_deslocacao}}',
  },
  beauty: {
    nome: '{{nome}}',
    data_evento: '{{data_evento}}',
    hora_pronta_evento: '{{hora_pronta_evento}}',
    local_evento: '{{local_evento}}',
    guests_makeup: '{{guests_makeup}}',
    guests_hair: '{{guests_hair}}',
    guests_pack: '{{guests_pack}}',
    valor_deslocacao: '{{valor_deslocacao}}',
  },
  skin_call: {
    nome: '{{nome}}',
    plano: '{{plano}}',
    valor_deslocacao: '{{valor_deslocacao}}',
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
    valor_deslocacao: '{{valor_deslocacao}}',
  },
};
