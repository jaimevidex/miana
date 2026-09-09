// Copy editável dos emails para clientes (settings DB + fallbacks no código).

import { FIELD_LABELS, htmlEscape, type Env, type LeadType } from './lib';
import { CONTACT_FALLBACKS, loadSettingsMap } from './pricing';
import { siteUrl } from './config';
import { EMAIL_STYLE } from './email-style';
import { normalizeEmailBodyHtml, sanitizeEmailHtml } from './email-sanitize';
import { DEFAULT_LOCALE, parseLocale, type Locale } from './locale';

export type EmailTemplateId =
  | 'bridal_intro'
  | 'bridal'
  | 'bridal_terms'
  | 'beauty'
  | 'beauty_terms'
  | 'skin_call'
  | 'skin_call_terms'
  | 'education'
  | 'education_terms'
  | 'schedule'
  | 'schedule_form';

export const EMAIL_TEMPLATE_IDS: EmailTemplateId[] = [
  'bridal_intro',
  'bridal',
  'bridal_terms',
  'beauty',
  'beauty_terms',
  'skin_call',
  'schedule',
  'schedule_form',
  'skin_call_terms',
  'education',
  'education_terms',
];

const CONTACT_FIELDS = ['nome', 'email', 'telefone', 'locale'] as const;

const BRIDAL_FORM_FIELDS = [
  'opcao_servico',
  'data_casamento',
  'hora_pronta',
  'local_preparacao',
  'local_prova',
  'data_prova',
  'servicos_procurados',
  'guests_makeup',
  'guests_hair',
  'guests_pack',
  'addon_skin_call',
  'mensagem',
  'valor_deslocacao',
] as const;

const BEAUTY_FORM_FIELDS = [
  'opcao_servico',
  'data_evento',
  'hora_pronta_evento',
  'local_evento',
  'guests_makeup',
  'guests_hair',
  'guests_pack',
  'servicos_procurados_guests',
  'numero_pessoas',
  'mensagem',
  'valor_deslocacao',
] as const;

const SKIN_CALL_FORM_FIELDS = [
  'plano',
  'rotina',
  'rotina_frequencia',
  'pele_tipo',
  'preocupacoes',
  'preocupacoes_outro',
] as const;

const EDUCATION_FORM_FIELDS = [
  'formato',
  'local_workshop',
  'data_hora',
  'tipo',
  'modalidade',
  'numero_participantes',
  'regime',
  'mensagem',
  'valor_deslocacao',
] as const;

const PAYMENT_FIELDS = ['titular', 'iban', 'mbway'] as const;

const COMPUTED_SINAL = ['sinal_reserva'] as const;

const BRIDAL_FIELDS = [...CONTACT_FIELDS, ...BRIDAL_FORM_FIELDS, ...COMPUTED_SINAL];
const BEAUTY_FIELDS = [...CONTACT_FIELDS, ...BEAUTY_FORM_FIELDS, ...COMPUTED_SINAL];
const SKIN_CALL_FIELDS = [...CONTACT_FIELDS, ...SKIN_CALL_FORM_FIELDS];
const EDUCATION_FIELDS = [...CONTACT_FIELDS, ...EDUCATION_FORM_FIELDS, ...COMPUTED_SINAL];

/** Campos da lead/cliente inseríveis no texto. A tabela gerada não é um campo. */
export const EMAIL_TEMPLATE_FIELDS: Record<EmailTemplateId, readonly string[]> = {
  bridal_intro: BRIDAL_FIELDS,
  bridal: BRIDAL_FIELDS,
  beauty: BEAUTY_FIELDS,
  skin_call: SKIN_CALL_FIELDS,
  education: EDUCATION_FIELDS,
  bridal_terms: [...BRIDAL_FIELDS, ...PAYMENT_FIELDS],
  beauty_terms: [...BEAUTY_FIELDS, ...PAYMENT_FIELDS],
  skin_call_terms: [...SKIN_CALL_FIELDS, ...PAYMENT_FIELDS],
  education_terms: [...EDUCATION_FIELDS, ...PAYMENT_FIELDS],
  schedule: SKIN_CALL_FIELDS,
  schedule_form: [...SKIN_CALL_FIELDS, 'quando'],
};

export const EMAIL_FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  locale: 'Idioma',
  titular: 'Titular',
  iban: 'IBAN',
  mbway: 'MB Way',
  quando: 'Data e hora da sessão',
  sinal_reserva: 'Valor sinal',
};

export function emailFieldLabel(token: string): string {
  return EMAIL_FIELD_LABELS[token] || FIELD_LABELS[token] || token;
}

export function attachPersonFields(
  formData: Record<string, string> = {},
  person: { nome?: string; email?: string; telefone?: string; locale?: string } = {},
): Record<string, string> {
  return {
    ...formData,
    nome: formData.nome || person.nome || '',
    email: formData.email || person.email || '',
    telefone: formData.telefone || person.telefone || '',
    locale: formData.locale || person.locale || '',
  };
}

const TERMS_TEMPLATE_IDS = ['bridal_terms', 'beauty_terms', 'skin_call_terms', 'education_terms'] as const;

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
  { id: 'signature', flow: 'shared', step: 'footer', audience: 'footer', label: 'Assinatura' },
  { id: 'bridal_intro', flow: 'bridal', step: 'intro', audience: 'client', label: 'Introdutório' },
  { id: 'bridal', flow: 'bridal', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'bridal_terms', flow: 'bridal', step: 'terms', audience: 'client', label: 'Termos' },
  { id: 'beauty', flow: 'beauty', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'beauty_terms', flow: 'beauty', step: 'terms', audience: 'client', label: 'Termos' },
  { id: 'skin_call', flow: 'skin-call', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'schedule', flow: 'skin-call', step: 'schedule', audience: 'client', label: 'Marcar sessões' },
  { id: 'schedule_form', flow: 'skin-call', step: 'schedule_form', audience: 'client', label: 'Confirmação' },
  { id: 'skin_call_terms', flow: 'skin-call', step: 'terms', audience: 'client', label: 'Termos' },
  { id: 'diagnostic_complete', flow: 'skin-call', step: 'diagnostic_complete', audience: 'system', label: 'Avaliação de pele preenchida' },
  { id: 'education', flow: 'education', step: 'quote', audience: 'client', label: 'Orçamento' },
  { id: 'education_terms', flow: 'education', step: 'terms', audience: 'client', label: 'Termos' },
];

export const SYSTEM_EMAIL_IDS = ['lead_notification', 'diagnostic_complete'] as const;

export const EMAIL_FLOW_GROUPS: { id: EmailFlowId; label: string; hint: string }[] = [
  { id: 'bridal', label: 'Bridal', hint: 'Introdutório, orçamento e termos no fim.' },
  { id: 'beauty', label: 'Beauty', hint: 'Orçamento e termos no fim.' },
  { id: 'skin-call', label: 'Skin Call', hint: 'Orçamento, marcação e termos no fim.' },
  { id: 'education', label: 'Education', hint: 'Orçamento e termos no fim.' },
];

export function settingsEmailEntries(): EmailFlowEntry[] {
  return EMAIL_FLOW_REGISTRY.filter((e) => e.audience === 'client');
}

export function settingsPanelId(id: EmailFlowEntryId): string {
  return id === 'signature' ? 'footer' : id;
}

export const EMAIL_CUSTOM_REGISTRY_KEY = 'email_custom_registry';
export const MAX_CUSTOM_TEMPLATES = 20;
export const CUSTOM_TEMPLATE_ID_RE = /^c_[a-z0-9]{8}$/;

export type CustomEmailFlow = Exclude<EmailFlowId, 'shared'>;

export interface CustomTemplateEntry {
  id: string;
  flow: CustomEmailFlow;
  label: string;
}

const CUSTOM_FLOWS: readonly CustomEmailFlow[] = ['bridal', 'beauty', 'skin-call', 'education'];

export function isBuiltinTemplateId(value: string): value is EmailTemplateId {
  return (EMAIL_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function isCustomTemplateId(value: string): boolean {
  return CUSTOM_TEMPLATE_ID_RE.test(value);
}

export function isCustomEmailFlow(value: string): value is CustomEmailFlow {
  return (CUSTOM_FLOWS as readonly string[]).includes(value);
}

export function sanitizeCustomLabel(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function newCustomTemplateId(): string {
  return `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function parseCustomRegistry(raw: string | undefined): CustomTemplateEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CustomTemplateEntry[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { id?: unknown; flow?: unknown; label?: unknown };
      const id = String(row.id || '');
      const flow = String(row.flow || '');
      const label = sanitizeCustomLabel(String(row.label || ''));
      if (!isCustomTemplateId(id) || !isCustomEmailFlow(flow) || !label || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, flow, label });
      if (out.length >= MAX_CUSTOM_TEMPLATES) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeCustomRegistry(entries: CustomTemplateEntry[]): string {
  return JSON.stringify(entries.map(({ id, flow, label }) => ({ id, flow, label })));
}

export function fieldsForFlow(flow: CustomEmailFlow): readonly string[] {
  switch (flow) {
    case 'bridal':
      return BRIDAL_FIELDS;
    case 'beauty':
      return BEAUTY_FIELDS;
    case 'skin-call':
      return SKIN_CALL_FIELDS;
    case 'education':
      return EDUCATION_FIELDS;
  }
}

export function flowForLeadType(type: LeadType): CustomEmailFlow | null {
  return isCustomEmailFlow(type) ? type : null;
}

export function customTemplatesForFlow(
  registry: CustomTemplateEntry[],
  flow: CustomEmailFlow,
): CustomTemplateEntry[] {
  return registry.filter((entry) => entry.flow === flow);
}

export function customCopySettingKeys(id: string): string[] {
  return [
    `email_${id}_subject`,
    `email_${id}_body`,
    `email_${id}_subject_en`,
    `email_${id}_body_en`,
  ];
}

export function customAttachmentSettingKeys(id: string): string[] {
  return [`email_${id}_attachments`, `email_${id}_attachments_en`];
}

export function customTemplateFromMap(
  map: Record<string, string>,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): EmailTemplateCopy {
  const suffix = locale === 'en' ? '_en' : '';
  return {
    subject: map[`email_${id}_subject${suffix}`] || '',
    body: map[`email_${id}_body${suffix}`] || '',
  };
}

export async function loadCustomRegistry(env: Env): Promise<CustomTemplateEntry[]> {
  const map = await loadSettingsMap(env);
  return parseCustomRegistry(map[EMAIL_CUSTOM_REGISTRY_KEY]);
}

export interface EmailTemplateCopy {
  subject: string;
  body: string;
}

export const EMAIL_BLOCO = '{{bloco}}';
export const EMAIL_BOTAO_CHAMADA = '{{botao_chamada}}';
export const EMAIL_BOTAO_FORMULARIO = '{{botao_formulario}}';
const LIVE_PLACEHOLDERS = [EMAIL_BLOCO, EMAIL_BOTAO_CHAMADA, EMAIL_BOTAO_FORMULARIO] as const;

/** Mantém a primeira ocorrência de cada token gerado; remove duplicados. */
export function collapseDuplicatePlaceholders(html: string): string {
  let out = html;
  for (const needle of LIVE_PLACEHOLDERS) {
    const first = out.indexOf(needle);
    if (first < 0) continue;
    const after = first + needle.length;
    out = out.slice(0, after) + out.slice(after).split(needle).join('');
  }
  return out;
}
const BLOCO_START = '<!--miana-block-start-->';
const BLOCO_END = '<!--miana-block-end-->';

export const EMAIL_QUOTE_TEMPLATE_IDS: EmailTemplateId[] = ['bridal', 'beauty', 'skin_call', 'education'];

export function isQuoteTemplate(id: EmailTemplateId): boolean {
  return (EMAIL_QUOTE_TEMPLATE_IDS as readonly string[]).includes(id);
}

function styledHeading(title: string): string {
  if (!title.trim()) return '';
  return `<h3 style="${EMAIL_STYLE.h3}">${title}</h3>`;
}

const EMPTY_COPY: EmailTemplateCopy = { subject: '', body: '' };

function blockOnly(subject: string): EmailTemplateCopy {
  return { subject, body: EMAIL_BLOCO };
}

function p(text: string): string {
  return `<p style="${EMAIL_STYLE.p}">${text}</p>`;
}

export interface EmailWrapFooter {
  email: string;
  phone?: string;
  instagram: string;
  website: string;
  assetBase: string;
}

export interface EmailCopy {
  wrapFooter: EmailWrapFooter;
  bridal_intro: EmailTemplateCopy;
  bridal: EmailTemplateCopy;
  bridal_terms: EmailTemplateCopy;
  beauty: EmailTemplateCopy;
  beauty_terms: EmailTemplateCopy;
  skin_call: EmailTemplateCopy;
  skin_call_terms: EmailTemplateCopy;
  education: EmailTemplateCopy;
  education_terms: EmailTemplateCopy;
  schedule: EmailTemplateCopy;
  schedule_form: EmailTemplateCopy;
}

export const SIG_INSTAGRAM_FALLBACK = 'https://instagram.com/bymarianapita';
export const SIG_WEBSITE_FALLBACK = 'https://marianapita.pt';

export const EMAIL_COPY_FALLBACKS: EmailCopy = {
  wrapFooter: {
    email: CONTACT_FALLBACKS.email,
    phone: CONTACT_FALLBACKS.phone,
    instagram: SIG_INSTAGRAM_FALLBACK,
    website: SIG_WEBSITE_FALLBACK,
    assetBase: SIG_WEBSITE_FALLBACK,
  },
  bridal_intro: {
    subject: 'Serviço de noiva - Mariana Pita',
    body:
      p('Alô Noiva {{nome}}!!!') +
      p('Antes de mais, os nossos parabéns pelo noivado! Estamos muito felizes por fazer parte deste momento tão especial.') +
      p('Confirmo que eu tenho disponibilidade de agenda para o serviço de makeup no dia {{data_casamento}}, em {{local_preparacao}}, para que esteja pronta às {{hora_pronta}}.') +
      p('Envio, em anexo, o pdf com todos os detalhes do nosso serviço de noiva. Caso pretenda também o serviço de hairstyling peço que me indique, para que consiga confirmar disponibilidade com a equipa ASAP.') +
      p('Como sabemos que o dia é mais feliz se for partilhado com as madrinhas e família, também elas podem preparar-se connosco. Por isso, para já, também é importante termos uma estimativa de quantas convidadas o vão querer fazer e que serviço/s pretendem! Este número é apenas uma estimativa, para termos noção do número de profissionais necessário e só terá de ser confirmado mais perto da data.') +
      p('Por todos estes motivos, só conseguimos calcular o valor da deslocação assim que soubermos os serviços contratados e o número de profissionais que necessitam de ser alocados.') +
      p('Estou aqui para esclarecer qualquer dúvida que surja :)') +
      p('Com amor,'),
  },
  bridal: blockOnly('Orçamento - Bridal'),
  beauty: {
    subject: 'Orçamento - Beauty',
    body:
      p('Alô {{nome}},') +
      p('Confirmo que tenho disponibilidade para o teu glam! Aqui estão todas as informações e orçamento.') +
      p('Verifica todos os detalhes para garantir que estão corretos.') +
      EMAIL_BLOCO +
      p('Para terminarmos às (hora), temos de começar o glam às [hora].') +
      p('Para agendar, peço sempre o pagamento de 50% do valor total por mbway ou transferência bancária. Diz-me qual dos métodos preferes que envio todos os detalhes.') +
      p('Estou disponível para esclarecer qualquer dúvida que surja.') +
      p('Beijinhos,'),
  },
  skin_call: {
    subject: 'Orçamento - Skin Call',
    body:
      p('Alô {{nome}},') +
      p('Tudo bem?') +
      p('Está na altura de cuidar da tua pele! Porque uma pele cuidada e saudável é o primeiro passo para que ela esteja bonita.') +
      p('De acordo com as tuas respostas no formulário, o plano que considero mais indicado para ti é {{plano}}.') +
      p('[Inserir breve explicação].') +
      EMAIL_BLOCO +
      p('Vamos cuidar da tua pele, de forma descomplicada, com base em ciência?') +
      p('Beijinhos,'),
  },
  education: blockOnly('Orçamento - Education'),
  bridal_terms: blockOnly('Termos - Bridal'),
  beauty_terms: blockOnly('Termos - Beauty'),
  skin_call_terms: blockOnly('Termos - Skin Call'),
  education_terms: blockOnly('Termos - Education'),
  schedule: {
    subject: 'Marcar sessões - Skin Call',
    body:
      p('Alô {{nome}},') +
      p('A compra do plano {{plano}} foi concluída com sucesso.') +
      p('Vamos começar a cuidar da tua pele?') +
      p('Para marcarmos a (primeira) sessão envia-me, por favor, pelo menos 3 sugestões de datas e horas.') +
      p('Temos disponibilidade maioritariamente durante a semana (segunda a sexta) e podes escolher a hora que te for mais conveniente, até mesmo pós laboral.') +
      p('Assim que alinharmos a data e hora, envio o convite com o link da videochamada e o formulário para preencheres.') +
      p('Beijinhos,'),
  },
  schedule_form: {
    subject: 'Marcação confirmada - Skin Call',
    body:
      p('Alô {{nome}},') +
      p('A (primeira) sessão ficou marcada para {{quando}}. Clica abaixo em «Entrar na Chamada» no [dia] às [hora] para iniciarmos a chamada!') +
      EMAIL_BOTAO_CHAMADA +
      EMAIL_BOTAO_FORMULARIO +
      p('Vais demorar cerca de 10 minutos a respondê-lo. Ele é propositadamente super detalhado e é importante que o preenchas de forma sincera e mais completa possível, porque são estas respostas que me permitem aconselhar-te de forma personalizada e correta. Relembro que precisas de o preencher, pelo menos, até 48h antes da nossa sessão.') +
      p('Se não entenderes ou não conseguires responder a alguma questão, podes enviar-me mensagem pelo whatsapp ou esperar pela sessão para esclarecermos essa dúvida. Seja como for, é mesmo importante que não fiques com dúvidas e me contes tudo o que consideres relevante para um acompanhamento correto! Temos de trabalhar em conjunto para garantir o sucesso da Skin Call.') +
      p('Beijinhos,'),
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
  if ((TERMS_TEMPLATE_IDS as readonly string[]).includes(id)) {
    const subjectKey = `email_${id}_subject${suffix}`;
    const bodyKey = `email_${id}_body${suffix}`;
    const legacySubject = `email_terms_subject${suffix}`;
    const legacyBodyKey = `email_terms_body${suffix}`;
    const subject = Object.prototype.hasOwnProperty.call(map, subjectKey)
      ? map[subjectKey]
      : pick(map, legacySubject, fallback.subject);
    if (Object.prototype.hasOwnProperty.call(map, bodyKey)) {
      return { subject, body: map[bodyKey] };
    }
    if (Object.prototype.hasOwnProperty.call(map, legacyBodyKey)) {
      return { subject, body: map[legacyBodyKey] };
    }
    if (locale === 'en') return { subject, body: fallback.body };
    return { subject, body: legacyBody(map, id, fallback) };
  }
  return {
    subject: pick(map, `email_${id}_subject${suffix}`, fallback.subject),
    body: locale === 'en'
      ? pick(map, `email_${id}_body_en`, fallback.body)
      : legacyBody(map, id, fallback),
  };
}

const EMAIL_DATE_KEYS = new Set(['data_casamento', 'data_prova', 'data_evento', 'data_hora']);

/** ISO `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` → `DD-MM-YYYY` (com hora se existir). */
export function formatEmailDateValue(value: string): string {
  if (/^\{\{\w+\}\}$/.test(value)) return value;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return value;
  const [, year, month, day, hour, minute] = m;
  return hour ? `${day}-${month}-${year} ${hour}:${minute}` : `${day}-${month}-${year}`;
}

/** Data/hora em `Europe/Lisbon` para `{{quando}}`: `DD-MM-YYYY HH:mm`. */
export function formatEmailDateTime(date: Date, timeZone = 'Europe/Lisbon'): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || '';
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`;
}

function formatEmailField(key: string, value: string): string {
  return EMAIL_DATE_KEYS.has(key) ? formatEmailDateValue(value) : value;
}

/** Junta campos do formulário + extras para {{nome}}, {{data_casamento}}, etc. */
export function templateVars(
  formData: Record<string, string> = {},
  extra: Record<string, string> = {},
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value != null) vars[key] = formatEmailField(key, String(value));
  }
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(extra)) {
    extras[key] = formatEmailField(key, value);
  }
  return { ...vars, ...extras };
}

export function fillTemplateBody(
  body: string,
  block: string,
  vars: Record<string, string> = {},
  extras: Record<string, string> = {},
): string {
  let html = collapseDuplicatePlaceholders((body || '').trim());
  if (html.includes(EMAIL_BLOCO)) html = html.split(EMAIL_BLOCO).join(block);
  for (const [token, htmlBlock] of Object.entries(extras)) {
    const needle = `{{${token}}}`;
    if (html.includes(needle)) html = html.split(needle).join(htmlBlock);
  }
  return interpolateHtml(html, vars);
}

export function wrapPreviewBlock(block: string, token = 'bloco'): string {
  if (!block) return '';
  if (token === 'bloco') {
    return `${BLOCO_START}<div data-miana-block="1">${block}</div>${BLOCO_END}`;
  }
  return `<!--miana-block-start:${token}--><div data-miana-block="${token}" contenteditable="false">${block}</div><!--miana-block-end:${token}-->`;
}

const EMPTY_P = '<p><br></p>';

export function previewTemplateBody(
  body: string,
  block: string,
  extras: Record<string, string> = {},
): string {
  let html = collapseDuplicatePlaceholders((body || '').trim());
  const wrappedBloco = wrapPreviewBlock(block);
  if (!html) return wrappedBloco ? EMPTY_P + wrappedBloco + EMPTY_P : '';
  if (html.includes(EMAIL_BLOCO)) html = html.split(EMAIL_BLOCO).join(wrappedBloco);
  for (const [token, htmlBlock] of Object.entries(extras)) {
    const needle = `{{${token}}}`;
    if (html.includes(needle)) html = html.split(needle).join(wrapPreviewBlock(htmlBlock, token));
  }
  if (wrappedBloco && html.includes(BLOCO_END)) {
    const after = html.split(BLOCO_END).pop() || '';
    if (!after.trim()) html = html.replace(BLOCO_END, BLOCO_END + EMPTY_P);
    const before = html.split(BLOCO_START)[0] || '';
    if (!before.trim()) html = EMPTY_P + html;
  }
  return html;
}

const EMPTY_P_RE = '<p>(<br\\s*/?>|&nbsp;|\\s)*</p>';

export function bodyFromEditor(html: string): string {
  let out = html
    .replace(/<!--miana-block-start(?::([a-z_]+))?-->[\s\S]*?<!--miana-block-end(?::[a-z_]+)?-->/g, (_, name) => (
      name ? `{{${name}}}` : EMAIL_BLOCO
    ))
    .replace(/<div[^>]*data-miana-block="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi, (_, name) => (
      name === '1' ? EMAIL_BLOCO : `{{${name}}}`
    ));
  out = out.replace(new RegExp(`${EMPTY_P_RE}\\s*\\{\\{bloco\\}\\}`, 'gi'), EMAIL_BLOCO);
  out = out.replace(new RegExp(`\\{\\{bloco\\}\\}\\s*${EMPTY_P_RE}`, 'gi'), EMAIL_BLOCO);
  return normalizeEmailBodyHtml(collapseDuplicatePlaceholders(out));
}

export async function getEmailCopy(env: Env, locale: Locale = DEFAULT_LOCALE): Promise<EmailCopy> {
  const resolved = parseLocale(locale);
  const map = await loadSettingsMap(env);
  const { EMAIL_COPY_FALLBACKS_EN } = await import('./email-copy-en');
  const F = resolved === 'en' ? EMAIL_COPY_FALLBACKS_EN : EMAIL_COPY_FALLBACKS;
  return {
    wrapFooter: {
      email: map.contact_email || CONTACT_FALLBACKS.email,
      phone: map.contact_phone || CONTACT_FALLBACKS.phone,
      instagram: SIG_INSTAGRAM_FALLBACK,
      website: SIG_WEBSITE_FALLBACK,
      assetBase: siteUrl(env).replace(/\/$/, ''),
    },
    bridal_intro: templateFromMap(map, 'bridal_intro', F.bridal_intro, resolved),
    bridal: templateFromMap(map, 'bridal', F.bridal, resolved),
    bridal_terms: templateFromMap(map, 'bridal_terms', F.bridal_terms, resolved),
    beauty: templateFromMap(map, 'beauty', F.beauty, resolved),
    beauty_terms: templateFromMap(map, 'beauty_terms', F.beauty_terms, resolved),
    skin_call: templateFromMap(map, 'skin_call', F.skin_call, resolved),
    skin_call_terms: templateFromMap(map, 'skin_call_terms', F.skin_call_terms, resolved),
    education: templateFromMap(map, 'education', F.education, resolved),
    education_terms: templateFromMap(map, 'education_terms', F.education_terms, resolved),
    schedule: templateFromMap(map, 'schedule', F.schedule, resolved),
    schedule_form: templateFromMap(map, 'schedule_form', F.schedule_form, resolved),
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

export function termsCopyForType(copy: EmailCopy, type: LeadType): EmailTemplateCopy {
  switch (type) {
    case 'bridal':
      return copy.bridal_terms;
    case 'beauty':
      return copy.beauty_terms;
    case 'skin-call':
      return copy.skin_call_terms;
    case 'education':
      return copy.education_terms;
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
    return sanitizeEmailHtml(normalizeEmailBodyHtml(interpolateHtml(trimmed, vars)));
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
  if (looksLikeHtml(text)) return sanitizeEmailHtml(normalizeEmailBodyHtml(text));
  return textToHtml(text);
}
