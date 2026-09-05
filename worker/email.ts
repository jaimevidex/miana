// Envio de email - Resend API (produção) ou Mailpit SMTP (local dev).

import type { Env, LeadType } from './lib';
import { TYPE_LABELS } from './lib';
import { siteUrl, fromEmail, fromName, ownerEmail, adminLeadUrl, adminClientUrl } from './config';
import { getContacts } from './pricing';

export type EmailAttachment = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  ok: boolean;
  messageId: string;
  resendId?: string;
};

export function emailEnabled(env: Env): boolean {
  return env.EMAIL_ENABLED === 'true';
}

export function isLocal(env: Env): boolean {
  return !env.RESEND_API_KEY || env.RESEND_API_KEY.startsWith('REPLACE');
}

export function newRfcMessageId(env: Env, token: string): string {
  const domain = fromEmail(env).split('@')[1] || 'marianapita.pt';
  return `<msg.${token}@mail.${domain}>`;
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildHeaders(payload: SendEmailInput): Record<string, string> {
  const headers: Record<string, string> = {};
  if (payload.messageId) headers['Message-ID'] = payload.messageId;
  if (payload.inReplyTo) headers['In-Reply-To'] = payload.inReplyTo;
  if (payload.references) headers['References'] = payload.references;
  return headers;
}

// ─── Envio via Resend (produção) ────────────────────────────────────────────

async function sendResend(env: Env, payload: SendEmailInput, messageId: string): Promise<SendEmailResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) return { ok: false, messageId };

  const body: Record<string, unknown> = {
    from: `${fromName(env)} <${fromEmail(env)}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };
  if (payload.replyTo) body.reply_to = payload.replyTo;
  const headers = buildHeaders({ ...payload, messageId });
  if (Object.keys(headers).length) body.headers = headers;
  if (payload.attachments?.length) {
    body.attachments = payload.attachments.map((a) => ({
      filename: a.filename,
      content: toBase64(a.content),
      content_type: a.contentType,
    }));
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error(`[resend] ${res.status}`, raw);
      return { ok: false, messageId };
    }
    let resendId: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { id?: string };
      resendId = parsed.id;
    } catch {
      /* ignore */
    }
    return { ok: true, messageId, resendId };
  } catch (err) {
    console.error('[resend] error:', err);
    return { ok: false, messageId };
  }
}

// ─── Envio via Mailpit SMTP (local dev) ─────────────────────────────────────

async function sendMailpit(env: Env, payload: SendEmailInput, messageId: string): Promise<SendEmailResult> {
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 1026,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    const to = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;

    await transport.sendMail({
      from: `${fromName(env)} <${fromEmail(env)}>`,
      to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: toBase64(a.content),
        encoding: 'base64' as const,
        contentType: a.contentType,
      })),
    });

    console.log(`[mailpit] Email enviado para ${to} - "${payload.subject}"`);
    console.log(`[mailpit] Ver em http://localhost:8026`);
    return { ok: true, messageId };
  } catch (err) {
    console.error('[mailpit] error:', err);
    return { ok: false, messageId };
  }
}

// ─── Envio unificado ────────────────────────────────────────────────────────

export async function sendEmail(env: Env, payload: SendEmailInput): Promise<SendEmailResult> {
  const messageId = payload.messageId || newRfcMessageId(env, crypto.randomUUID());
  const withId = { ...payload, messageId };
  if (isLocal(env)) {
    return sendMailpit(env, withId, messageId);
  }
  return sendResend(env, withId, messageId);
}

// ─── Notificação de nova lead (todos os tipos) ──────────────────────────────

export async function sendLeadNotification(
  env: Env,
  lead: { id: string; nome: string; email: string; telefone: string; type: LeadType }
): Promise<void> {
  const typeLabel = TYPE_LABELS[lead.type];
  const subject = `🔔 Novo Pedido - ${typeLabel}`;
  const adminLink = adminLeadUrl(env, lead.id);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:480px; margin:0 auto;">
      <p>Recebeste um novo pedido de <strong>${typeLabel}</strong>.</p>
      <p><strong>${lead.nome}</strong> - ${lead.email} - ${lead.telefone}</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${adminLink}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Ver na dashboard
        </a>
      </p>
    </div>
  `;

  const text = `Novo pedido de ${typeLabel}: ${lead.nome} - ${lead.email} - ${lead.telefone}\n\nVer na dashboard: ${adminLink}`;
  const contacts = await getContacts(env);
  await sendEmail(env, { to: contacts.email || ownerEmail(env), subject, html, text });
}

// ─── Diagnóstico completo (Skin Call stage 2) ──────────────────────────────

export async function sendDiagnosticComplete(
  env: Env,
  data: { nome: string; email: string; telefone: string },
  clientId: string
): Promise<void> {
  const subject = `🔔 Diagnóstico de Preenchido - Skin Call`;
  const adminLink = adminClientUrl(env, clientId);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:480px; margin:0 auto;">
      <p>A cliente <strong>${data.nome}</strong> preencheu o diagnóstico de pele.</p>
      <p><strong>${data.nome}</strong> - ${data.email} - ${data.telefone}</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${adminLink}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Ver diagnóstico
        </a>
      </p>
    </div>
  `;

  const text = `Diagnóstico preenchido por ${data.nome} - ${data.email} - ${data.telefone}\n\nVer diagnóstico: ${adminLink}`;
  const contacts = await getContacts(env);
  await sendEmail(env, { to: contacts.email || ownerEmail(env), subject, html, text });
}

export type DiagnosticInviteContent = {
  subject: string;
  html: string;
  text: string;
};

export function diagnosticInviteContent(
  env: Env,
  lead: { nome: string; token: string }
): DiagnosticInviteContent {
  const url = `${siteUrl(env)}/diagnostico?token=${encodeURIComponent(lead.token)}`;
  const subject = 'Estás quase lá! Diagnóstico de pele Skin Call';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:560px; margin:0 auto;">
      <p>Olá ${lead.nome},</p>
      <p>Estamos quase lá! Para eu perceber o plano mais indicado para ti, preciso que preenchas este breve diagnóstico de pele.</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${url}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Abrir diagnóstico
        </a>
      </p>
      <p style="font-size:13px; color:#8a7a74;">Este link é pessoal e de uso único.</p>
      <p style="font-size:13px; color:#8a7a74;">Se tiveres qualquer dúvida, envia um email para <a href="mailto:${ownerEmail(env)}" style="color:#8a2831;">${ownerEmail(env)}</a>.</p>
      <p>Com carinho,<br/>Mariana Pita</p>
    </div>
  `;
  const text = `Olá ${lead.nome},\n\nEstamos quase lá! Preenche este diagnóstico de pele para eu perceber o plano mais indicado:\n\n${url}\n\nEste link é pessoal e de uso único.\n\nCom carinho,\nMariana Pita`;
  return { subject, html, text };
}

// ─── Link de diagnóstico enviado ao cliente ─────────────────────────────────

export async function sendDiagnosticInvite(
  env: Env,
  lead: { nome: string; email: string; token: string }
): Promise<SendEmailResult> {
  const content = diagnosticInviteContent(env, lead);
  return sendEmail(env, { to: lead.email, ...content });
}

// ─── Email de orçamento enviado ao cliente ──────────────────────────────────

/** Templates already call wrapEmail() - send HTML as-is (no second footer). */
export async function sendQuoteEmail(
  env: Env,
  to: string,
  subject: string,
  htmlBody: string,
  extras?: Pick<SendEmailInput, 'replyTo' | 'messageId' | 'inReplyTo' | 'references' | 'attachments'>
): Promise<SendEmailResult> {
  const text = htmlToText(htmlBody);
  return sendEmail(env, { to, subject, html: htmlBody, text, ...extras });
}
