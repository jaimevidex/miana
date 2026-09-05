// Template de orçamento - Education.

import type { Pricing } from '../pricing';
import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { educationBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function educationEmail(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.education,
  footer?: EmailWrapFooter,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const block = educationBlock(formData, pricing, notes, locale);
  const body = fillTemplateBody(copy.body, block, templateVars(formData));
  return wrapEmail(body, footer);
}

export function educationSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.education): string {
  return copy.subject;
}
