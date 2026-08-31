// Template de orçamento - Bridal.

import type { Pricing } from '../pricing';
import { wrapEmail, fieldRow, sectionTitle, priceRow } from './base';
import { bridalQuoteTotal } from '../bridal-pricing';

export function bridalEmail(formData: Record<string, string>, pricing: Pricing, notes?: string): string {
  const quote = bridalQuoteTotal(formData, pricing);
  const g = pricing.beauty;
  const { guests } = quote;

  const guestRows = [
    guests.makeup > 0
      ? priceRow(`Guests makeup × ${guests.makeup} × ${g.makeup}€`, guests.makeup * g.makeup)
      : '',
    guests.hair > 0
      ? priceRow(`Guests hair × ${guests.hair} × ${g.hair}€`, guests.hair * g.hair)
      : '',
    guests.pack > 0
      ? priceRow(`Guests pack × ${guests.pack} × ${g.pack}€`, guests.pack * g.pack)
      : '',
  ].join('');

  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Orçamento - Bridal</h2>

    ${sectionTitle('Dados')}
    ${fieldRow('Nome', formData.nome || '')}
    ${fieldRow('Data do casamento', formData.data_casamento || '')}
    ${fieldRow('Hora de estar pronta', formData.hora_pronta || '')}
    ${fieldRow('Local da preparação', formData.local_preparacao || '')}
    ${fieldRow('Local da prova', formData.local_prova || '')}

    ${sectionTitle('Serviços')}
    ${fieldRow('Noiva', quote.brideLabel)}
    ${fieldRow('Guests makeup', guests.makeup > 0 ? String(guests.makeup) : '0')}
    ${fieldRow('Guests hair', guests.hair > 0 ? String(guests.hair) : '0')}
    ${fieldRow('Guests pack', guests.pack > 0 ? String(guests.pack) : '0')}
    ${fieldRow('Add-on Skin Call', formData.addon_skin_call || '')}

    ${sectionTitle('Investimento')}
    ${priceRow('Bridal - ' + quote.brideLabel, quote.bridePrice)}
    ${guestRows}
    <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #e5ded7;padding-top:8px;display:flex;justify-content:space-between">
      <strong>Total</strong>
      <strong>${quote.total}€</strong>
    </p>

    ${notes ? `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">Notas</h3><p>${notes}</p>` : ''}
  `;

  return wrapEmail(body);
}

export function bridalSubject(): string {
  return 'Orçamento Bridal by Mariana Pita';
}
