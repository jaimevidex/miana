// Template placeholder - marcação confirmada + Meet + formulário (Skin Call).

import { EMAIL_COPY_FALLBACKS, fillTemplateBody, templateVars, type EmailTemplateCopy, type EmailWrapFooter } from '../email-copy';
import { wrapEmail } from './base';
import { formCallButton, meetCallButton } from './blocks';
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
  formData?: Record<string, string>;
}): string {
  const copy = opts.copy ?? EMAIL_COPY_FALLBACKS.schedule_form;
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const body = fillTemplateBody(copy.body, '', templateVars(opts.formData, {
    nome: opts.nome,
    quando: opts.whenLabel,
  }), {
    botao_chamada: meetCallButton({ meetUrl: opts.meetUrl }, locale),
    botao_formulario: formCallButton({ formUrl: opts.formUrl }, locale),
  });
  return wrapEmail(body, opts.footer);
}
