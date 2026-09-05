// Email introdutório Bridal - pede hairstyling e estimativa de convidadas.

import {
  EMAIL_COPY_FALLBACKS,
  fillTemplateBody,
  templateVars,
  type EmailTemplateCopy,
  type EmailWrapFooter,
} from '../email-copy';
import { wrapEmail } from './base';

export function bridalIntroSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.bridal_intro): string {
  return copy.subject;
}

export function bridalIntroEmail(
  formData: Record<string, string>,
  copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.bridal_intro,
  footer?: EmailWrapFooter,
): string {
  const body = fillTemplateBody(copy.body, '', templateVars(formData));
  return wrapEmail(body, footer);
}
