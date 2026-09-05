// Template base partilhado - wrapper HTML do email de orçamento.

import { OWNER_EMAIL } from '../config';
import type { EmailWrapFooter } from '../email-copy';
import { SIG_INSTAGRAM_FALLBACK, SIG_WEBSITE_FALLBACK } from '../email-copy';
import { htmlEscape } from '../lib';

const defaultEmail = OWNER_EMAIL || 'hello@marianapita.pt';

export function emailHeading(title: string): string {
  const t = title.trim();
  if (!t) return '';
  return `<h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">${htmlEscape(t)}</h2>`;
}

function iconLink(href: string, src: string, alt: string): string {
  return `<a href="${htmlEscape(href)}" style="display:inline-block;margin:0 10px 0 0;text-decoration:none" target="_blank" rel="noopener noreferrer"><img src="${htmlEscape(src)}" width="28" height="28" alt="${htmlEscape(alt)}" style="display:block;border:0;width:28px;height:28px" /></a>`;
}

export function emailSignatureHtml(footer?: EmailWrapFooter): string {
  const email = footer?.email || defaultEmail;
  const instagram = footer?.instagram || SIG_INSTAGRAM_FALLBACK;
  const website = footer?.website || SIG_WEBSITE_FALLBACK;
  const base = (footer?.assetBase || SIG_WEBSITE_FALLBACK).replace(/\/$/, '');
  const logo = `${base}/email/assinatura.png`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0;width:200px">
      <tr>
        <td align="left" style="padding:0;border:0">
          <img src="${htmlEscape(logo)}" alt="Mariana Pita" width="190" style="display:block;max-width:190px;width:190px;height:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td align="left" style="padding:10px 0 0;border:0">
          <div style="border-top:1px solid #e5ded7;font-size:0;line-height:0;height:0">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td align="left" style="padding:10px 0 0;border:0">
          ${iconLink(`mailto:${email}`, `${base}/email/icon-email.png`, 'Email')}
          ${iconLink(instagram, `${base}/email/icon-instagram.png`, 'Instagram')}
          ${iconLink(website, `${base}/email/icon-web.png`, 'Website')}
        </td>
      </tr>
    </table>
  `;
}

export function wrapEmail(body: string, footer?: EmailWrapFooter): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#3b2a2a;max-width:560px;margin:0 auto;">
      ${body}
      ${emailSignatureHtml(footer)}
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
