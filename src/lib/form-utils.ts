// Utilitário de formulários do site - partilhado por todos os formulários.
// Envia para o nosso Worker (POST /api/contact ou /api/lead), que entrega o pedido
// por email à dona via Resend - sem dependência de Web3Forms.

export const SUCCESS_MESSAGE =
  'Obrigada! O teu pedido foi registado. Responderei assim que possível, num prazo de até 48h com todas as informações.';

export interface FormMessages {
  sending: string;
  success: string;
  error: string;
}

function messagesFromForm(form: HTMLFormElement, override?: FormMessages): FormMessages {
  return {
    sending: override?.sending ?? form.dataset.msgSending ?? 'A enviar...',
    success: override?.success ?? form.dataset.msgSuccess ?? SUCCESS_MESSAGE,
    error: override?.error ?? form.dataset.msgError ?? '',
  };
}

const REQUIRED_ERROR_CLS = '!border-burgundy !bg-[#FBEDF0]';

/**
 * Rola até ao topo do formulário, descontando a altura do header fixo (h-20 = 80px),
 * para que o campo em falta não fique cortado/escondido.
 */
export function scrollFormIntoView(form: HTMLFormElement): void {
  const header = document.getElementById('site-header');
  const headerHeight = header?.offsetHeight ?? 80;
  const top = form.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Valida os campos com `required` (sem a animação nativa do browser).
 * Marca a vermelho/burgundy os que estiverem vazios e devolve true se tudo ok.
 */
export function validateRequiredFields(form: HTMLFormElement): boolean {
  let valid = true;
  const radioGroups = new Map<string, HTMLInputElement[]>();
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]').forEach((el) => {
    if (el.closest('.hidden')) return;
    const isEmpty =
      el.type === 'checkbox' || el.type === 'radio' ? !el.checked : !(el.value ?? '').trim();
    if (el.type === 'radio') {
      const name = el.name;
      if (!radioGroups.has(name)) radioGroups.set(name, []);
      radioGroups.get(name)!.push(el);
    } else if (isEmpty) {
      valid = false;
      el.classList.add(...REQUIRED_ERROR_CLS.split(' '));
    } else {
      el.classList.remove(...REQUIRED_ERROR_CLS.split(' '));
    }
  });

  radioGroups.forEach((group) => {
    const allEmpty = group.every((r) => !r.checked);
    group.forEach((r) => {
      const legend = r.closest('fieldset')?.querySelector('legend');
      if (allEmpty) {
        valid = false;
        legend?.classList.add(...REQUIRED_ERROR_CLS.split(' '));
      } else {
        legend?.classList.remove(...REQUIRED_ERROR_CLS.split(' '));
      }
    });
  });
  return valid;
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
    throw new Error(result.message || 'Erro ao enviar');
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const fallback = messages.error
      ? messages.error.replace('{email}', ownerEmail)
      : `Algo correu mal. Tenta novamente ou escreve para ${ownerEmail}.`;
    statusEl.textContent =
      msg && msg !== 'Erro ao enviar' ? msg : fallback;
    statusEl.className = 'mt-3 text-sm text-red-700';
    return false;
  }
}