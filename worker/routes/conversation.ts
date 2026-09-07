// API admin: chat de email, templates, anexos, Google Calendar.

import { eq } from 'drizzle-orm';
import { json, type Env, type LeadType } from '../lib';
import { createDb } from '../db';
import { conversations, leads, clients } from '../db/schema';
import {
  getOrCreateConversationForLead,
  getOrCreateConversationForClient,
  listMessages,
  markConversationRead,
  sendConversationMessage,
  ingestParsedInbound,
  getConversationRecipient,
  isSafeAttachmentKey,
  resolveOutgoingAttachmentType,
  validateOutgoingAttachment,
  type TemplateKind,
} from '../conversation';
import { MAX_CHAT_EXTRA_ATTACHMENTS } from '../constants';
import type { EmailAttachment } from '../email';
import { generateQuoteHtml, generateQuoteSubject } from '../services/quotes';
import { getPricing, getPaymentDetails } from '../pricing';
import { attachPersonFields, getEmailCopy, interpolate, termsCopyForType } from '../email-copy';
import { quoteTemplateId, termsTemplateId } from '../template-attachments';
import { attachmentsPayload } from './template-attachments';
import { termsEmail, termsSubject } from '../templates/terms';
import { scheduleEmail, scheduleSubject } from '../templates/schedule';
import { scheduleFormEmail, scheduleFormSubject } from '../templates/schedule_form';
import { bridalIntroEmail, bridalIntroSubject } from '../templates/bridal_intro';
import { isLocal as emailIsLocal } from '../email';
import { siteUrl } from '../config';
import { sniffImageType } from '../photos';
import {
  googleAuthUrl,
  exchangeGoogleCode,
  disconnectGoogle,
  getGoogleStatus,
  createMeetEvent,
} from '../google-calendar';
import { sanitizeEmailHtml, escapeHtml } from '../email-sanitize';
import { localeDateTag, parseLocale, type Locale } from '../locale';

function templateLocale(request: Request, stored?: string | null): Locale {
  const url = new URL(request.url);
  return parseLocale(url.searchParams.get('locale') || stored);
}

function parseStoredData(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      if (value != null) out[key] = String(value);
    }
    return out;
  } catch {
    return {};
  }
}

type TemplateContext = {
  type: string;
  nome: string;
  locale: string;
  formData: Record<string, string>;
};

async function loadTemplateContext(
  env: Env,
  leadId: string | null,
  clientId: string | null,
): Promise<TemplateContext | null> {
  const db = createDb(env);
  if (clientId) {
    const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    const client = rows[0];
    if (!client) return leadId ? loadTemplateContext(env, leadId, null) : null;
    return {
      type: client.type,
      nome: client.nome,
      locale: client.locale,
      formData: attachPersonFields(parseStoredData(client.data), client),
    };
  }
  if (leadId) {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    const lead = rows[0];
    if (!lead) return null;
    return {
      type: lead.type,
      nome: lead.nome,
      locale: lead.locale,
      formData: attachPersonFields(parseStoredData(lead.formData), lead),
    };
  }
  return null;
}

function isLeadLocked(status: string): boolean {
  return status === 'aceite' || status === 'eliminado';
}

async function conversationForRequest(env: Env, request: Request): Promise<{ id: string } | Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  try {
    if (leadId) {
      const conv = await getOrCreateConversationForLead(env, leadId);
      return { id: conv.id };
    }
    if (clientId) {
      const conv = await getOrCreateConversationForClient(env, clientId);
      return { id: conv.id };
    }
    return json({ error: 'Indica leadId ou clientId.' }, 400);
  } catch (e) {
    console.error('[conversation] resolve', e);
    return json({ error: 'Não foi possível abrir a conversa.' }, 404);
  }
}

export async function handleGetConversation(request: Request, env: Env, conversationId: string | undefined): Promise<Response> {
  try {
    let id = conversationId;
    if (!id) {
      const resolved = await conversationForRequest(env, request);
      if (resolved instanceof Response) return resolved;
      id = resolved.id;
    }
    const db = createDb(env);
    const convRows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    const conv = convRows[0];
    if (!conv) return json({ error: 'Conversa não encontrada.' }, 404);
    const messages = await listMessages(env, id);
    return json({
      success: true,
      conversation: conv,
      messages: messages.map((m) => ({
        ...m,
        html: m.direction === 'inbound' ? sanitizeEmailHtml(m.html) : m.html,
      })),
    });
  } catch (e) {
    console.error('[api/admin/conversation] get', e);
    return json({ error: 'Erro ao carregar conversa.' }, 500);
  }
}

export async function handleMarkConversationRead(env: Env, conversationId: string | undefined): Promise<Response> {
  if (!conversationId) return json({ error: 'ID inválido' }, 400);
  await markConversationRead(env, conversationId);
  return json({ success: true });
}

function isFormFile(value: FormDataEntryValue): value is File {
  return typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'name' in value;
}

async function parseOutgoingFiles(form: FormData): Promise<EmailAttachment[] | { error: string }> {
  const raw = [...form.getAll('files'), ...form.getAll('files[]')].filter(isFormFile);
  const files = raw.filter((file) => file.name || file.size > 0);
  if (files.length > MAX_CHAT_EXTRA_ATTACHMENTS) {
    return { error: `Máximo de ${MAX_CHAT_EXTRA_ATTACHMENTS} anexos extra por envio.` };
  }
  const extras: EmailAttachment[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const invalid = validateOutgoingAttachment(file.name, file.type || '', bytes);
    if (invalid) return { error: invalid };
    const type = resolveOutgoingAttachmentType(file.name, file.type || '', bytes);
    extras.push({
      filename: file.name.slice(0, 180) || 'anexo',
      contentType: type || file.type || 'application/octet-stream',
      content: bytes,
    });
  }
  return extras;
}

function parseAttachmentIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id || '').trim()).filter(Boolean);
  }
  const text = String(raw || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed.map((id) => String(id || '').trim()).filter(Boolean);
  } catch {
    // comma-separated fallback
  }
  return text.split(',').map((id) => id.trim()).filter(Boolean);
}

async function parseSendPayload(request: Request): Promise<
  | {
    subject: string;
    html: string;
    templateKind: TemplateKind;
    templateId: string;
    locale: string;
    attachmentIds: string[];
    extraAttachments: EmailAttachment[];
  }
  | { error: string; status: number }
> {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const form = await request.formData();
    const files = await parseOutgoingFiles(form);
    if ('error' in files) return { error: files.error, status: 400 };
    return {
      subject: String(form.get('subject') || '').trim(),
      html: String(form.get('html') || '').trim(),
      templateKind: (String(form.get('templateKind') || 'free') as TemplateKind) || 'free',
      templateId: String(form.get('templateId') || '').trim(),
      locale: String(form.get('locale') || '').trim(),
      attachmentIds: parseAttachmentIds(form.get('attachmentIds')),
      extraAttachments: files,
    };
  }
  const body = await request.json() as {
    subject?: string;
    html?: string;
    templateKind?: TemplateKind;
    templateId?: string;
    locale?: string;
    attachmentIds?: unknown;
  };
  return {
    subject: (body.subject || '').trim(),
    html: (body.html || '').trim(),
    templateKind: body.templateKind || 'free',
    templateId: (body.templateId || '').trim(),
    locale: (body.locale || '').trim(),
    attachmentIds: parseAttachmentIds(body.attachmentIds),
    extraAttachments: [],
  };
}

export async function handleSendConversationMessage(
  request: Request,
  env: Env,
  conversationId: string | undefined,
  userId: string,
): Promise<Response> {
  if (!conversationId) return json({ error: 'ID inválido' }, 400);
  try {
    const parsed = await parseSendPayload(request);
    if ('error' in parsed) return json({ error: parsed.error }, parsed.status);
    const { subject, html, templateKind, templateId, locale, attachmentIds, extraAttachments } = parsed;
    if (!subject || !html) return json({ error: 'Assunto e corpo do email são obrigatórios.' }, 400);

    const db = createDb(env);
    const convRows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    const conv = convRows[0];
    if (!conv) return json({ error: 'Conversa não encontrada.' }, 404);

    if (conv.leadId && !conv.clientId) {
      const leadRows = await db.select({ status: leads.status }).from(leads).where(eq(leads.id, conv.leadId)).limit(1);
      if (leadRows[0] && isLeadLocked(leadRows[0].status)) {
        return json({ error: 'Esta lead está fechada - continua o chat na página do cliente.' }, 409);
      }
    }

    const recipient = await getConversationRecipient(env, conv);
    if (!recipient) return json({ error: 'Destinatário não encontrado.' }, 404);

    const result = await sendConversationMessage(env, {
      conversationId,
      to: recipient.email,
      subject,
      html,
      userId,
      templateKind,
      templateId,
      locale,
      attachmentIds,
      extraAttachments,
    });
    if (!result.ok) return json({ error: result.error || 'Falha ao enviar.' }, 502);
    return json({ success: true, messageId: result.messageId });
  } catch (e) {
    console.error('[api/admin/conversation/send]', e);
    return json({ error: 'Erro ao enviar mensagem.' }, 500);
  }
}

export async function handleQuoteTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  try {
    if (!leadId && !clientId) return json({ error: 'Indica leadId ou clientId.' }, 400);
    const ctx = await loadTemplateContext(env, leadId, clientId);
    if (!ctx) return json({ error: leadId ? 'Lead não encontrada.' : 'Cliente não encontrado.' }, 404);
    const type = ctx.type as LeadType;

    const locale = templateLocale(request, ctx.locale);
    const pricing = await getPricing(env);
    const html = await generateQuoteHtml(env, type, ctx.formData, pricing, undefined, locale);
    const subject = interpolate(await generateQuoteSubject(env, type, locale), ctx.formData);
    const atts = await attachmentsPayload(env, quoteTemplateId(type), locale);
    return json({ success: true, subject, html, nome: ctx.nome, templateKind: 'quote', ...atts });
  } catch (e) {
    console.error('[api/admin/templates/quote]', e);
    return json({ error: 'Erro ao gerar orçamento.' }, 500);
  }
}

export async function handleBridalIntroTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  if (!leadId && !clientId) return json({ error: 'Indica leadId ou clientId.' }, 400);
  const ctx = await loadTemplateContext(env, leadId, clientId);
  if (!ctx) return json({ error: leadId ? 'Lead não encontrada.' : 'Cliente não encontrado.' }, 404);

  if (ctx.type && ctx.type !== 'bridal') {
    return json({ error: 'O introdutório só está disponível para Bridal.' }, 400);
  }

  const locale = templateLocale(request, ctx.locale);
  const copy = await getEmailCopy(env, locale);
  const atts = await attachmentsPayload(env, 'bridal_intro', locale);
  return json({
    success: true,
    subject: interpolate(bridalIntroSubject(copy.bridal_intro), ctx.formData),
    html: bridalIntroEmail(ctx.formData, copy.bridal_intro, copy.wrapFooter),
    templateKind: 'bridal_intro',
    ...atts,
  });
}

export async function handleTermsTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  const ctx = await loadTemplateContext(env, leadId, clientId);
  const nome = ctx?.nome || 'olá';
  const storedLocale = ctx?.locale || 'pt';
  const type = (ctx?.type || null) as LeadType | null;
  const formData = ctx?.formData || { nome };
  const locale = templateLocale(request, storedLocale);
  const pay = await getPaymentDetails(env);
  const copy = await getEmailCopy(env, locale);
  const termsCopy = type ? termsCopyForType(copy, type) : copy.bridal_terms;
  const vars = { ...formData, titular: pay.accountName, iban: pay.iban, mbway: pay.mbway };
  const termsId = type ? termsTemplateId(type) : 'bridal_terms';
  const atts = await attachmentsPayload(env, termsId, locale);
  return json({
    success: true,
    subject: interpolate(termsSubject(termsCopy), vars),
    html: termsEmail({
      nome,
      iban: escapeHtml(pay.iban),
      accountName: escapeHtml(pay.accountName),
      mbway: escapeHtml(pay.mbway),
      copy: termsCopy,
      footer: copy.wrapFooter,
      locale,
      formData,
    }),
    templateKind: 'terms',
    ...atts,
  });
}

export async function handleScheduleTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  const ctx = await loadTemplateContext(env, leadId, clientId);
  const nome = ctx?.nome || 'olá';
  const type = ctx?.type || '';
  const formData = ctx?.formData || { nome };
  if (type && type !== 'skin-call') {
    return json({ error: 'Marcar sessões só está disponível para Skin Call.' }, 400);
  }
  const locale = templateLocale(request, ctx?.locale);
  const copy = await getEmailCopy(env, locale);
  const atts = await attachmentsPayload(env, 'schedule', locale);
  return json({
    success: true,
    subject: interpolate(scheduleSubject(copy.schedule), formData),
    html: scheduleEmail(formData, copy.schedule, copy.wrapFooter),
    templateKind: 'schedule',
    ...atts,
  });
}

export async function handleScheduleFormTemplate(
  request: Request,
  env: Env,
  conversationId: string | undefined,
): Promise<Response> {
  if (!conversationId) return json({ error: 'ID inválido' }, 400);
  try {
    const body = await request.json() as { startsAt?: string; locale?: string };
    if (!body.startsAt) return json({ error: 'Escolhe a data e hora.' }, 400);
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) return json({ error: 'Data inválida.' }, 400);

    const db = createDb(env);
    const convRows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    const conv = convRows[0];
    if (!conv) return json({ error: 'Conversa não encontrada.' }, 404);
    const recipient = await getConversationRecipient(env, conv);
    if (!recipient) return json({ error: 'Destinatário não encontrado.' }, 404);
    if (recipient.type !== 'skin-call') {
      return json({ error: 'Marcar e formulário só está disponível para Skin Call.' }, 400);
    }
    if (!recipient.token) {
      return json({ error: 'Esta cliente não tem token de avaliação de pele. Associa uma lead Skin Call.' }, 400);
    }

    const meet = await createMeetEvent(env, {
      summary: `Skin Call - ${recipient.nome}`,
      startsAt,
      attendeeEmail: recipient.email,
    });
    const locale = parseLocale(body.locale || recipient.locale);
    const whenLabel = startsAt.toLocaleString(localeDateTag(locale), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Lisbon',
    });
    const formUrl = `${siteUrl(env)}/diagnostico?token=${encodeURIComponent(recipient.token)}`;
    const copy = await getEmailCopy(env, locale);
    const ctx = await loadTemplateContext(env, conv.leadId, conv.clientId);
    const formData = ctx?.formData || { nome: recipient.nome, email: recipient.email, locale: recipient.locale };
    const vars = { ...formData, quando: whenLabel };
    const atts = await attachmentsPayload(env, 'schedule_form', locale);
    return json({
      success: true,
      subject: interpolate(scheduleFormSubject(copy.schedule_form), vars),
      html: scheduleFormEmail({
        nome: recipient.nome,
        whenLabel,
        meetUrl: meet.meetUrl,
        formUrl,
        copy: copy.schedule_form,
        footer: copy.wrapFooter,
        locale,
        formData,
      }),
      meetUrl: meet.meetUrl,
      templateKind: 'schedule_form',
      ...atts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar a marcação.';
    console.error('[api/admin/schedule-form]', e);
    return json({ error: msg }, 400);
  }
}

export async function handleServeEmailAttachment(env: Env, key: string): Promise<Response> {
  if (!env.DIAG_PHOTOS) return json({ error: 'R2 não configurado' }, 503);
  if (!isSafeAttachmentKey(key)) return json({ error: 'Key inválida' }, 400);
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return json({ error: 'Key inválida' }, 400);
  }
  const object = await env.DIAG_PHOTOS.get(decoded);
  if (!object) return json({ error: 'Anexo não encontrado' }, 404);
  const bytes = await object.arrayBuffer();
  const contentType = object.httpMetadata?.contentType
    || sniffImageType(new Uint8Array(bytes), 'application/octet-stream');
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'private, max-age=3600');
  const filename = decoded.split('/').pop() || 'anexo';
  headers.set('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
  return new Response(bytes, { headers });
}

export async function handleGoogleConnect(request: Request, env: Env): Promise<Response> {
  const csrf = request.headers.get('Cookie')?.match(/(?:^|;\s*)csrf_token=([^;]*)/)?.[1] || crypto.randomUUID();
  const url = googleAuthUrl(env, csrf);
  if (!url) return json({ error: 'Define GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.' }, 503);
  return new Response(null, { status: 302, headers: { Location: url } });
}

export async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const err = url.searchParams.get('error');
  if (err) {
    return new Response(null, { status: 302, headers: { Location: '/admin/settings?google=error' } });
  }
  const code = url.searchParams.get('code');
  if (!code) {
    return new Response(null, { status: 302, headers: { Location: '/admin/settings?google=error' } });
  }
  const result = await exchangeGoogleCode(env, code);
  const flag = result.ok ? 'ok' : 'error';
  return new Response(null, { status: 302, headers: { Location: `/admin/settings?google=${flag}` } });
}

export async function handleGoogleDisconnect(env: Env): Promise<Response> {
  await disconnectGoogle(env);
  return json({ success: true });
}

export async function handleGoogleStatus(env: Env): Promise<Response> {
  const status = await getGoogleStatus(env);
  return json({ success: true, ...status });
}

export async function handleDevInbound(request: Request, env: Env): Promise<Response> {
  if (!emailIsLocal(env)) {
    return json({ error: 'Só disponível em local.' }, 403);
  }
  const body = await request.json() as {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    references?: string;
  };
  const result = await ingestParsedInbound(env, {
    from: body.from || '',
    to: body.to ? [body.to] : [],
    subject: body.subject || '',
    text: body.text || '',
    html: body.html || '',
    inReplyTo: body.inReplyTo,
    references: body.references,
    attachments: [],
  });
  return json({ success: result.stored, reason: result.reason });
}
