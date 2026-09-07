// Template placeholder - termos, pagamento e anexo PDF.

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
}): string {
  const copy = opts.copy ?? EMAIL_COPY_FALLBACKS.bridal_terms;
  const block = termsBlock({
    iban: opts.iban,
    accountName: opts.accountName,
    mbway: opts.mbway,
    notes: opts.notes,
  }, opts.locale ?? DEFAULT_LOCALE);
  const body = fillTemplateBody(copy.body, block, templateVars(opts.formData, {
    nome: opts.nome,
    titular: opts.accountName,
    iban: opts.iban,
    mbway: opts.mbway,
  }));
  return wrapEmail(body, opts.footer);
}
