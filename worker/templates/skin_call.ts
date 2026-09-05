// Template de orçamento - Skin Call.

import type { Pricing } from '../pricing';
import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { skinCallBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function skinCallEmail(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.skin_call,
  footer?: EmailWrapFooter,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const block = skinCallBlock(formData, pricing, notes, locale);
  const body = fillTemplateBody(copy.body, block, templateVars(formData));
  return wrapEmail(body, footer);
}

export function skinCallSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.skin_call): string {
  return copy.subject;
}
