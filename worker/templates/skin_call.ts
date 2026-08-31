// Template de orçamento - Skin Call.

import type { Pricing } from '../pricing';
import { wrapEmail, fieldRow, sectionTitle, priceRow } from './base';

export function skinCallEmail(formData: Record<string, string>, pricing: Pricing, notes?: string): string {
  const p = pricing.skin_call;
  const plano = formData.plano || '';

  let total = 0;
  let planoLabel = plano;

  if (plano.includes('Solo')) {
    total = p.session1;
    planoLabel = 'Solo Call (1 sessão)';
  } else if (plano.includes('Duo')) {
    total = p.session2;
    planoLabel = 'Duo Call (2 sessões)';
  } else if (plano.includes('Trio')) {
    total = p.session3;
    planoLabel = 'Trio Call (3 sessões)';
  } else if (plano.includes('Quatro')) {
    total = p.session4;
    planoLabel = 'Quatro Call (4 sessões)';
  }

  const body = `
    <h2 style="font-size:20px;color:#8a2831;margin:0 0 16px">Orçamento - Skin Call</h2>

    ${sectionTitle('Plano')}
    ${fieldRow('Plano escolhido', planoLabel)}

    ${sectionTitle('Investimento')}
    ${priceRow(planoLabel, total)}

    ${notes ? `<h3 style="font-size:16px;color:#8a2831;margin:24px 0 8px">Notas</h3><p>${notes}</p>` : ''}
  `;

  return wrapEmail(body);
}

export function skinCallSubject(): string {
  return 'Orçamento - Skin Call';
}
