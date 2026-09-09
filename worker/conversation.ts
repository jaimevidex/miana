// Conversas de email: criar, listar, enviar, ligar lead→cliente.

import { eq, desc, and, gt, sql, inArray } from 'drizzle-orm';
import { createDb } from './db';
import {
  conversations,
  emailMessages,
  emailAttachments,
  leads,
  clients,
} from './db/schema';
import type { Env } from './lib';
import { fromEmail, replyToForConversation } from './config';
import { sendEmail, newRfcMessageId, resolveSentRfcMessageId, type EmailAttachment } from './email';
import { htmlToPlain } from './email-sanitize';
import {
  buildReplyHeaders,
  extractEmailAddress,
  isInternalFrom,
  isOwnerNotificationSubject,
  isSyntheticMessageId,
  normalizeMessageId,
  parsePlusConversationId,
  pickThreadParent,
  resolveConversationSubject,
  splitReferences,
} from './email-match';
import { EMAIL_ATTACHMENTS_FOLDER, MAX_CHAT_EXTRA_ATTACHMENTS, MAX_EMAIL_ATTACHMENT_BYTES } from './constants';
import { resolveSelectedTemplateAttachments, isEmailTemplateId } from './template-attachments';
import { parseLocale, type Locale } from './locale';

export type TemplateKind =
  | 'free'
  | 'quote'
  | 'bridal_intro'
  | 'terms'
  | 'schedule'
  | 'schedule_form'
  | 'diagnostic_invite';

export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof emailMessages.$inferSelect;
export type AttachmentRow = typeof emailAttachments.$inferSelect;

export type MessageWithAttachments = MessageRow & { attachments: AttachmentRow[] };

export const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
}

function sniffedImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return null;
}

export function resolveOutgoingAttachmentType(
  filename: string,
  contentType: string,
  bytes: Uint8Array,
): string | null {
  const name = filename.toLowerCase();
  const declared = contentType.split(';')[0].trim().toLowerCase();
  if (name.endsWith('.pdf') || declared === 'application/pdf') {
    return isPdfBytes(bytes) ? 'application/pdf' : null;
  }
  const sniffed = sniffedImageType(bytes);
  return sniffed && ALLOWED_ATTACHMENT_TYPES.has(sniffed) ? sniffed : null;
}

export function validateOutgoingAttachment(
  filename: string,
  contentType: string,
  bytes: Uint8Array,
): string | null {
  const label = filename.trim() || 'anexo';
  if (!bytes.byteLength) return `${label}: ficheiro vazio.`;
  if (bytes.byteLength > MAX_EMAIL_ATTACHMENT_BYTES) return `${label}: demasiado grande (máx. 10 MB).`;
  if (!resolveOutgoingAttachmentType(filename, contentType, bytes)) {
    return `${label}: tipo não permitido (PDF, JPEG, PNG, WebP ou GIF).`;
  }
  return null;
}

export function isSafeAttachmentKey(key: string): boolean {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return false;
  }
  if (!decoded || decoded.includes('..') || decoded.includes('\\')) return false;
  return decoded.startsWith(`${EMAIL_ATTACHMENTS_FOLDER}/`);
}

export async function getOrCreateConversationForLead(env: Env, leadId: string): Promise<ConversationRow> {
  const db = createDb(env);
  const existing = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
  if (existing[0]) return existing[0];

  const leadRows = await db.select({ email: leads.email }).from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!leadRows[0]) throw new Error('Lead não encontrada');

  const clientRows = await db.select({ id: clients.id }).from(clients).where(eq(clients.leadId, leadId)).limit(1);
  const now = Date.now();
  const row: ConversationRow = {
    id: crypto.randomUUID(),
    leadId,
    clientId: clientRows[0]?.id ?? null,
    lastMessageAt: now,
    unreadInboundCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(conversations).values([row]);
  return row;
}

export async function getOrCreateConversationForClient(env: Env, clientId: string): Promise<ConversationRow> {
  const db = createDb(env);
  const byClient = await db.select().from(conversations).where(eq(conversations.clientId, clientId)).limit(1);
  if (byClient[0]) return byClient[0];

  const clientRows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const client = clientRows[0];
  if (!client) throw new Error('Cliente não encontrado');

  if (client.leadId) {
    const byLead = await db.select().from(conversations).where(eq(conversations.leadId, client.leadId)).limit(1);
    if (byLead[0]) {
      const now = Date.now();
      await db.update(conversations).set({ clientId, updatedAt: now }).where(eq(conversations.id, byLead[0].id));
      return { ...byLead[0], clientId, updatedAt: now };
    }
  }

  const now = Date.now();
  const row: ConversationRow = {
    id: crypto.randomUUID(),
    leadId: client.leadId,
    clientId,
    lastMessageAt: now,
    unreadInboundCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(conversations).values([row]);
  return row;
}

export async function linkConversationToClient(env: Env, leadId: string, clientId: string): Promise<void> {
  const db = createDb(env);
  const now = Date.now();
  const existing = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
  if (existing[0]) {
    await db.update(conversations).set({ clientId, updatedAt: now }).where(eq(conversations.id, existing[0].id));
    return;
  }
  await db.insert(conversations).values([{
    id: crypto.randomUUID(),
    leadId,
    clientId,
    lastMessageAt: now,
    unreadInboundCount: 0,
    createdAt: now,
    updatedAt: now,
  }]);
}

export async function listMessages(env: Env, conversationId: string): Promise<MessageWithAttachments[]> {
  const db = createDb(env);
  const msgs = await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.conversationId, conversationId))
    .orderBy(emailMessages.sentAt);
  if (msgs.length === 0) return [];
  const ids = msgs.map((m) => m.id);
  const atts = await db.select().from(emailAttachments).where(inArray(emailAttachments.messageId, ids));
  const byMsg = new Map<string, AttachmentRow[]>();
  for (const a of atts) {
    const list = byMsg.get(a.messageId) || [];
    list.push(a);
    byMsg.set(a.messageId, list);
  }
  return msgs.map((m) => ({ ...m, attachments: byMsg.get(m.id) || [] }));
}

export async function markConversationRead(env: Env, conversationId: string): Promise<void> {
  const db = createDb(env);
  await db.update(conversations).set({ unreadInboundCount: 0, updatedAt: Date.now() }).where(eq(conversations.id, conversationId));
}

export async function unreadByLeadIds(env: Env): Promise<Map<string, number>> {
  const db = createDb(env);
  const rows = await db
    .select({ leadId: conversations.leadId, unread: conversations.unreadInboundCount })
    .from(conversations)
    .where(and(gt(conversations.unreadInboundCount, 0), sql`${conversations.leadId} IS NOT NULL`));
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.leadId) map.set(r.leadId, r.unread);
  }
  return map;
}

export async function unreadByClientIds(env: Env): Promise<Map<string, number>> {
  const db = createDb(env);
  const rows = await db
    .select({ clientId: conversations.clientId, unread: conversations.unreadInboundCount })
    .from(conversations)
    .where(and(gt(conversations.unreadInboundCount, 0), sql`${conversations.clientId} IS NOT NULL`));
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.clientId) map.set(r.clientId, r.unread);
  }
  return map;
}

async function lastThreadContext(
  env: Env,
  conversationId: string,
): Promise<{ firstSubject: string | null; inReplyTo?: string; references?: string }> {
  const db = createDb(env);
  const msgs = await db
    .select({
      id: emailMessages.id,
      rfcMessageId: emailMessages.rfcMessageId,
      referencesHeader: emailMessages.referencesHeader,
      subject: emailMessages.subject,
      resendId: emailMessages.resendId,
    })
    .from(emailMessages)
    .where(eq(emailMessages.conversationId, conversationId))
    .orderBy(emailMessages.sentAt);

  const firstWithSubject = msgs.find((m) => (m.subject || '').trim());
  const firstSubject = firstWithSubject?.subject?.trim() || null;
  let lastWithId = pickThreadParent(msgs, firstSubject);

  if (lastWithId?.resendId && (!lastWithId.rfcMessageId || isSyntheticMessageId(lastWithId.rfcMessageId))) {
    const real = await resolveSentRfcMessageId(env, lastWithId.resendId, lastWithId.rfcMessageId || '');
    if (real && real !== lastWithId.rfcMessageId) {
      await db.update(emailMessages).set({ rfcMessageId: real }).where(eq(emailMessages.id, lastWithId.id));
      lastWithId = { ...lastWithId, rfcMessageId: real };
    }
  }

  return { firstSubject, ...buildReplyHeaders(lastWithId) };
}

async function storeAttachment(
  env: Env,
  messageId: string,
  filename: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<void> {
  if (!env.DIAG_PHOTOS) return;
  if (bytes.byteLength > MAX_EMAIL_ATTACHMENT_BYTES) return;
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_ATTACHMENT_TYPES.has(type) && !filename.toLowerCase().endsWith('.pdf')) return;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'anexo';
  const key = `${EMAIL_ATTACHMENTS_FOLDER}/${messageId}/${crypto.randomUUID()}-${safeName}`;
  await env.DIAG_PHOTOS.put(key, bytes, { httpMetadata: { contentType: type || 'application/octet-stream' } });
  const db = createDb(env);
  await db.insert(emailAttachments).values([{
    id: crypto.randomUUID(),
    messageId,
    filename: filename.slice(0, 180),
    contentType: type || 'application/octet-stream',
    size: bytes.byteLength,
    r2Key: key,
  }]);
}

export async function sendConversationMessage(
  env: Env,
  opts: {
    conversationId: string;
    to: string;
    subject: string;
    html: string;
    userId: string;
    templateKind?: TemplateKind;
    templateId?: string;
    locale?: Locale | string;
    attachmentIds?: string[];
    extraAttachments?: EmailAttachment[];
  },
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const extras = opts.extraAttachments || [];
  const attachmentIds = opts.attachmentIds || [];
  if (extras.length + attachmentIds.length > MAX_CHAT_EXTRA_ATTACHMENTS) {
    return { ok: false, error: `Máximo de ${MAX_CHAT_EXTRA_ATTACHMENTS} anexos por envio.` };
  }
  for (const extra of extras) {
    const invalid = validateOutgoingAttachment(extra.filename, extra.contentType, extra.content);
    if (invalid) return { ok: false, error: invalid };
  }

  const db = createDb(env);
  const convRows = await db.select().from(conversations).where(eq(conversations.id, opts.conversationId)).limit(1);
  const conv = convRows[0];
  if (!conv) return { ok: false, error: 'Conversa não encontrada.' };

  const threading = await lastThreadContext(env, conv.id);
  const subject = resolveConversationSubject(opts.subject, threading.firstSubject);
  if (!subject) return { ok: false, error: 'Assunto e corpo do email são obrigatórios.' };

  const messageRowId = crypto.randomUUID();
  const rfcId = newRfcMessageId(env, messageRowId);
  const replyTo = replyToForConversation(env, conv.id);

  const attachments: EmailAttachment[] = [];
  if (attachmentIds.length) {
    if (!opts.templateId || !isEmailTemplateId(opts.templateId)) {
      return { ok: false, error: 'Template de anexos inválido.' };
    }
    const selected = await resolveSelectedTemplateAttachments(
      env,
      opts.templateId,
      parseLocale(opts.locale),
      attachmentIds,
    );
    if (!selected.ok) return { ok: false, error: selected.error };
    attachments.push(...selected.attachments);
  }
  for (const extra of extras) {
    const type = resolveOutgoingAttachmentType(extra.filename, extra.contentType, extra.content);
    attachments.push({
      filename: extra.filename.slice(0, 180) || 'anexo',
      contentType: type || extra.contentType,
      content: extra.content,
    });
  }
  const totalBytes = attachments.reduce((sum, att) => sum + att.content.byteLength, 0);
  if (totalBytes > MAX_EMAIL_ATTACHMENT_BYTES * 4) {
    return { ok: false, error: 'Total de anexos demasiado grande (máx. 40 MB).' };
  }

  const result = await sendEmail(env, {
    to: opts.to,
    subject,
    html: opts.html,
    text: htmlToPlain(opts.html),
    replyTo,
    messageId: rfcId,
    inReplyTo: threading.inReplyTo,
    references: threading.references,
    attachments,
  });

  if (!result.ok) return { ok: false, error: 'Falha ao enviar o email.' };

  const now = Date.now();
  await db.insert(emailMessages).values([{
    id: messageRowId,
    conversationId: conv.id,
    direction: 'outbound',
    subject,
    html: opts.html,
    text: htmlToPlain(opts.html),
    fromAddress: fromEmail(env),
    toAddress: opts.to,
    rfcMessageId: result.messageId,
    inReplyTo: threading.inReplyTo || null,
    referencesHeader: threading.references || null,
    resendId: result.resendId || null,
    templateKind: opts.templateKind || 'free',
    sentBy: opts.userId,
    sentAt: now,
  }]);

  for (const att of attachments) {
    await storeAttachment(env, messageRowId, att.filename, att.contentType, att.content);
  }

  await db.update(conversations).set({ lastMessageAt: now, updatedAt: now }).where(eq(conversations.id, conv.id));

  if (opts.templateKind === 'quote' && conv.leadId) {
    const leadRows = await db.select({ status: leads.status }).from(leads).where(eq(leads.id, conv.leadId)).limit(1);
    if (leadRows[0] && leadRows[0].status !== 'aceite' && leadRows[0].status !== 'eliminado') {
      await db.update(leads).set({ status: 'pendente', updatedAt: now }).where(eq(leads.id, conv.leadId));
    }
  }

  return { ok: true, messageId: messageRowId };
}

export type InboundParsed = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  attachments: { filename: string; contentType: string; content: Uint8Array }[];
};

export async function ingestParsedInbound(env: Env, parsed: InboundParsed): Promise<{ stored: boolean; reason?: string }> {
  const ourFrom = fromEmail(env);
  const fromAddr = extractEmailAddress(parsed.from);
  if (!fromAddr) return { stored: false, reason: 'no-from' };

  if (isInternalFrom(parsed.from, ourFrom) || isOwnerNotificationSubject(parsed.subject)) {
    return { stored: false, reason: 'internal' };
  }

  const db = createDb(env);
  let conv: ConversationRow | undefined;

  const plusIds = parsed.to.map((t) => parsePlusConversationId(t)).filter((id): id is string => !!id);
  if (plusIds[0]) {
    const rows = await db.select().from(conversations).where(eq(conversations.id, plusIds[0])).limit(1);
    conv = rows[0];
  }

  if (!conv) {
    conv = await matchByRfcScan(env, parsed);
  }

  if (!conv) {
    conv = await matchByParticipantEmail(env, fromAddr);
  }

  if (!conv) return { stored: false, reason: 'unmatched' };

  const now = Date.now();
  const messageId = crypto.randomUUID();
  await db.insert(emailMessages).values([{
    id: messageId,
    conversationId: conv.id,
    direction: 'inbound',
    subject: parsed.subject || null,
    html: parsed.html || null,
    text: parsed.text || null,
    fromAddress: fromAddr,
    toAddress: parsed.to[0] || ourFrom,
    rfcMessageId: parsed.messageId || null,
    inReplyTo: parsed.inReplyTo || null,
    referencesHeader: parsed.references || null,
    resendId: null,
    templateKind: null,
    sentBy: null,
    sentAt: now,
  }]);

  for (const att of parsed.attachments) {
    await storeAttachment(env, messageId, att.filename, att.contentType, att.content);
  }

  await db.update(conversations).set({
    lastMessageAt: now,
    updatedAt: now,
    unreadInboundCount: (conv.unreadInboundCount || 0) + 1,
  }).where(eq(conversations.id, conv.id));

  return { stored: true };
}

async function matchByRfcScan(env: Env, parsed: InboundParsed): Promise<ConversationRow | undefined> {
  const db = createDb(env);
  const targets = new Set([
    normalizeMessageId(parsed.inReplyTo),
    ...splitReferences(parsed.references),
  ]);
  if (targets.size === 0) return undefined;
  const recent = await db
    .select({ conversationId: emailMessages.conversationId, rfcMessageId: emailMessages.rfcMessageId })
    .from(emailMessages)
    .orderBy(desc(emailMessages.sentAt))
    .limit(400);
  for (const row of recent) {
    if (row.rfcMessageId && targets.has(normalizeMessageId(row.rfcMessageId))) {
      const c = await db.select().from(conversations).where(eq(conversations.id, row.conversationId)).limit(1);
      return c[0];
    }
  }
  return undefined;
}

async function matchByParticipantEmail(env: Env, fromAddr: string): Promise<ConversationRow | undefined> {
  const db = createDb(env);
  const leadRows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.email, fromAddr), sql`${leads.status} != 'eliminado'`))
    .orderBy(desc(leads.updatedAt))
    .limit(5);

  for (const lead of leadRows) {
    const c = await db.select().from(conversations).where(eq(conversations.leadId, lead.id)).limit(1);
    if (c[0]) return c[0];
  }

  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.email, fromAddr))
    .orderBy(desc(clients.updatedAt))
    .limit(5);

  for (const client of clientRows) {
    const c = await db.select().from(conversations).where(eq(conversations.clientId, client.id)).limit(1);
    if (c[0]) return c[0];
    if (client.leadId) {
      const c2 = await db.select().from(conversations).where(eq(conversations.leadId, client.leadId)).limit(1);
      if (c2[0]) return c2[0];
    }
  }

  if (leadRows[0]) {
    return getOrCreateConversationForLead(env, leadRows[0].id);
  }
  if (clientRows[0]) {
    return getOrCreateConversationForClient(env, clientRows[0].id);
  }
  return undefined;
}

export async function getConversationRecipient(
  env: Env,
  conv: ConversationRow,
): Promise<{ email: string; nome: string; type: string; token: string | null; locale: string } | null> {
  const db = createDb(env);
  if (conv.clientId) {
    const rows = await db.select().from(clients).where(eq(clients.id, conv.clientId)).limit(1);
    const c = rows[0];
    if (c) {
      let token: string | null = null;
      if (c.leadId) {
        const l = await db.select({ token: leads.token }).from(leads).where(eq(leads.id, c.leadId)).limit(1);
        token = l[0]?.token ?? null;
      }
      return { email: c.email, nome: c.nome, type: c.type, token, locale: c.locale };
    }
  }
  if (conv.leadId) {
    const rows = await db.select().from(leads).where(eq(leads.id, conv.leadId)).limit(1);
    const l = rows[0];
    if (l) return { email: l.email, nome: l.nome, type: l.type, token: l.token, locale: l.locale };
  }
  return null;
}
