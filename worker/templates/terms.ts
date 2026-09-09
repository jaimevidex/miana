// Template placeholder - termos, pagamento e anexo PDF.

import { attachSinalVars } from '../bridal-pricing';
import type { LeadType } from '../lib';
import { PRICING_FALLBACKS, type Pricing } from '../pricing';
import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { termsBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function termsSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.bridal_terms): string {
  return copy.subject;
}

export function termsEmail(opts: {
  nome: string;
  iban: string;
  accountName: string;
  mbway: string;
  notes?: string;
  copy?: EmailTemplateCopy;
  footer?: EmailWrapFooter;
  locale?: Locale;
  formData?: Record<string, string>;
  type?: LeadType;
  pricing?: Pricing;
}): string {
  const copy = opts.copy ?? EMAIL_COPY_FALLBACKS.bridal_terms;
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const block = termsBlock({
    iban: opts.iban,
    accountName: opts.accountName,
    mbway: opts.mbway,
    notes: opts.notes,
  }, locale);
  const sinal = opts.type && opts.pricing
    ? attachSinalVars(opts.type, opts.formData || {}, opts.pricing, locale)
    : opts.type
      ? attachSinalVars(opts.type, opts.formData || {}, PRICING_FALLBACKS, locale)
      : {};
  const body = fillTemplateBody(copy.body, block, templateVars(opts.formData, {
    nome: opts.nome,
    titular: opts.accountName,
    iban: opts.iban,
    mbway: opts.mbway,
    ...sinal,
  }));
  return wrapEmail(body, opts.footer);
}
