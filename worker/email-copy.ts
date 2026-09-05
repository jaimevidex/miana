// Copy editável dos emails para clientes (settings DB + fallbacks no código).

import { htmlEscape, type Env, type LeadType } from './lib';
import { CONTACT_FALLBACKS, loadSettingsMap } from './pricing';
import { siteUrl } from './config';
import { sanitizeEmailHtml } from './email-sanitize';
import { DEFAULT_LOCALE, parseLocale, type Locale } from './locale';

export type EmailTemplateId =
  | 'bridal_intro'
  | 'bridal'
  | 'beauty'
  | 'skin_call'
  | 'education'
  | 'terms'
  | 'schedule'
  | 'schedule_form'
  | 'diagnostic_invite';

export const EMAIL_TEMPLATE_IDS: EmailTemplateId[] = [
  'bridal_intro',
  'bridal',
  'beauty',
  'skin_call',
  'education',
  'terms',
  'schedule',
  'schedule_form',
  'diagnostic_invite',
];

export type EmailFlowId = 'shared' | 'skin-call' | 'bridal' | 'beauty' | 'education';
export type EmailAudience = 'client' | 'footer' | 'system';
export type EmailFlowEntryId = EmailTemplateId | 'signature' | 'lead_notification' | 'diagnostic_complete';

export interface EmailFlowEntry {
  id: EmailFlowEntryId;
  flow: EmailFlowId;
  step: string;
  audience: EmailAudience;
  label: string;
}

/** Hierarquia canónica: settings e docs devem seguir estes flows. */
export const EMAIL_FLOW_REGISTRY: EmailFlowEntry[] = [
  { id: 'lead_notification', flow: 'shared', step: 'submit', audience: 'system', label: 'Novo Pedido' },
  { id: 'terms', flow: 'shared', step: 'terms', audience: 'client', label: 'Termos' },
  { id: 'signature', flow: 'shared', step: 'footer', audience: 'footer', label: 'Assinatura' },
  { id: 'bridal_intro', flow: 'bridal', step: 'intro', audience: 'client', label: 'Introdutório' },
  { id: 'bridal', flow: 'bridal', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'beauty', flow: 'beauty', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'skin_call', flow: 'skin-call', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'schedule', flow: 'skin-call', step: 'schedule', audience: 'client', label: 'Marcar sessões' },
  { id: 'schedule_form', flow: 'skin-call', step: 'schedule_form', audience: 'client', label: 'Confirmação' },
  { id: 'diagnostic_invite', flow: 'skin-call', step: 'diagnostic_invite', audience: 'client', label: 'Diagnóstico' },
  { id: 'diagnostic_complete', flow: 'skin-call', step: 'diagnostic_complete', audience: 'system', label: 'Diagnóstico preenchido' },
  { id: 'education', flow: 'education', step: 'quote', audience: 'client', label: 'Orçamento' },
];

export const SYSTEM_EMAIL_IDS = ['lead_notification', 'diagnostic_complete'] as const;

export const EMAIL_FLOW_GROUPS: { id: EmailFlowId; label: string; hint: string }[] = [
  { id: 'shared', label: 'Partilhados', hint: 'Termos e assinatura comuns a todos os pedidos.' },
  { id: 'bridal', label: 'Bridal', hint: 'Introdutório primeiro; orçamento depois da resposta da noiva.' },
  { id: 'beauty', label: 'Beauty', hint: 'Orçamento para Guests & Events.' },
  { id: 'skin-call', label: 'Skin Call', hint: 'Orçamento, e depois de aceitar: marcar sessões, confirmação Meet e diagnóstico.' },
  { id: 'education', label: 'Education', hint: 'Orçamento para workshops.' },
];

export function settingsEmailEntries(): EmailFlowEntry[] {
  return EMAIL_FLOW_REGISTRY.filter((e) => e.audience !== 'system');
}

export function settingsPanelId(id: EmailFlowEntryId): string {
  return id === 'signature' ? 'footer' : id;
}

export interface EmailTemplateCopy {
  subject: string;
  body: string;
}

export const EMAIL_BLOCO = '{{bloco}}';
const BLOCO_START = '<!--miana-block-start-->';
const BLOCO_END = '<!--miana-block-end-->';

function styledHeading(title: string): string {
  if (!title.trim()) return '';
  return `<h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">${title}</h2>`;
}

export interface EmailWrapFooter {
  email: string;
  instagram: string;
  website: string;
  assetBase: string;
}

export interface EmailCopy {
  wrapFooter: EmailWrapFooter;
  bridal_intro: EmailTemplateCopy;
  bridal: EmailTemplateCopy;
  beauty: EmailTemplateCopy;
  skin_call: EmailTemplateCopy;
  education: EmailTemplateCopy;
  terms: EmailTemplateCopy;
  schedule: EmailTemplateCopy;
  schedule_form: EmailTemplateCopy;
  diagnostic_invite: EmailTemplateCopy;
}

export const SIG_INSTAGRAM_FALLBACK = 'https://instagram.com/bymarianapita';
export const SIG_WEBSITE_FALLBACK = 'https://marianapita.pt';

export const EMAIL_COPY_FALLBACKS: EmailCopy = {
  wrapFooter: {
    email: CONTACT_FALLBACKS.email,
    instagram: SIG_INSTAGRAM_FALLBACK,
    website: SIG_WEBSITE_FALLBACK,
    assetBase: SIG_WEBSITE_FALLBACK,
  },
  bridal_intro: {
    subject: 'Serviço de noiva - Mariana Pita',
    body:
      '<p>Alô Noiva {{nome}}!!!</p>' +
      '<p>Antes de mais, os nossos parabéns pelo noivado! Estamos muito felizes por fazer parte deste momento tão especial.</p>' +
      '<p>Confirmo que eu tenho disponibilidade de agenda para o serviço de makeup no dia {{data_casamento}}, em {{local_preparacao}}, para que esteja pronta às {{hora_pronta}}.</p>' +
      '<p>Envio, em anexo, o pdf com todos os detalhes do nosso serviço de noiva. Caso pretenda também o serviço de hairstyling peço que me indique, para que consiga confirmar disponibilidade com a equipa ASAP.</p>' +
      '<p>Como sabemos que o dia é mais feliz se for partilhado com as madrinhas e família, também elas podem preparar-se connosco. Por isso, para já, também é importante termos uma estimativa de quantas convidadas o vão querer fazer e que serviço/s pretendem! Este número é apenas uma estimativa, para termos noção do número de profissionais necessário e só terá de ser confirmado mais perto da data.</p>' +
      '<p>Por todos estes motivos, só conseguimos calcular o valor da deslocação assim que soubermos os serviços contratados e o número de profissionais que necessitam de ser alocados.</p>' +
      '<p>Estou aqui para esclarecer qualquer dúvida que surja :)</p>' +
      '<p>Com amor,</p>',
  },
  bridal: {
    subject: 'Orçamento Bridal by Mariana Pita',
    body: `${styledHeading('Orçamento - Bridal')}<p>Olá {{nome}},</p>${EMAIL_BLOCO}`,
  },
  beauty: {
    subject: 'Orçamento - Beauty',
    body: `${styledHeading('Orçamento - Beauty')}<p>Olá {{nome}},</p>${EMAIL_BLOCO}`,
  },
  skin_call: {
    subject: 'Orçamento - Skin Call',
    body: `${styledHeading('Orçamento - Skin Call')}<p>Olá {{nome}},</p>${EMAIL_BLOCO}`,
  },
  education: {
    subject: 'Orçamento - Education',
    body: `${styledHeading('Orçamento - Education')}<p>Olá {{nome}},</p>${EMAIL_BLOCO}`,
  },
  terms: {
    subject: 'Termos e condições e dados de pagamento',
    body:
      `${styledHeading('Termos e condições')}` +
      '<p>Olá {{nome}},</p><p>Para avançarmos, envio os <strong>termos e condições</strong> em anexo e os dados de pagamento.</p><p>Quando o pagamento estiver feito, responde a este email com o <strong>comprovativo</strong> e a frase:</p><p><em>«Declaro que li e aceito os termos e condições.»</em></p>' +
      EMAIL_BLOCO +
      '<p>Este texto é provisório e será substituído pela copy final.</p>',
  },
  schedule: {
    subject: 'Marcar sessões - Skin Call',
    body:
      `${styledHeading('Marcar sessões')}` +
      '<p>Olá {{nome}},</p><p>Para marcarmos a sessão, envia-me por favor algumas <strong>sugestões de datas e horas</strong>.</p><p>Prefiro durante a <strong>semana</strong> (segunda a sexta). Pode ser a qualquer hora.</p><p>Assim que alinharmos, envio o convite com o link da videochamada e o formulário.</p>' +
      '<p>Este texto é provisório e será substituído pela copy final.</p>',
  },
  schedule_form: {
    subject: 'Marcação confirmada - Skin Call',
    body:
      `${styledHeading('Marcação confirmada')}` +
      '<p>Olá {{nome}},</p><p>A sessão ficou marcada para <strong>{{quando}}</strong>.</p>' +
      EMAIL_BLOCO +
      '<p>Este texto é provisório e será substituído pela copy final.</p>',
  },
  diagnostic_invite: {
    subject: 'Estás quase lá! Diagnóstico de pele Skin Call',
    body:
      '<p>Olá {{nome}},</p><p>Estamos quase lá! Para eu perceber o plano mais indicado para ti, preciso que preenchas este breve diagnóstico de pele.</p>' +
      EMAIL_BLOCO +
      '<p>Este link é pessoal e de uso único.</p>',
  },
};

export const EMAIL_COPY_SETTING_KEYS: string[] = [
  ...EMAIL_TEMPLATE_IDS.flatMap((id) => [
    `email_${id}_subject`,
    `email_${id}_body`,
    `email_${id}_subject_en`,
    `email_${id}_body_en`,
  ]),
];

function pick(map: Record<string, string>, key: string, fallback: string): string {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
}

function legacyBody(map: Record<string, string>, id: EmailTemplateId, fallback: EmailTemplateCopy): string {
  if (Object.prototype.hasOwnProperty.call(map, `email_${id}_body`)) {
    return map[`email_${id}_body`];
  }
  const title = pick(map, `email_${id}_title`, '');
  const intro = pick(map, `email_${id}_intro`, '');
  const closing = pick(map, `email_${id}_closing`, '');
  if (!title && !intro && !closing) return fallback.body;
  const heading = title ? styledHeading(title) : '';
  const introHtml = intro ? (looksLikeHtml(intro) ? intro : textToHtml(intro)) : '';
  const closingHtml = closing ? (looksLikeHtml(closing) ? closing : textToHtml(closing)) : '';
  return `${heading}${introHtml}${EMAIL_BLOCO}${closingHtml}`;
}

function localeKeySuffix(locale: Locale): string {
  return locale === 'en' ? '_en' : '';
}

export function templateFromMap(
  map: Record<string, string>,
  id: EmailTemplateId,
  fallback: EmailTemplateCopy,
  locale: Locale = DEFAULT_LOCALE,
): EmailTemplateCopy {
  const suffix = localeKeySuffix(locale);
  return {
    subject: pick(map, `email_${id}_subject${suffix}`, fallback.subject),
    body: locale === 'en'
      ? pick(map, `email_${id}_body_en`, fallback.body)
      : legacyBody(map, id, fallback),
  };
}

/** Junta campos do formulário + extras para {{nome}}, {{data_casamento}}, etc. */
export function templateVars(
  formData: Record<string, string> = {},
  extra: Record<string, string> = {},
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value != null) vars[key] = String(value);
  }
  return { ...vars, ...extra };
}

export function fillTemplateBody(body: string, block: string, vars: Record<string, string> = {}): string {
  let html = (body || '').trim();
  if (!html) html = block;
  else if (html.includes(EMAIL_BLOCO)) html = html.split(EMAIL_BLOCO).join(block);
  else if (block) html += block;
  return interpolateHtml(html, vars);
}

function wrapPreviewBlock(block: string): string {
  if (!block) return '';
  return `${BLOCO_START}<div data-miana-block="1" contenteditable="false">${block}</div>${BLOCO_END}`;
}

export function previewTemplateBody(body: string, block: string): string {
  const wrapped = wrapPreviewBlock(block);
  let html = (body || '').trim();
  if (!html) return wrapped;
  if (html.includes(EMAIL_BLOCO)) return html.split(EMAIL_BLOCO).join(wrapped);
  return wrapped ? html + wrapped : html;
}

export function bodyFromEditor(html: string): string {
  return html
    .replace(new RegExp(`${BLOCO_START}[\\s\\S]*?${BLOCO_END}`, 'g'), EMAIL_BLOCO)
    .replace(/<div[^>]*data-miana-block="1"[^>]*>[\s\S]*?<\/div>/gi, EMAIL_BLOCO);
}

export async function getEmailCopy(env: Env, locale: Locale = DEFAULT_LOCALE): Promise<EmailCopy> {
  const resolved = parseLocale(locale);
  const map = await loadSettingsMap(env);
  const { EMAIL_COPY_FALLBACKS_EN } = await import('./email-copy-en');
  const F = resolved === 'en' ? EMAIL_COPY_FALLBACKS_EN : EMAIL_COPY_FALLBACKS;
  return {
    wrapFooter: {
      email: map.contact_email || CONTACT_FALLBACKS.email,
      instagram: SIG_INSTAGRAM_FALLBACK,
      website: SIG_WEBSITE_FALLBACK,
      assetBase: siteUrl(env).replace(/\/$/, ''),
    },
    bridal_intro: templateFromMap(map, 'bridal_intro', F.bridal_intro, resolved),
    bridal: templateFromMap(map, 'bridal', F.bridal, resolved),
    beauty: templateFromMap(map, 'beauty', F.beauty, resolved),
    skin_call: templateFromMap(map, 'skin_call', F.skin_call, resolved),
    education: templateFromMap(map, 'education', F.education, resolved),
    terms: templateFromMap(map, 'terms', F.terms, resolved),
    schedule: templateFromMap(map, 'schedule', F.schedule, resolved),
    schedule_form: templateFromMap(map, 'schedule_form', F.schedule_form, resolved),
    diagnostic_invite: templateFromMap(map, 'diagnostic_invite', F.diagnostic_invite, resolved),
  };
}

export function quoteCopyForType(copy: EmailCopy, type: LeadType): EmailTemplateCopy {
  switch (type) {
    case 'bridal':
      return copy.bridal;
    case 'beauty':
      return copy.beauty;
    case 'skin-call':
      return copy.skin_call;
    case 'education':
      return copy.education;
  }
}

export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

export function isBlankHtml(html: string): boolean {
  return html.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim() === '';
}

function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Interpola placeholders em HTML já formatado (valores escapados). */
export function interpolateHtml(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? htmlEscape(vars[key]) : match,
  );
}

/** Copy das settings: HTML (RTE) ou texto simples. Interpola {{campo}}. */
export function textToHtml(text: string, vars: Record<string, string> = {}): string {
  const trimmed = text.trim();
  if (!trimmed || isBlankHtml(trimmed)) return '';
  if (looksLikeHtml(trimmed)) {
    return sanitizeEmailHtml(interpolateHtml(trimmed, vars));
  }
  const escaped = htmlEscape(interpolate(trimmed, vars));
  return escaped
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/** HTML seguro para o editor nas Settings. */
export function toEditorHtml(text: string): string {
  if (!text.trim() || isBlankHtml(text)) return '';
  if (looksLikeHtml(text)) return sanitizeEmailHtml(text);
  return textToHtml(text);
}
