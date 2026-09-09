import {
  commonCountries,
  countryByIso,
  restCountries,
  type DialCountry,
} from './country-dial-codes';

const DEFAULT_ISO = 'PT';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function countryName(country: DialCountry, locale: string): string {
  return locale === 'en' ? country.en : country.pt;
}

function matches(country: DialCountry, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  const qDigits = q.replace(/\D/g, ''); // ignore empty digit-only match
  const dialDigits = country.dial.replace(/\D/g, '');
  return (
    normalize(country.iso).includes(q) ||
    normalize(country.dial).includes(q) ||
    (qDigits.length > 0 && dialDigits.includes(qDigits)) ||
    normalize(country.pt).includes(q) ||
    normalize(country.en).includes(q)
  );
}

function sortByName(a: DialCountry, b: DialCountry, locale: string): number {
  return countryName(a, locale).localeCompare(countryName(b, locale), locale === 'en' ? 'en' : 'pt');
}

function filteredList(query: string, locale: string): { common: DialCountry[]; rest: DialCountry[] } {
  const common = commonCountries().filter((c) => matches(c, query));
  const rest = restCountries()
    .filter((c) => matches(c, query))
    .sort((a, b) => sortByName(a, b, locale));
  return { common, rest };
}

function updateTrigger(wrap: HTMLElement, country: DialCountry): void {
  wrap.dataset.dialIso = country.iso;
  wrap.dataset.dialCode = country.dial;
  const isoEl = wrap.querySelector('[data-dial-iso]');
  const codeEl = wrap.querySelector('[data-dial-code-label]');
  if (isoEl) isoEl.textContent = country.iso;
  if (codeEl) codeEl.textContent = country.dial;
}

export function syncPhoneField(wrap: HTMLElement): string {
  const dial = wrap.dataset.dialCode || '+351';
  const number = wrap.querySelector<HTMLInputElement>('[data-phone-number]');
  const hidden = wrap.querySelector<HTMLInputElement>('[data-phone-hidden]');
  const digits = (number?.value ?? '').replace(/\D/g, '');
  if (number && number.value !== digits) number.value = digits;
  const full = digits ? `${dial}${digits}` : '';
  if (hidden) hidden.value = full;
  return full;
}

export function syncPhoneFields(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-phone-field]').forEach((wrap) => {
    syncPhoneField(wrap);
  });
}

export function resetPhoneField(wrap: HTMLElement): void {
  const country = countryByIso(DEFAULT_ISO);
  if (country) updateTrigger(wrap, country);
  const number = wrap.querySelector<HTMLInputElement>('[data-phone-number]');
  if (number) number.value = '';
  syncPhoneField(wrap);
}

function closePanel(wrap: HTMLElement): void {
  const panel = wrap.querySelector<HTMLElement>('[data-dial-panel]');
  const trigger = wrap.querySelector<HTMLButtonElement>('[data-dial-trigger]');
  if (panel) panel.hidden = true;
  trigger?.setAttribute('aria-expanded', 'false');
}

function renderOptions(wrap: HTMLElement, query: string): void {
  const list = wrap.querySelector<HTMLElement>('[data-dial-list]');
  if (!list) return;
  const locale = wrap.dataset.locale || 'pt';
  const selected = wrap.dataset.dialIso || DEFAULT_ISO;
  const { common, rest } = filteredList(query, locale);
  list.replaceChildren();

  const addOption = (country: DialCountry) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.dataset.iso = country.iso;
    li.setAttribute('aria-selected', country.iso === selected ? 'true' : 'false');
    li.className =
      'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-powder/60 aria-selected:bg-powder';
    li.innerHTML = `<span class="w-8 shrink-0 tracking-wide">${country.iso}</span><span class="font-semibold shrink-0">${country.dial}</span><span class="text-darkbrown/70 truncate">${countryName(country, locale)}</span>`;
    list.appendChild(li);
  };

  common.forEach(addOption);
  if (common.length && rest.length) {
    const divider = document.createElement('li');
    divider.role = 'presentation';
    divider.className = 'border-t border-powder/50 my-1';
    list.appendChild(divider);
  }
  rest.forEach(addOption);
}

function openPanel(wrap: HTMLElement): void {
  const panel = wrap.querySelector<HTMLElement>('[data-dial-panel]');
  const trigger = wrap.querySelector<HTMLButtonElement>('[data-dial-trigger]');
  const search = wrap.querySelector<HTMLInputElement>('[data-dial-search]');
  if (!panel) return;
  panel.hidden = false;
  trigger?.setAttribute('aria-expanded', 'true');
  if (search) {
    search.value = '';
    renderOptions(wrap, '');
    search.focus();
  } else {
    renderOptions(wrap, '');
  }
}

function selectCountry(wrap: HTMLElement, iso: string): void {
  const country = countryByIso(iso);
  if (!country) return;
  updateTrigger(wrap, country);
  syncPhoneField(wrap);
  closePanel(wrap);
  wrap.querySelector<HTMLInputElement>('[data-phone-number]')?.focus();
}

function initOne(wrap: HTMLElement): void {
  if (wrap.dataset.phoneReady === '1') return;
  wrap.dataset.phoneReady = '1';

  const trigger = wrap.querySelector<HTMLButtonElement>('[data-dial-trigger]');
  const panel = wrap.querySelector<HTMLElement>('[data-dial-panel]');
  const search = wrap.querySelector<HTMLInputElement>('[data-dial-search]');
  const list = wrap.querySelector<HTMLElement>('[data-dial-list]');
  const number = wrap.querySelector<HTMLInputElement>('[data-phone-number]');
  const form = wrap.closest('form');

  const initial = countryByIso(wrap.dataset.dialIso || DEFAULT_ISO) ?? countryByIso(DEFAULT_ISO);
  if (initial) updateTrigger(wrap, initial);
  syncPhoneField(wrap);

  trigger?.addEventListener('click', (e) => {
    e.preventDefault();
    if (panel?.hidden) openPanel(wrap);
    else closePanel(wrap);
  });

  search?.addEventListener('input', () => {
    renderOptions(wrap, search.value);
  });

  search?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePanel(wrap);
      trigger?.focus();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = list?.querySelector<HTMLElement>('[data-iso]');
      if (first?.dataset.iso) selectCountry(wrap, first.dataset.iso);
    }
  });

  list?.addEventListener('click', (e) => {
    const option = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
    if (option?.dataset.iso) selectCountry(wrap, option.dataset.iso);
  });

  number?.addEventListener('input', () => {
    const digits = number.value.replace(/\D/g, '');
    if (number.value !== digits) number.value = digits;
    syncPhoneField(wrap);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target as Node)) closePanel(wrap);
  });

  form?.addEventListener('reset', () => {
    queueMicrotask(() => resetPhoneField(wrap));
  });
}

export function initPhoneFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-phone-field]').forEach(initOne);
}
