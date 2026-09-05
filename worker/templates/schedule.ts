// Template placeholder - pedir sugestões de datas (Skin Call).

import { wrapEmail } from './base';

export function scheduleSubject(): string {
  return 'Marcar sessões - Skin Call';
}

export function scheduleEmail(nome: string): string {
  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Marcar sessões</h2>
    <p>Olá ${nome},</p>
    <p>Para marcarmos a sessão, envia-me por favor algumas <strong>sugestões de datas e horas</strong>.</p>
    <p>Prefiro durante a <strong>semana</strong> (segunda a sexta). Pode ser a qualquer hora.</p>
    <p>Assim que alinharmos, envio o convite com o link da videochamada e o formulário.</p>
    <p style="font-size:13px;color:#8a7a74">Este texto é provisório e será substituído pela copy final.</p>
  `;
  return wrapEmail(body);
}
