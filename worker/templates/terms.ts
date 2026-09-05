// Template placeholder - termos, pagamento e anexo PDF.

import { wrapEmail } from './base';

export function termsSubject(): string {
  return 'Termos e condições e dados de pagamento';
}

export function termsEmail(opts: {
  nome: string;
  iban: string;
  accountName: string;
  mbway: string;
  notes?: string;
}): string {
  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Termos e condições</h2>
    <p>Olá ${opts.nome},</p>
    <p>Para avançarmos, envio os <strong>termos e condições</strong> em anexo e os dados de pagamento.</p>
    <p>Quando o pagamento estiver feito, responde a este email com o <strong>comprovativo</strong> e a frase:</p>
    <p style="font-style:italic">«Declaro que li e aceito os termos e condições.»</p>
    <h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">Dados de pagamento [PLACEHOLDER]</h3>
    <p style="margin:4px 0"><strong>Titular:</strong> ${opts.accountName}</p>
    <p style="margin:4px 0"><strong>IBAN:</strong> ${opts.iban}</p>
    <p style="margin:4px 0"><strong>MB Way:</strong> ${opts.mbway}</p>
    ${opts.notes ? `<p>${opts.notes}</p>` : ''}
    <p style="font-size:13px;color:#8a7a74">Este texto é provisório e será substituído pela copy final.</p>
  `;
  return wrapEmail(body);
}
