// Template base partilhado - wrapper HTML do email de orçamento.

import { formatEuro } from '../bridal-pricing';
import { OWNER_EMAIL } from '../config';
import type { EmailWrapFooter } from '../email-copy';
import { SIG_INSTAGRAM_FALLBACK, SIG_WEBSITE_FALLBACK } from '../email-copy';
import { EMAIL_STYLE, EMAIL_WIDTH } from '../email-style';
import { htmlEscape } from '../lib';
import { DEFAULT_LOCALE, type Locale } from '../locale';

const defaultEmail = OWNER_EMAIL || 'hello@marianapita.pt';

export function emailHeading(title: string): string {
  const t = title.trim();
  if (!t) return '';
  return `<h3 style="${EMAIL_STYLE.h3}">${htmlEscape(t)}</h3>`;
}

function iconLink(href: string, src: string, alt: string): string {
  return `<a href="${htmlEscape(href)}" style="display:inline-block;margin:0 6px;text-decoration:none" target="_blank" rel="noopener noreferrer"><img src="${htmlEscape(src)}" width="28" height="28" alt="${htmlEscape(alt)}" style="display:block;border:0;width:28px;height:28px" /></a>`;
}

function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

export function emailSignatureHtml(footer?: EmailWrapFooter): string {
  const email = footer?.email || defaultEmail;
  const phone = (footer?.phone || '').trim();
  const instagram = footer?.instagram || SIG_INSTAGRAM_FALLBACK;
  const website = footer?.website || SIG_WEBSITE_FALLBACK;
  const base = (footer?.assetBase || SIG_WEBSITE_FALLBACK).replace(/\/$/, '');
  const logo = `${base}/email/assinatura.png`;
  const phoneHref = telHref(phone);
  const phoneRow = phoneHref
    ? `<tr>
          <td align="left" style="padding:8px 0 0;border:0;text-align:left">
            <a href="${htmlEscape(phoneHref)}" style="font-family:${EMAIL_STYLE.font};font-size:13px;line-height:1.2;color:#8a2831;text-decoration:none;white-space:nowrap">${htmlEscape(phone)}</a>
          </td>
        </tr>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0 0;border-collapse:collapse">
      <tr>
        <td valign="middle" align="left" style="padding:0;border:0">
          <img src="${htmlEscape(logo)}" alt="Mariana Pita" width="190" style="display:block;max-width:190px;width:190px;height:auto;border:0" />
        </td>
        <td valign="middle" align="left" width="1%" style="padding:0 0 0 16px;border:0;width:1%">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0">
            <tr>
              <td align="left" style="padding:0;border:0;font-size:0;line-height:0;text-align:left">
                ${iconLink(`mailto:${email}`, `${base}/email/icon-email.png`, 'Email')}
                ${iconLink(instagram, `${base}/email/icon-instagram.png`, 'Instagram')}
                ${iconLink(website, `${base}/email/icon-web.png`, 'Website')}
              </td>
            </tr>
            ${phoneRow}
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function wrapEmail(body: string, footer?: EmailWrapFooter): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">
      <tr>
        <td align="center" style="padding:0;border:0">
          <table role="presentation" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:${EMAIL_WIDTH}px;max-width:100%;margin:0 auto">
            <tr>
              <td style="${EMAIL_STYLE.body};padding:0;border:0">
                ${body}
                ${emailSignatureHtml(footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function fieldRow(label: string, value: string | undefined): string {
  if (!value) return '';
  return `<p style="${EMAIL_STYLE.p}"><strong>${label}:</strong> ${value}</p>`;
}

export function sectionTitle(title: string, size: 'body' | 'title' = 'body'): string {
  const style = size === 'title' ? EMAIL_STYLE.hTitle : EMAIL_STYLE.h3;
  return `<h3 style="${style}">${title}</h3>`;
}

export function priceRowOpen(label: string, amount: string, kind: 'line' | 'total' = 'line'): string {
  const extra = kind === 'total' ? 'padding-top:12px;font-weight:700' : '';
  const labelStyle = extra ? `${EMAIL_STYLE.priceCell};${extra}` : EMAIL_STYLE.priceCell;
  const valueStyle = `${labelStyle};text-align:right;white-space:nowrap;width:88px`;
  return `<tr>
      <td valign="top" style="${labelStyle}">${label}</td>
      <td valign="top" align="right" width="88" style="${valueStyle}">${amount}</td>
    </tr>`;
}

export function priceRow(label: string, price: number, locale: Locale = DEFAULT_LOCALE): string {
  return priceRowOpen(label, formatEuro(price, locale));
}

export function totalRow(label: string, amount: number, locale: Locale = DEFAULT_LOCALE): string {
  return priceRowOpen(`<strong>${label}</strong>`, `<strong>${formatEuro(amount, locale)}</strong>`, 'total');
}

export function priceTable(rows: string): string {
  const body = rows.replace(/^\s+|\s+$/g, '');
  if (!body) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:100%;border-collapse:collapse;margin:0">
    ${body}
  </table>`;
}
