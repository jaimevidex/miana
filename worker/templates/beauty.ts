// Template de orçamento - Beauty (Guests & Events).

import type { Pricing } from '../pricing';
import { wrapEmail, fieldRow, sectionTitle, priceRow } from './base';

export function beautyEmail(formData: Record<string, string>, pricing: Pricing, notes?: string): string {
  const p = pricing.beauty;
  const servicos = formData.servicos_procurados_guests || '';
  const pessoas = parseInt(formData.numero_pessoas || '0', 10);

  let total = p.pack;
  let servicoLabel = 'Pack Completo (Hair + Makeup)';
  if (servicos === 'Makeup') {
    total = p.makeup;
    servicoLabel = 'Makeup';
  } else if (servicos === 'Hair') {
    total = p.hair;
    servicoLabel = 'Hair';
  }

  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Orçamento - Beauty</h2>

    ${sectionTitle('Dados')}
    ${fieldRow('Data do evento', formData.data_evento || '')}
    ${fieldRow('Hora de estar pronta', formData.hora_pronta_evento || '')}
    ${fieldRow('Local do evento', formData.local_evento || '')}

    ${sectionTitle('Serviços')}
    ${fieldRow('Serviço', servicoLabel)}
    ${fieldRow('Número de pessoas', pessoas > 0 ? String(pessoas) : '')}

    ${sectionTitle('Investimento')}
    ${priceRow('Beauty - ' + servicoLabel, total)}
    ${pessoas > 1 ? priceRow('Adicionais × ' + (pessoas - 1) + ' × ' + p.hair + '€', (pessoas - 1) * p.hair) : ''}
    <p style="margin:12px 0 0;font-size:16px;border-top:1px solid #e5ded7;padding-top:8px;display:flex;justify-content:space-between">
      <strong>Total</strong>
      <strong>${total + ((pessoas - 1) > 0 ? (pessoas - 1) * p.hair : 0)}€</strong>
    </p>

    ${notes ? `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">Notas</h3><p>${notes}</p>` : ''}
  `;

  return wrapEmail(body);
}

export function beautySubject(): string {
  return 'Orçamento - Beauty';
}
