// Utilitário de formulários do site - partilhado por todos os formulários.
// Envia para o nosso Worker (POST /api/lead), que entrega o pedido
// por email à dona via Resend.

import { syncPhoneFields } from './phone-field';

export const SUCCESS_MESSAGE =
  'Obrigada! O teu pedido foi registado. Responderei assim que possível com todas as informações.';

export interface FormMessages {
  sending: string;
  success: string;
  error: string;
}

export interface FieldValidationMessages {
  required: string;
  name: string;
  email: string;
  phoneEmpty: string;
  phonePt: string;
  phoneOther: string;
  dialCode: string;
  chooseOne: string;
  guests: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR_CLS = ['!border-burgundy', '!bg-[#FBEDF0]'];
const ERROR_TEXT_CLS = 'mt-1.5 text-sm text-burgundy';

const DEFAULT_VALIDATION: FieldValidationMessages = {
  required: 'Preenche este campo.',
  name: 'O nome deve ter pelo menos 2 caracteres.',
  email: 'Escreve um e-mail válido, por exemplo nome@email.com.',
  phoneEmpty: 'Indica o número, só com dígitos.',
  phonePt: 'O número português tem 9 dígitos, sem espaços.',
  phoneOther: 'O número deve ter pelo menos 6 dígitos, sem espaços.',
  dialCode: 'Escolhe o indicativo do país.',
  chooseOne: 'Escolhe pelo menos uma opção.',
  guests: 'Indica pelo menos 1 pessoa num dos serviços.',
};

function messagesFromForm(form: HTMLFormElement, override?: FormMessages): FormMessages {
  return {
    sending: override?.sending ?? form.dataset.msgSending ?? 'A enviar...',
    success: override?.success ?? form.dataset.msgSuccess ?? SUCCESS_MESSAGE,
    error: override?.error ?? form.dataset.msgError ?? '',
  };
}

function validationFromForm(form: HTMLFormElement): FieldValidationMessages {
  const raw = form.dataset.validation;
  if (!raw) return DEFAULT_VALIDATION;
  try {
    return { ...DEFAULT_VALIDATION, ...(JSON.parse(raw) as Partial<FieldValidationMessages>) };
  } catch {
    return DEFAULT_VALIDATION;
  }
}

function isVisible(el: Element): boolean {
  return !el.closest('.hidden');
}

function highlight(el: HTMLElement, on: boolean): void {
  if (on) el.classList.add(...ERROR_CLS);
  else el.classList.remove(...ERROR_CLS);
}

function errorHost(el: HTMLElement): HTMLElement {
  if (el.matches('[data-phone-field]')) return el;
  if (el.tagName === 'FIELDSET') return el;
  return el.parentElement ?? el;
}

function ensureErrorEl(host: HTMLElement): HTMLParagraphElement {
  const existing = host.querySelector<HTMLParagraphElement>(':scope > [data-field-error]');
  if (existing) return existing;
  const p = document.createElement('p');
  p.dataset.fieldError = '';
  p.className = ERROR_TEXT_CLS;
  p.setAttribute('role', 'alert');
  p.hidden = true;
  host.appendChild(p);
  return p;
}

function setControlInvalid(el: HTMLElement, errorId: string, on: boolean): void {
  if (on) {
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', errorId);
    el.dataset.hasError = '1';
  } else {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    delete el.dataset.hasError;
  }
}

function showFieldError(anchor: HTMLElement, highlights: HTMLElement[], message: string): void {
  const host = errorHost(anchor);
  const err = ensureErrorEl(host);
  if (!err.id) {
    const form = host.closest('form');
    err.id = `${form?.id || 'form'}-err-${Math.random().toString(36).slice(2, 8)}`;
  }
  err.textContent = message;
  err.hidden = false;
  highlights.forEach((el) => {
    highlight(el, true);
    setControlInvalid(el, err.id, true);
  });
  host.dataset.hasError = '1';
}

export function clearFormErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-has-error], [aria-invalid="true"]').forEach((el) => {
    highlight(el, false);
    setControlInvalid(el, '', false);
    delete el.dataset.hasError;
  });
  form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((el) => {
    el.textContent = '';
    el.hidden = true;
  });
}

/**
 * Rola até ao topo do formulário, descontando a altura do header fixo (h-20 = 80px).
 */
export function scrollFormIntoView(form: HTMLFormElement): void {
  scrollElementIntoView(form);
}

function scrollElementIntoView(el: HTMLElement): void {
  const header = document.getElementById('site-header');
  const headerHeight = header?.offsetHeight ?? 80;
  const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export function scrollToFirstError(form: HTMLFormElement): void {
  const first =
    form.querySelector<HTMLElement>('[data-has-error]') ??
    form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (first) scrollElementIntoView(first);
  else scrollFormIntoView(form);
}

function validatePhoneFields(form: HTMLFormElement, copy: FieldValidationMessages): boolean {
  let valid = true;
  form.querySelectorAll<HTMLElement>('[data-phone-field]').forEach((wrap) => {
    if (!isVisible(wrap)) return;
    const dial = wrap.dataset.dialCode || '';
    const numberInput = wrap.querySelector<HTMLInputElement>('[data-phone-number]');
    const trigger = wrap.querySelector<HTMLElement>('[data-dial-trigger]');
    const digits = (numberInput?.value ?? '').replace(/\D/g, '');
    const highlightEls = [numberInput, trigger].filter((el): el is HTMLElement => !!el);

    if (!dial) {
      showFieldError(wrap, highlightEls, copy.dialCode);
      valid = false;
      return;
    }
    if (!digits) {
      showFieldError(wrap, highlightEls, copy.phoneEmpty);
      valid = false;
      return;
    }
    if (dial === '+351' && digits.length !== 9) {
      showFieldError(wrap, highlightEls, copy.phonePt);
      valid = false;
      return;
    }
    if (digits.length < 6) {
      showFieldError(wrap, highlightEls, copy.phoneOther);
      valid = false;
    }
  });
  return valid;
}

/**
 * Valida o formulário no submit: campos obrigatórios, formato e regras extra.
 * Mostra a mensagem ao pé de cada campo errado.
 */
export function validateForm(form: HTMLFormElement): boolean {
  clearFormErrors(form);
  syncPhoneFields(form);
  const copy = validationFromForm(form);
  let valid = true;

  const radioGroups = new Map<string, HTMLInputElement[]>();

  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]').forEach((el) => {
    if (!isVisible(el)) return;
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.type === 'radio') {
        const group = radioGroups.get(el.name) ?? [];
        group.push(el);
        radioGroups.set(el.name, group);
      }
      return;
    }
    if (el instanceof HTMLInputElement && el.matches('[data-phone-hidden]')) return;

    const value = (el.value ?? '').trim();
    if (!value) {
      showFieldError(el, [el], copy.required);
      valid = false;
      return;
    }
    if (el.name === 'nome' && value.length < 2) {
      showFieldError(el, [el], copy.name);
      valid = false;
      return;
    }
    if (el.name === 'email' && !EMAIL_RE.test(value)) {
      showFieldError(el, [el], copy.email);
      valid = false;
    }
  });

  radioGroups.forEach((group) => {
    if (group.every((r) => !isVisible(r))) return;
    if (group.some((r) => r.checked)) return;
    const fieldset = group[0]?.closest('fieldset');
    const legend = fieldset?.querySelector<HTMLElement>('legend');
    const anchor = fieldset ?? group[0];
    if (anchor) {
      showFieldError(anchor, legend ? [legend] : group, copy.required);
      valid = false;
    }
  });

  if (!validatePhoneFields(form, copy)) valid = false;

  form.querySelectorAll<HTMLElement>('[data-require-one]').forEach((fs) => {
    if (!isVisible(fs)) return;
    const name = fs.dataset.requireOne;
    if (!name) return;
    const checked = form.querySelectorAll(`input[name="${name}"]:checked`);
    if (checked.length > 0) return;
    const legend = fs.querySelector<HTMLElement>('legend');
    showFieldError(fs, legend ? [legend] : [fs], copy.chooseOne);
    valid = false;
  });

  form.querySelectorAll<HTMLInputElement>('[data-required-if-checked]').forEach((el) => {
    const spec = el.dataset.requiredIfChecked;
    if (!spec) return;
    const sep = spec.indexOf(':');
    if (sep < 0) return;
    const name = spec.slice(0, sep);
    const value = spec.slice(sep + 1);
    const match = form.querySelector<HTMLInputElement>(
      `input[name="${name}"][value="${CSS.escape(value)}"]:checked`,
    );
    if (!match) return;
    if ((el.value ?? '').trim()) return;
    showFieldError(el, [el], copy.required);
    valid = false;
  });

  form.querySelectorAll<HTMLElement>('[data-guest-group]').forEach((fs) => {
    if (!isVisible(fs)) return;
    const inputs = [...fs.querySelectorAll<HTMLInputElement>('input[type="number"]')];
    const total = inputs.reduce((sum, el) => sum + (parseInt(el.value || '0', 10) || 0), 0);
    if (total >= 1) return;
    showFieldError(fs, inputs.length ? inputs : [fs], copy.guests);
    valid = false;
  });

  return valid;
}

/** @deprecated Prefer validateForm - mantido para compatibilidade. */
export function validateRequiredFields(form: HTMLFormElement): boolean {
  return validateForm(form);
}

/**
 * Envia o formulário para o nosso Worker e atualiza o elemento de estado.
 * Devolve true em caso de sucesso.
 */
export async function submitForm(
  form: HTMLFormElement,
  statusEl: HTMLElement | null,
  override?: FormMessages,
): Promise<boolean> {
  if (!statusEl) return false;
  const messages = messagesFromForm(form, override);
  const ownerEmail = import.meta.env.PUBLIC_OWNER_EMAIL || 'hello@marianapita.pt';

  syncPhoneFields(form);

  statusEl.textContent = messages.sending;
  statusEl.className = 'mt-3 text-sm text-darkbrown/60';

  try {
    const formData = new FormData(form);
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();

    if (result.success) {
      statusEl.textContent = messages.success;
      statusEl.className = 'mt-3 text-sm font-medium text-burgundy';
      form.reset();
      return true;
    }
    const serverError =
      (typeof result.error === 'string' && result.error) ||
      (typeof result.message === 'string' && result.message) ||
      '';
    throw new Error(serverError || 'Erro ao enviar');
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const fallback = messages.error
      ? messages.error.replace('{email}', ownerEmail)
      : `Algo correu mal. Tenta novamente ou escreve para ${ownerEmail}.`;
    statusEl.textContent = msg && msg !== 'Erro ao enviar' ? msg : fallback;
    statusEl.className = 'mt-3 text-sm text-red-700';
    return false;
  }
}
