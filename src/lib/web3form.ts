// Utilitário de formulários Web3Forms (https://web3forms.com) — partilhado por todos os formulários.
// A key real é definida pelo utilizador em .env como PUBLIC_WEB3FORMS_KEY (ver .env.example).

export const SUCCESS_MESSAGE =
  'Obrigada! O teu pedido foi registado. Responderei assim que possível, num prazo de até 48h com todas as informações.';

export function getAccessKey(): string {
  const key = import.meta.env.PUBLIC_WEB3FORMS_KEY;
  if (key && key !== 'COLOCAR_ACCESS_KEY_AQUI') {
    return key;
  }
  return 'COLOCAR_ACCESS_KEY_AQUI';
}

/**
 * Envia o formulário para o Web3Forms e atualiza o elemento de estado.
 * Devolve true em caso de sucesso.
 */
export async function submitWeb3Form(
  form: HTMLFormElement,
  statusEl: HTMLElement | null
): Promise<boolean> {
  if (!statusEl) return false;

  statusEl.textContent = 'A enviar...';
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
      statusEl.textContent = SUCCESS_MESSAGE;
      statusEl.className = 'mt-3 text-sm font-medium text-burgundy';
      form.reset();
      return true;
    }
    throw new Error(result.message || 'Erro ao enviar');
  } catch (err) {
    statusEl.textContent =
      'Algo correu mal. Tenta novamente ou escreve para mpitamakeup@gmail.com.';
    statusEl.className = 'mt-3 text-sm text-red-700';
    return false;
  }
}