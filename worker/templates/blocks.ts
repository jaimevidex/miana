// Blocos gerados (preços, pagamento, botões) injectados em {{bloco}} ou tokens de botão.

import type { Pricing } from '../pricing';
import { beautyQuoteTotal, bridalQuoteTotal, educationQuoteTotal, formatEuro, parseTravelFee, reservationDeposit, skinCallPlanPrice } from '../bridal-pricing';
import { EMAIL_STYLE } from '../email-style';
import { priceRow, priceRowOpen, priceTable, sectionTitle, totalRow } from './base';
import { DEFAULT_LOCALE, type Locale } from '../locale';

const BLOCK = {
  pt: {
    data: 'Dados',
    services: 'Serviços',
    investment: 'Orçamento',
    amount: 'Valor',
    total: 'Valor total',
    deposit: 'Valor sinal',
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
    trialDate: 'Data da prova',
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
    investment: 'Quote',
    amount: 'Amount',
    total: 'Total amount',
    deposit: 'Deposit amount',
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
    trialDate: 'Trial date',
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
  return `${sectionTitle(L(locale).notes)}<p style="${EMAIL_STYLE.p}">${notes}</p>`;
}

function travelRow(formData: Record<string, string>, locale: Locale): string {
  const travel = parseTravelFee(formData);
  const t = L(locale);
  return travel > 0 ? priceRow(t.travel, travel, locale) : priceRowOpen(t.travel, t.pending);
}

function sinalRow(type: 'bridal' | 'beauty' | 'education', formData: Record<string, string>, pricing: Pricing, locale: Locale): string {
  const amount = reservationDeposit(type, formData, pricing);
  if (amount == null) return '';
  return totalRow(L(locale).deposit, amount, locale);
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
    return priceRow(`${line.label} × ${line.qty} × ${formatEuro(line.unit, locale)}`, line.qty * line.unit, locale);
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
    ? priceRow(`${t.addon} - ${quote.addonLabel}`, quote.addonPrice, locale)
    : preview
      ? priceRowOpen(t.addon, '—')
      : '';

  return `
    ${sectionTitle(t.investment, 'title')}
    ${priceTable(`
    ${priceRow('Bridal - ' + quote.brideLabel, quote.bridePrice, locale)}
    ${addonRow}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total, locale)}
    ${sinalRow('bridal', formData, pricing, locale)}
    `)}
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
    ? `${priceRow('Beauty - ' + quote.servicoLabel, quote.base, locale)}
    ${quote.extras > 0 || preview ? priceRow(`${t.extras} × ` + Math.max(0, quote.pessoas - 1) + ' × ' + formatEuro(g.hair, locale), quote.extras, locale) : ''}`
    : guestPriceRows(quote.guests, pricing, locale, preview);

  return `
    ${sectionTitle(t.investment, 'title')}
    ${priceTable(`
    ${priceRows}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total, locale)}
    ${sinalRow('beauty', formData, pricing, locale)}
    `)}
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
  const rows = plan
    ? `${priceRowOpen(`<strong>${t.plan}</strong>`, `<strong>${plan.label}</strong>`)}
    ${priceRowOpen(`<strong>${t.amount}</strong>`, `<strong>${formatEuro(plan.price, locale)}</strong>`)}`
    : preview
      ? `${priceRowOpen(`<strong>${t.plan}</strong>`, '<strong>-</strong>')}
    ${priceRowOpen(`<strong>${t.amount}</strong>`, '<strong>-</strong>')}`
      : '';

  return `
    ${priceTable(rows)}
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
  const quote = educationQuoteTotal(formData, pricing);
  return `
    ${sectionTitle(t.investment, 'title')}
    ${priceTable(`
    ${priceRow(t.workshop, quote.workshop, locale)}
    ${travelRow(formData, locale)}
    ${totalRow(t.total, quote.total, locale)}
    ${sinalRow('education', formData, pricing, locale)}
    `)}
    ${notesHtml(notes, locale)}
  `;
}

export function termsBlock(opts: { iban: string; accountName: string; mbway: string; notes?: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    ${sectionTitle(t.payment)}
    <p style="${EMAIL_STYLE.p}"><strong>${t.accountHolder}:</strong> ${opts.accountName}</p>
    <p style="${EMAIL_STYLE.p}"><strong>IBAN:</strong> ${opts.iban}</p>
    <p style="${EMAIL_STYLE.p}"><strong>MB Way:</strong> ${opts.mbway}</p>
    ${opts.notes ? `<p style="${EMAIL_STYLE.p}">${opts.notes}</p>` : ''}
  `;
}

export function meetCallButton(opts: { meetUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <p style="text-align:center;margin:28px 0;" contenteditable="false">
      <a href="${opts.meetUrl}" contenteditable="false" style="${EMAIL_STYLE.button}">
        ${t.joinMeet}
      </a>
    </p>
  `;
}

export function formCallButton(opts: { formUrl: string }, locale: Locale = DEFAULT_LOCALE): string {
  const t = L(locale);
  return `
    <p style="text-align:center;margin:28px 0;" contenteditable="false">
      <a href="${opts.formUrl}" contenteditable="false" style="${EMAIL_STYLE.buttonOutline}">
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
    <p style="text-align:center;margin:32px 0;" contenteditable="false">
      <a href="${url}" contenteditable="false" style="${EMAIL_STYLE.button}">
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
    data_prova: '{{data_prova}}',
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
