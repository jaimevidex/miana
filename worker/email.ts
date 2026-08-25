// Envio de email — Resend API (produção) ou Mailpit SMTP (local dev).

import type { Env } from './lib';
import type { LeadType } from './lib';
import { siteUrl, fromEmail, fromName, ownerEmail, adminLeadUrl } from './config';

type ResendPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export function emailEnabled(env: Env): boolean {
  return env.EMAIL_ENABLED === 'true';
}

// Detectar modo local: sem RESEND_API_KEY ou flag local
function isLocal(env: Env): boolean {
  return !env.RESEND_API_KEY || env.RESEND_API_KEY.startsWith('REPLACE');
}

// ─── Envio via Resend (produção) ────────────────────────────────────────────

async function sendResend(env: Env, payload: ResendPayload): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, from: `${fromName(env)} <${fromEmail(env)}>` }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[resend] ${res.status}`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[resend] error:', err);
    return false;
  }
}

// ─── Envio via Mailpit SMTP (local dev) ─────────────────────────────────────

async function sendMailpit(payload: ResendPayload): Promise<boolean> {
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    const to = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;

    await transport.sendMail({
      from: `${fromName({} as Env)} <${fromEmail({} as Env)}>`,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    console.log(`[mailpit] Email enviado para ${to} — "${payload.subject}"`);
    console.log(`[mailpit] Ver em http://localhost:8025`);
    return true;
  } catch (err) {
    console.error('[mailpit] error:', err);
    return false;
  }
}

// ─── Envio unificado ────────────────────────────────────────────────────────

async function sendEmail(env: Env, payload: ResendPayload): Promise<boolean> {
  if (isLocal(env)) {
    return sendMailpit(payload);
  }
  return sendResend(env, payload);
}

// ─── Notificação de nova lead (todos os tipos) ──────────────────────────────

const TYPE_LABELS: Record<LeadType, string> = {
  'skin-call': 'Skin Call',
  'bridal-beauty': 'Bridal & Beauty',
  'education': 'Education',
};

export async function sendLeadNotification(
  env: Env,
  lead: { id: string; nome: string; email: string; telefone: string; type: LeadType }
): Promise<void> {
  const typeLabel = TYPE_LABELS[lead.type];
  const subject = `🔔 Novo Pedido — ${typeLabel}`;
  const adminLink = adminLeadUrl(env, lead.id);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:480px; margin:0 auto;">
      <p>Recebeste um novo pedido de <strong>${typeLabel}</strong>.</p>
      <p><strong>${lead.nome}</strong> — ${lead.email} — ${lead.telefone}</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${adminLink}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Ver na dashboard
        </a>
      </p>
    </div>
  `;

  const text = `Novo pedido de ${typeLabel}: ${lead.nome} — ${lead.email} — ${lead.telefone}\n\nVer na dashboard: ${adminLink}`;

  await sendEmail(env, { to: ownerEmail(env), subject, html, text });
}

// ─── Diagnóstico completo (Skin Call stage 2) ──────────────────────────────

export async function sendDiagnosticComplete(
  env: Env,
  data: { nome: string; email: string; telefone: string },
  leadId: string
): Promise<void> {
  const subject = `🔔 Diagnóstico de Preenchido — Skin Call`;
  const adminLink = adminLeadUrl(env, leadId);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:480px; margin:0 auto;">
      <p>A cliente <strong>${data.nome}</strong> preencheu o diagnóstico de pele.</p>
      <p><strong>${data.nome}</strong> — ${data.email} — ${data.telefone}</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${adminLink}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Ver diagnóstico
        </a>
      </p>
    </div>
  `;

  const text = `Diagnóstico preenchido por ${data.nome} — ${data.email} — ${data.telefone}\n\nVer diagnóstico: ${adminLink}`;

  await sendEmail(env, { to: ownerEmail(env), subject, html, text });
}

// ─── Link de diagnóstico enviado ao cliente ─────────────────────────────────

export async function sendDiagnosticInvite(
  env: Env,
  lead: { nome: string; email: string; token: string }
): Promise<void> {
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

  await sendEmail(env, { to: lead.email, subject, html, text });
}

// ─── Email de orçamento enviado ao cliente ──────────────────────────────────

export async function sendQuoteEmail(
  env: Env,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:480px; margin:0 auto;">
      ${htmlBody}
      <p style="font-size:13px; color:#8a7a74; margin-top:32px;">Se tiveres qualquer dúvida, envia um email para <a href="mailto:${ownerEmail(env)}" style="color:#8a2831;">${ownerEmail(env)}</a>.</p>
      <p>Com carinho,<br/>Mariana Pita</p>
    </div>
  `;

  const text = htmlBody.replace(/<[^>]+>/g, '');

  await sendEmail(env, { to, subject, html, text });
}
