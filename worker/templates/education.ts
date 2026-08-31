// Template de orçamento - Education.

import type { Pricing } from '../pricing';
import { wrapEmail, fieldRow, sectionTitle, priceRow } from './base';

export function educationEmail(formData: Record<string, string>, pricing: Pricing, notes?: string): string {
  const p = pricing.education;

  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Orçamento - Education</h2>

    ${sectionTitle('Dados')}
    ${fieldRow('Formato', formData.formato || '')}
    ${fieldRow('Local', formData.local_workshop || '')}
    ${fieldRow('Data e hora', formData.data_hora || '')}
    ${fieldRow('Tipo', formData.tipo || '')}
    ${fieldRow('Modalidade', formData.modalidade || '')}
    ${fieldRow('Número de participantes', formData.numero_participantes || '')}
    ${fieldRow('Regime', formData.regime || '')}
    ${fieldRow('Mensagem', formData.mensagem || '')}

    ${sectionTitle('Investimento')}
    ${priceRow('Workshop', p.workshop)}

    ${notes ? `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">Notas</h3><p>${notes}</p>` : ''}
  `;

  return wrapEmail(body);
}

export function educationSubject(): string {
  return 'Orçamento - Education';
}
