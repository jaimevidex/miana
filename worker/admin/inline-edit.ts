// Edição in-place nos cards admin (SSR HTML + JS).

import { FIELD_LABELS, htmlEscape } from '../lib';

export const INLINE_EDIT_CSS = `
.editable-card{margin-top:28px}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}
.card-head h2{margin:0;border:0;padding:0;font-size:20px}
.card-head-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;padding:8px;cursor:pointer;color:#8a2831;border-radius:10px;line-height:0}
.icon-btn:hover{background:rgba(138,40,49,.08)}
.icon-btn:focus-visible{outline:2px solid #8a2831;outline-offset:2px}
.editable-card .field-edit{display:none}
.editable-card.is-editing .field-group.is-editable .field-value{display:none}
.editable-card.is-editing .field-group.is-editable .field-edit{display:block}
.editable-card .btn-save,.editable-card .btn-cancel{display:none}
.editable-card.is-editing .btn-pencil{display:none}
.editable-card.is-editing .btn-save,.editable-card.is-editing .btn-cancel{display:inline-block}
textarea.field-edit{min-height:80px}
`;

type FieldKind = 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'datetime-local' | 'textarea' | 'select';

export type SaveKind = 'personal' | 'form-lead' | 'form-client';

export interface EditableField {
  key: string;
  value: string;
  label?: string;
  kind?: FieldKind;
  readOnlyHtml?: string;
  required?: boolean;
}

const EXTRA_LABELS: Record<string, string> = {
  subject: 'Assunto',
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  locale: 'Idioma',
};

type SelectOption = string | { value: string; label: string };

const SELECT_OPTIONS: Record<string, SelectOption[]> = {
  formato: ['Automaquilhagem', 'Skincare Education', 'Friends & Bachelorette Parties'],
  tipo: ['Empresa', 'Particular'],
  modalidade: ['Makeup', 'Skincare'],
  regime: ['Masterclass', 'Hands-on'],
  locale: [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
  ],
  servicos_procurados: [
    { value: '', label: '-' },
    'Makeup',
    'Hair',
    { value: 'Pack Makeup & Hair', label: 'Pack Makeup & Hair' },
  ],
  addon_skin_call: [
    { value: '', label: '-' },
    { value: 'One Time Call (Plano 3M)', label: 'One Time Call - Plano 3M' },
    { value: 'Duo Call (Plano 6M)', label: 'Duo Call - Plano 6M' },
    { value: 'Triple Call (Plano 9M)', label: 'Triple Call - Plano 9M' },
    { value: 'Full Year Call (Plano 12M)', label: 'Full Year Call - Plano 12M' },
  ],
};

function optionValue(opt: SelectOption): string {
  return typeof opt === 'string' ? opt : opt.value;
}

function optionLabel(opt: SelectOption): string {
  return typeof opt === 'string' ? opt : opt.label;
}

const BRIDAL_ONLY = [
  'data_casamento', 'hora_pronta', 'local_preparacao', 'local_prova',
  'servicos_procurados', 'guests_makeup', 'guests_hair', 'guests_pack', 'numero_guests',
  'addon_skin_call',
];

export const BRIDAL_PROFILE_KEYS = [
  'servicos_procurados',
  'guests_makeup',
  'guests_hair',
  'guests_pack',
  'addon_skin_call',
] as const;

const BEAUTY_ONLY = ['data_evento', 'hora_pronta_evento', 'local_evento', 'numero_pessoas'];

const SKIP_FORM_KEYS = new Set(['botcheck', 'form_type', 'nome', 'telefone', 'email', 'locale']);

const PENCIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

export function fieldLabel(key: string): string {
  return EXTRA_LABELS[key] || FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fieldKind(key: string, explicit?: FieldKind): FieldKind {
  if (explicit) return explicit;
  if (SELECT_OPTIONS[key]) return 'select';
  if (key === 'data_hora') return 'datetime-local';
  if (key.startsWith('data_')) return 'date';
  if (key.startsWith('hora_')) return 'time';
  if (key.startsWith('numero_') || key.startsWith('guests_')) return 'number';
  if (key === 'mensagem' || key === 'rotina') return 'textarea';
  if (key === 'email') return 'email';
  if (key === 'telefone') return 'tel';
  return 'text';
}

export function formatDatePt(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatDateTimePt(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

export function formatFieldDisplay(key: string, raw: string, kind?: FieldKind): string {
  if (!raw) return '-';
  const resolved = fieldKind(key, kind);
  if (resolved === 'datetime-local') return formatDateTimePt(raw);
  if (resolved === 'date') return formatDatePt(raw);
  if (key === 'locale') return raw === 'en' ? 'English' : 'Português';
  return raw;
}

function inputValue(kind: FieldKind, raw: string): string {
  if (kind === 'datetime-local') {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return m ? m[1] : raw;
  }
  return raw;
}

function toEntries(data: Record<string, unknown>, allowKey: (key: string) => boolean): [string, string][] {
  return Object.entries(data)
    .filter(([key]) => !SKIP_FORM_KEYS.has(key) && allowKey(key))
    .map(([key, value]) => [key, value == null || value === '' ? '' : String(value)]);
}

function withBridalProfileKeys(entries: [string, string][]): [string, string][] {
  const values = new Map(entries);
  const rest = entries.filter(([key]) => !BRIDAL_PROFILE_KEYS.includes(key as typeof BRIDAL_PROFILE_KEYS[number]));
  const profile = BRIDAL_PROFILE_KEYS.map((key) => [key, values.get(key) ?? ''] as [string, string]);
  return [...rest, ...profile];
}

export function visibleFormEntries(type: string, data: Record<string, unknown>): [string, string][] {
  const entries = toEntries(data, (key) => {
    if (type === 'bridal') return !BEAUTY_ONLY.includes(key);
    if (type === 'beauty') return !BRIDAL_ONLY.includes(key);
    return true;
  });
  if (type === 'bridal') return withBridalProfileKeys(entries);
  return entries;
}

function renderEditControl(field: EditableField, kind: FieldKind): string {
  const name = htmlEscape(field.key);
  const value = htmlEscape(inputValue(kind, field.value));
  const req = field.required ? ' required' : '';

  if (kind === 'textarea') {
    return `<textarea class="in field-edit" name="${name}"${req}>${value}</textarea>`;
  }

  if (kind === 'select') {
    const options = [...(SELECT_OPTIONS[field.key] || [])];
    if (field.value && !options.some((opt) => optionValue(opt) === field.value)) {
      options.unshift(field.value);
    }
    const opts = options.map((opt) => {
      const value = optionValue(opt);
      const selected = value === field.value ? ' selected' : '';
      return `<option value="${htmlEscape(value)}"${selected}>${htmlEscape(optionLabel(opt))}</option>`;
    }).join('');
    return `<select class="in field-edit" name="${name}"${req}>${opts}</select>`;
  }

  return `<input class="in field-edit" type="${kind}" name="${name}" value="${value}"${req} />`;
}

function renderField(field: EditableField): string {
  const label = htmlEscape(field.label || fieldLabel(field.key));
  if (field.readOnlyHtml) {
    return `
      <div class="field-group">
        <div class="field-label">${label}</div>
        <div class="field-value">${field.readOnlyHtml}</div>
      </div>`;
  }

  const kind = fieldKind(field.key, field.kind);
  const display = htmlEscape(formatFieldDisplay(field.key, field.value, kind));
  return `
    <div class="field-group is-editable">
      <div class="field-label">${label}</div>
      <div class="field-value">${display}</div>
      ${renderEditControl(field, kind)}
    </div>`;
}

export function renderEditableCard(opts: {
  id: string;
  title: string;
  fields: EditableField[];
  editable: boolean;
  saveUrl: string;
  saveKind: SaveKind;
  originalJson?: Record<string, unknown>;
  emptyText?: string;
}): string {
  const fieldsHtml = opts.fields.length
    ? opts.fields.map(renderField).join('')
    : `<p style="color:#8a7a74">${htmlEscape(opts.emptyText || 'Sem dados.')}</p>`;

  const canEdit = opts.editable && opts.fields.some((f) => !f.readOnlyHtml);
  const actions = canEdit ? `
    <div class="card-head-actions">
      <button type="button" class="icon-btn btn-pencil" aria-label="Editar" title="Editar">${PENCIL_SVG}</button>
      <button type="button" class="btn btn-sm btn-save">Guardar</button>
      <button type="button" class="btn btn-outline btn-sm btn-cancel">Cancelar</button>
    </div>` : '';

  const original = htmlEscape(JSON.stringify(opts.originalJson || {}));

  return `
    <div class="card editable-card" id="${htmlEscape(opts.id)}"
      data-save-url="${htmlEscape(opts.saveUrl)}"
      data-save-kind="${htmlEscape(opts.saveKind)}"
      data-original-json="${original}">
      <div class="card-head">
        <h2>${htmlEscape(opts.title)}</h2>
        ${actions}
      </div>
      ${fieldsHtml}
      <p class="status card-msg" role="status" aria-live="polite"></p>
    </div>`;
}

export function inlineEditScript(): string {
  return `
    document.querySelectorAll('.editable-card').forEach(function(card) {
      var pencil = card.querySelector('.btn-pencil');
      var saveBtn = card.querySelector('.btn-save');
      var cancelBtn = card.querySelector('.btn-cancel');
      var msg = card.querySelector('.card-msg');
      if (!pencil || !saveBtn) return;

      function inputs() {
        return card.querySelectorAll('.field-edit');
      }
      function snapshot() {
        inputs().forEach(function(el) { el.dataset.original = el.value; });
      }
      function restore() {
        inputs().forEach(function(el) { el.value = el.dataset.original || ''; });
      }
      function setMsg(text, err) {
        if (!msg) return;
        msg.textContent = text;
        msg.className = err ? 'status card-msg err' : 'status card-msg';
      }
      function collectFields() {
        var out = {};
        inputs().forEach(function(el) { out[el.name] = el.value; });
        return out;
      }
      function buildBody() {
        var kind = card.getAttribute('data-save-kind');
        var fields = collectFields();
        if (kind === 'personal') return fields;
        var original = {};
        try { original = JSON.parse(card.getAttribute('data-original-json') || '{}'); } catch (e) {}
        var merged = Object.assign({}, original, fields);
        if (kind === 'form-lead') return { formData: merged };
        if (kind === 'form-client') return { data: merged };
        return fields;
      }

      pencil.addEventListener('click', function() {
        snapshot();
        card.classList.add('is-editing');
        setMsg('');
      });
      cancelBtn && cancelBtn.addEventListener('click', function() {
        restore();
        card.classList.remove('is-editing');
        setMsg('');
      });
      saveBtn.addEventListener('click', async function() {
        var invalid = card.querySelector('.field-edit:invalid');
        if (invalid) {
          invalid.reportValidity();
          return;
        }
        setMsg('A guardar...');
        try {
          var res = await fetch(card.getAttribute('data-save-url'), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildBody()),
          });
          var data = await res.json();
          if (data.success) {
            setMsg('Guardado!');
            setTimeout(function() { location.reload(); }, 400);
          } else {
            setMsg(data.error || 'Erro ao guardar.', true);
          }
        } catch (e) {
          setMsg('Erro ao guardar.', true);
        }
      });
    });
  `;
}
