// Email introdutório Bridal - pede hairstyling e estimativa de convidadas.

import { attachSinalVars } from '../bridal-pricing';
import { PRICING_FALLBACKS, type Pricing } from '../pricing';
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
  pricing: Pricing = PRICING_FALLBACKS,
): string {
  const body = fillTemplateBody(copy.body, '', templateVars(formData, attachSinalVars('bridal', formData, pricing)));
  return wrapEmail(body, footer);
}
