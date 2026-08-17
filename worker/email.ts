// Envio de email do funnel Skin Call via Resend (API REST, https://resend.com).
// Em `wrangler.toml` indicamos `RESEND_API_KEY` (secret) e `EMAIL_ENABLED` (stub/log enquanto não ligarmos).

import type { Env } from './lib';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'no-reply@marianapita.pt';
const FROM_NAME = 'Mariana Pita Makeup';
const DEFAULT_OWNER_EMAIL = 'hello@marianapita.pt';
const SITE_URL = 'https://marianapita.pt';

type ResendPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

function ownerEmail(env: Env): string {
  return env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
}

export function emailEnabled(env: Env): boolean {
  return env.EMAIL_ENABLED === 'true';
}

// Envia um email via API do Resend. Devolve true em caso de sucesso.
async function sendResend(env: Env, payload: ResendPayload): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!env.EMAIL_ENABLED || !apiKey || apiKey.startsWith('REPLACE')) {
    console.log(`[email:stub] ${payload.subject} :: to=${payload.to}`);
    return false;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, from: `${FROM_NAME} <${FROM_EMAIL}>` }),
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

// Email ao lead com o link (privado) para o formulário de diagnóstico pré-preenchido.
export async function sendDiagnosticInvite(
  env: Env,
  lead: { nome: string; email: string; token: string }
): Promise<void> {
  const url = `${SITE_URL}/diagnostico?token=${encodeURIComponent(lead.token)}`;
  const subject = 'Estás quase lá — diagnóstico de pele Skin Call';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a; max-width:560px; margin:0 auto;">
      <p>Olá,</p>
      <p>vi que estás interessada na <strong>Skin Call</strong>. Estamos quase lá!</p>
      <p>Quando tiveres 5 minutos, preenche apenas este formulário de diagnóstico de pele para eu perceber o plano mais indicado para ti (é rápido e personaliza o meu acompanhamento):</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="${url}" style="display:inline-block; background:#8a2831; color:#fbf5ef; text-decoration:none; padding:14px 28px; border-radius:999px; font-weight:600;">
          Abrir diagnóstico
        </a>
      </p>
      <p style="font-size:13px; color:#8a7a74;">Este link é pessoal e de uso único, e expira em 48h por questões de privacidade (RGPD).</p>
      <p style="font-size:13px; color:#8a7a74;">Se tiveres qualquer dúvida, responde a este email.</p>
      <p>Com carinho,<br/>Mariana Pita</p>
    </div>
  `;

  const text = `Olá,\n\nvi que estás interessada na Skin Call. Estamos quase lá!\n\nQuando tiveres 5 minutos, preenche este formulário de diagnóstico de pele para eu perceber o plano mais indicado:\n\n${url}\n\nEste link é pessoal e de uso único, e expira em 48h.\n\nCom carinho,\nMariana Pita`;

  await sendResend(env, { to: lead.email, subject, html, text });
}

// Pedido completo (stage 2) entregue à dona — o funil termina aqui.
export async function sendOwnerRequest(env: Env, data: Record<string, string>): Promise<void> {
  const subject = `Skin Call — diagnóstico real: ${data.nome}`;
  const lines = [
    ['Nome', data.nome],
    ['Contacto', data.telefone],
    ['Email', data.email],
    ['Plano', data.plano],
    ['Rotina', data.rotina],
    ['Frequência', data.rotina_frequencia],
    ['Preocupações', data.preocupacoes],
    ['Alergias', data.alergias || '—'],
    ['Consentimento', data.consent],
  ];

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#3b2a2a;">
      <p><strong>Novo pedido real de Skin Call:</strong></p>
      <table style="border-collapse:collapse; font-size:14px;">
        ${lines
          .filter(([, v]) => v)
          .map(
            ([k, v]) => `
          <tr><td style="padding:6px 12px 6px 0; color:#8a7a74; font-weight:600; vertical-align:top; white-space:nowrap;">${k}</td>
          <td style="padding:6px 0;">${v}</td></tr>`
          )
          .join('')}
      </table>
    </div>
  `;

  const text = `Novo pedido real de Skin Call:\n\n${lines
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}`;

  await sendResend(env, { to: ownerEmail(env), subject, html, text });
}