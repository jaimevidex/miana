// Template base partilhado - wrapper HTML do email de orçamento.

import { OWNER_EMAIL } from '../config';

const ownerEmail = OWNER_EMAIL || 'hello@marianapita.pt';

export function wrapEmail(body: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#3b2a2a;max-width:560px;margin:0 auto;">
      ${body}
      <p style="font-size:13px;color:#8a7a74;margin-top:32px;">Se tiveres qualquer dúvida, envia um email para <a href="mailto:${ownerEmail}" style="color:#8a2831;">${ownerEmail}</a>.</p>
      <p>Com carinho,<br/>Mariana Pita</p>
    </div>
  `;
}

export function fieldRow(label: string, value: string | undefined): string {
  if (!value) return '';
  return `<p style="margin:4px 0"><strong>${label}:</strong> ${value}</p>`;
}

export function sectionTitle(title: string): string {
  return `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px;border-bottom:1px solid #e5ded7;padding-bottom:6px">${title}</h3>`;
}

export function priceRow(label: string, price: number): string {
  return `<p style="margin:4px 0;display:flex;justify-content:space-between"><span>${label}</span><strong>${price}€</strong></p>`;
}
