// Template placeholder - marcação confirmada + Meet + formulário (Skin Call).

import { EMAIL_COPY_FALLBACKS, fillTemplateBody, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { scheduleFormBlock } from './blocks';
import { DEFAULT_LOCALE, type Locale } from '../locale';

export function scheduleFormSubject(copy: EmailTemplateCopy = EMAIL_COPY_FALLBACKS.schedule_form): string {
  return copy.subject;
}

export function scheduleFormEmail(opts: {
  nome: string;
  whenLabel: string;
  meetUrl: string;
  formUrl: string;
  copy?: EmailTemplateCopy;
  footer?: EmailWrapFooter;
  locale?: Locale;
}): string {
  const copy = opts.copy ?? EMAIL_COPY_FALLBACKS.schedule_form;
  const block = scheduleFormBlock({ meetUrl: opts.meetUrl, formUrl: opts.formUrl }, opts.locale ?? DEFAULT_LOCALE);
  const body = fillTemplateBody(copy.body, block, { nome: opts.nome, quando: opts.whenLabel });
  return wrapEmail(body, opts.footer);
}
