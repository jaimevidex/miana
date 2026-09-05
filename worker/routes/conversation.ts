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
  type TemplateKind,
} from '../conversation';
import { generateQuoteHtml, generateQuoteSubject } from '../services/quotes';
import { getPricing, getPaymentDetails } from '../pricing';
import { getEmailCopy } from '../email-copy';
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

export async function handleSendConversationMessage(
  request: Request,
  env: Env,
  conversationId: string | undefined,
  userId: string,
): Promise<Response> {
  if (!conversationId) return json({ error: 'ID inválido' }, 400);
  try {
    const body = await request.json() as {
      subject?: string;
      html?: string;
      templateKind?: TemplateKind;
      attachTermsPdf?: boolean;
    };
    const subject = (body.subject || '').trim();
    const html = (body.html || '').trim();
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
      templateKind: body.templateKind || 'free',
      attachTermsPdf: body.attachTermsPdf,
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
    const db = createDb(env);
    let type: LeadType | null = null;
    let formData: Record<string, string> = {};
    let nome = '';
    let storedLocale = 'pt';

    if (leadId) {
      const rows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      const lead = rows[0];
      if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
      type = lead.type as LeadType;
      formData = lead.formData ? JSON.parse(lead.formData) : {};
      nome = lead.nome;
      storedLocale = lead.locale;
      if (!formData.nome) formData.nome = nome;
    } else if (clientId) {
      const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
      const client = rows[0];
      if (!client) return json({ error: 'Cliente não encontrado.' }, 404);
      type = client.type as LeadType;
      formData = client.data ? JSON.parse(client.data) : {};
      nome = client.nome;
      storedLocale = client.locale;
      if (!formData.nome) formData.nome = nome;
    } else {
      return json({ error: 'Indica leadId ou clientId.' }, 400);
    }

    const locale = templateLocale(request, storedLocale);
    const pricing = await getPricing(env);
    const html = await generateQuoteHtml(env, type, formData, pricing, undefined, locale);
    const subject = await generateQuoteSubject(env, type, locale);
    return json({ success: true, subject, html, nome, templateKind: 'quote' });
  } catch (e) {
    console.error('[api/admin/templates/quote]', e);
    return json({ error: 'Erro ao gerar orçamento.' }, 500);
  }
}

export async function handleBridalIntroTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  const db = createDb(env);
  let type = '';
  let formData: Record<string, string> = {};
  let nome = 'olá';
  let storedLocale = 'pt';

  if (leadId) {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!rows[0]) return json({ error: 'Lead não encontrada.' }, 404);
    nome = rows[0].nome;
    type = rows[0].type;
    formData = rows[0].formData ? JSON.parse(rows[0].formData) : {};
    storedLocale = rows[0].locale;
  } else if (clientId) {
    const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!rows[0]) return json({ error: 'Cliente não encontrado.' }, 404);
    nome = rows[0].nome;
    type = rows[0].type;
    formData = rows[0].data ? JSON.parse(rows[0].data) : {};
    storedLocale = rows[0].locale;
  } else {
    return json({ error: 'Indica leadId ou clientId.' }, 400);
  }

  if (type && type !== 'bridal') {
    return json({ error: 'O introdutório só está disponível para Bridal.' }, 400);
  }
  if (!formData.nome) formData.nome = nome;

  const locale = templateLocale(request, storedLocale);
  const copy = await getEmailCopy(env, locale);
  return json({
    success: true,
    subject: bridalIntroSubject(copy.bridal_intro),
    html: bridalIntroEmail(formData, copy.bridal_intro, copy.wrapFooter),
    templateKind: 'bridal_intro',
  });
}

export async function handleTermsTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  const db = createDb(env);
  let nome = 'olá';
  let storedLocale = 'pt';
  if (leadId) {
    const rows = await db.select({ nome: leads.nome, locale: leads.locale }).from(leads).where(eq(leads.id, leadId)).limit(1);
    if (rows[0]) {
      nome = rows[0].nome;
      storedLocale = rows[0].locale;
    }
  } else if (clientId) {
    const rows = await db.select({ nome: clients.nome, locale: clients.locale }).from(clients).where(eq(clients.id, clientId)).limit(1);
    if (rows[0]) {
      nome = rows[0].nome;
      storedLocale = rows[0].locale;
    }
  }
  const locale = templateLocale(request, storedLocale);
  const pay = await getPaymentDetails(env);
  const copy = await getEmailCopy(env, locale);
  return json({
    success: true,
    subject: termsSubject(copy.terms),
    html: termsEmail({
      nome,
      iban: escapeHtml(pay.iban),
      accountName: escapeHtml(pay.accountName),
      mbway: escapeHtml(pay.mbway),
      copy: copy.terms,
      footer: copy.wrapFooter,
      locale,
    }),
    templateKind: 'terms',
    attachTermsPdf: true,
  });
}

export async function handleScheduleTemplate(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const leadId = url.searchParams.get('leadId');
  const clientId = url.searchParams.get('clientId');
  const db = createDb(env);
  let nome = 'olá';
  let type = '';
  let storedLocale = 'pt';
  if (leadId) {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (rows[0]) {
      nome = rows[0].nome;
      type = rows[0].type;
      storedLocale = rows[0].locale;
    }
  } else if (clientId) {
    const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (rows[0]) {
      nome = rows[0].nome;
      type = rows[0].type;
      storedLocale = rows[0].locale;
    }
  }
  if (type && type !== 'skin-call') {
    return json({ error: 'Marcar sessões só está disponível para Skin Call.' }, 400);
  }
  const locale = templateLocale(request, storedLocale);
  const copy = await getEmailCopy(env, locale);
  return json({
    success: true,
    subject: scheduleSubject(copy.schedule),
    html: scheduleEmail(nome, copy.schedule, copy.wrapFooter),
    templateKind: 'schedule',
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
      return json({ error: 'Esta cliente não tem token de diagnóstico. Associa uma lead Skin Call.' }, 400);
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
    return json({
      success: true,
      subject: scheduleFormSubject(copy.schedule_form),
      html: scheduleFormEmail({
        nome: recipient.nome,
        whenLabel,
        meetUrl: meet.meetUrl,
        formUrl,
        copy: copy.schedule_form,
        footer: copy.wrapFooter,
        locale,
      }),
      meetUrl: meet.meetUrl,
      templateKind: 'schedule_form',
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
