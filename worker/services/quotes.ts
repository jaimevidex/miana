// Quote HTML/subject generation from lead type templates.

import type { Env, LeadType } from '../lib';
import type { Pricing } from '../pricing';
import { getEmailCopy, quoteCopyForType } from '../email-copy';
import { bridalEmail } from '../templates/bridal';
import { beautyEmail } from '../templates/beauty';
import { skinCallEmail } from '../templates/skin_call';
import { educationEmail } from '../templates/education';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export async function generateQuoteHtml(
  env: Env,
  type: LeadType,
  formData: Record<string, string>,
  pricing: Pricing,
  notes?: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<string> {
  const copy = await getEmailCopy(env, locale);
  const tpl = quoteCopyForType(copy, type);
  const footer = copy.wrapFooter;
  switch (type) {
    case 'bridal':
      return bridalEmail(formData, pricing, notes, tpl, footer, locale);
    case 'beauty':
      return beautyEmail(formData, pricing, notes, tpl, footer, locale);
    case 'skin-call':
      return skinCallEmail(formData, pricing, notes, tpl, footer, locale);
    case 'education':
      return educationEmail(formData, pricing, notes, tpl, footer, locale);
  }
}

export async function generateQuoteSubject(env: Env, type: LeadType, locale: Locale = DEFAULT_LOCALE): Promise<string> {
  const copy = await getEmailCopy(env, locale);
  return quoteCopyForType(copy, type).subject;
}
