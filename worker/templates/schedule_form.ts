// Template placeholder - marcação confirmada + Meet + formulário (Skin Call).

import { wrapEmail } from './base';

export function scheduleFormSubject(): string {
  return 'Marcação confirmada - Skin Call';
}

export function scheduleFormEmail(opts: {
  nome: string;
  whenLabel: string;
  meetUrl: string;
  formUrl: string;
}): string {
  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Marcação confirmada</h2>
    <p>Olá ${opts.nome},</p>
    <p>A sessão ficou marcada para <strong>${opts.whenLabel}</strong>.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${opts.meetUrl}" style="display:inline-block;background:#8a2831;color:#fbf5ef;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;">
        Entrar no Google Meet
      </a>
    </p>
    <p>Antes da chamada, preenche por favor o formulário de diagnóstico:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${opts.formUrl}" style="display:inline-block;background:transparent;color:#8a2831;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;border:1.5px solid #8a2831;">
        Abrir formulário
      </a>
    </p>
    <p style="font-size:13px;color:#8a7a74">Este texto é provisório e será substituído pela copy final.</p>
  `;
  return wrapEmail(body);
}
