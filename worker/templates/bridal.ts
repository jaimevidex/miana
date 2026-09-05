// Template de orçamento - Bridal.

import type { Pricing } from '../pricing';
import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { bridalBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function bridalEmail(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.bridal,
  footer?: EmailWrapFooter,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const block = bridalBlock(formData, pricing, notes, locale);
  const body = fillTemplateBody(copy.body, block, templateVars(formData));
  return wrapEmail(body, footer);
}

export function bridalSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.bridal): string {
  return copy.subject;
}
