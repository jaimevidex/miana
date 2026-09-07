// Template placeholder - pedir sugestões de datas (Skin Call).

import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';

export function scheduleSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.schedule): string {
  return copy.subject;
}

export function scheduleEmail(
  formData: Record<string, string>,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.schedule,
  footer?: EmailWrapFooter,
): string {
  const body = fillTemplateBody(copy.body, '', templateVars(formData));
  return wrapEmail(body, footer);
}
