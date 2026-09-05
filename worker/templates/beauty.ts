// Template de orçamento - Beauty (Guests & Events).

import type { Pricing } from '../pricing';
import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { beautyBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function beautyEmail(
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.beauty,
  footer?: EmailWrapFooter,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const block = beautyBlock(formData, pricing, notes, locale);
  const body = fillTemplateBody(copy.body, block, templateVars(formData));
  return wrapEmail(body, footer);
}

export function beautySubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.beauty): string {
  return copy.subject;
}
