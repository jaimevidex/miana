// Admin Settings - secções por botões + copy de emails.

import { createDb } from '../db';
import { settings as settingsTable } from '../db/schema';
import { htmlEscape, type Env } from '../lib';
import { getGoogleStatus } from '../google-calendar';
import {
  EMAIL_COPY_SETTING_KEYS,
  EMAIL_FLOW_GROUPS,
  getEmailCopy,
  previewTemplateBody,
  settingsEmailEntries,
  settingsPanelId,
  toEditorHtml,
  type EmailTemplateCopy,
  type EmailTemplateId,
} from '../email-copy';
import { emailSignatureHtml } from '../templates/base';
import { siteUrl } from '../config';
import {
  getPaymentDetails,
  getPricing,
  PAYMENT_FALLBACKS,
  PRICING_FALLBACKS,
  type PaymentDetails,
  type Pricing,
} from '../pricing';
import {
  beautyBlock,
  bridalBlock,
  DEMO_FORM,
  diagnosticBlock,
  educationBlock,
  scheduleFormBlock,
  skinCallBlock,
  termsBlock,
} from '../templates/blocks';

const SECTIONS: { id: string; label: string }[] = [
  { id: 'precos', label: 'Preços' },
  { id: 'tempos', label: 'Tempos' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'google', label: 'Google Calendar' },
  { id: 'emails', label: 'Emails' },
];

const EMAIL_HINTS: Record<string, string> = {
  bridal_intro:
    'Campos da lead: {{nome}}, {{data_casamento}}, {{local_preparacao}}, {{hora_pronta}}. Envia o PDF dos serviços de noiva em anexo (placeholder até teres o ficheiro real). Sem tabela de preços.',
  bridal:
    'Campos da lead: {{nome}}, {{data_casamento}}, {{hora_pronta}}, {{local_preparacao}}, {{local_prova}}, {{servicos_procurados}}, {{guests_makeup}}, {{guests_hair}}, {{guests_pack}}, {{addon_skin_call}}. A tabela de preços actualiza-se sozinha.',
  beauty:
    'Campos da lead: {{nome}}, {{data_evento}}, {{hora_pronta_evento}}, {{local_evento}}, {{servicos_procurados_guests}}, {{numero_pessoas}}. A tabela de preços actualiza-se sozinha.',
  skin_call: 'Campos da lead: {{nome}}, {{plano}}. A tabela de preços actualiza-se sozinha.',
  education:
    'Campos da lead: {{nome}}, {{formato}}, {{local_workshop}}, {{data_hora}}, {{tipo}}, {{modalidade}}, {{numero_participantes}}, {{regime}}, {{mensagem}}. A tabela de preços actualiza-se sozinha.',
  terms: 'Campos: {{nome}}, {{titular}}, {{iban}}, {{mbway}}. IBAN e MB Way no bloco vêm da secção Pagamento.',
  schedule: 'Campo: {{nome}}.',
  schedule_form: 'Campos: {{nome}}, {{quando}}. Os botões actualizam-se sozinhos.',
  diagnostic_invite: 'Campo: {{nome}}. O botão actualiza-se sozinho.',
  footer: 'Fundo de todos os emails às clientes.',
};

type EmailPanelId = 'footer' | EmailTemplateId;

function emailSettingsPanels(): { id: EmailPanelId; flow: string; label: string; hint: string }[] {
  return settingsEmailEntries().map((entry) => {
    const id = settingsPanelId(entry.id) as EmailPanelId;
    return {
      id,
      flow: entry.flow,
      label: entry.label,
      hint: EMAIL_HINTS[id] || '',
    };
  });
}

function priceField(id: string, label: string, value: string): string {
  return `
    <div style="flex:1;min-width:140px">
      <label class="lbl" for="${id}">${label}</label>
      <div style="display:flex;align-items:center;gap:4px"><input id="${id}" class="in" type="number" value="${htmlEscape(value)}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
    </div>`;
}

function renderRteField(id: string, label: string, html: string, placeholder: string): string {
  const initial = toEditorHtml(html);
  return `
    <div class="field-group">
      <span class="lbl">${label}</span>
      <div class="rte">
        <div class="rte-toolbar" role="toolbar" aria-label="Formatação">
          <button type="button" class="rte-btn" data-cmd="bold" title="Negrito"><b>B</b></button>
          <button type="button" class="rte-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista">• Lista</button>
          <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
        </div>
        <div class="rte-editor email-rte" contenteditable="true" role="textbox" aria-multiline="true" data-rte-for="${id}" data-placeholder="${htmlEscape(placeholder)}">${initial}</div>
      </div>
      <input type="hidden" id="${id}" value="${htmlEscape(initial)}" />
    </div>`;
}

function demoBlockFor(
  id: EmailTemplateId,
  pricing: Pricing,
  pay: PaymentDetails,
  site: string,
  locale: 'pt' | 'en' = 'pt',
): string {
  switch (id) {
    case 'bridal_intro':
      return '';
    case 'bridal':
      return bridalBlock(DEMO_FORM.bridal, pricing, undefined, locale);
    case 'beauty':
      return beautyBlock(DEMO_FORM.beauty, pricing, undefined, locale);
    case 'skin_call':
      return skinCallBlock(DEMO_FORM.skin_call, pricing, undefined, locale);
    case 'education':
      return educationBlock(DEMO_FORM.education, pricing, undefined, locale);
    case 'terms':
      return termsBlock(pay, locale);
    case 'schedule':
      return '';
    case 'schedule_form':
      return scheduleFormBlock({ meetUrl: '#', formUrl: `${site}/diagnostico` }, locale);
    case 'diagnostic_invite':
      return diagnosticBlock(`${site}/diagnostico`, locale);
  }
}

function emailTemplateFields(
  id: EmailTemplateId,
  fallback: EmailTemplateCopy,
  demoBlock: string,
  locale: 'pt' | 'en' = 'pt',
): string {
  const suffix = locale === 'en' ? '_en' : '';
  const prefix = `email_${id}`;
  const preview = previewTemplateBody(fallback.body, demoBlock);
  return `
    <div class="field-group">
      <label class="lbl" for="${prefix}_subject${suffix}">Assunto</label>
      <input id="${prefix}_subject${suffix}" class="in" value="${htmlEscape(fallback.subject)}" />
    </div>
    ${renderRteField(`${prefix}_body${suffix}`, 'Corpo', preview, 'Corpo do email…')}`;
}

export async function buildSettingsPage(env: Env): Promise<{ content: string; script: string }> {
  const db = createDb(env);
  let settingsMap: Record<string, string> = {};
  try {
    const allSettings = await db.select().from(settingsTable);
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
  } catch {
    // settings table may not exist yet
  }

  const get = (key: string, fallback: string = '') =>
    Object.prototype.hasOwnProperty.call(settingsMap, key) ? settingsMap[key] : fallback;

  const google = await getGoogleStatus(env).catch(() => ({ configured: false, connected: false, email: '' }));
  const googleLine = !google.configured
    ? 'Falta configurar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Worker.'
    : google.connected
      ? `Ligado${google.email ? ` (${htmlEscape(google.email)})` : ''}.`
      : 'Por ligar.';

  const nav = SECTIONS.map((s, i) =>
    `<button type="button" class="filter-btn${i === 0 ? ' active' : ''}" data-section-btn="${s.id}">${s.label}</button>`,
  ).join('');

  const emailPanelsMeta = emailSettingsPanels();
  const firstFlow = EMAIL_FLOW_GROUPS[0].id;
  const flowNav = EMAIL_FLOW_GROUPS.map((g, i) =>
    `<button type="button" class="filter-btn${i === 0 ? ' active' : ''}" data-email-flow-btn="${g.id}">${g.label}</button>`,
  ).join('');
  const stepNav = EMAIL_FLOW_GROUPS.map((g) => {
    const steps = emailPanelsMeta.filter((p) => p.flow === g.id);
    const buttons = steps.map((p, i) =>
      `<button type="button" class="filter-btn${g.id === firstFlow && i === 0 ? ' active' : ''}" data-email-btn="${p.id}">${p.label}</button>`,
    ).join('');
    return `<div class="filters settings-email-steps${g.id === firstFlow ? ' active' : ''}" data-email-steps="${g.id}" role="tablist" aria-label="Templates ${htmlEscape(g.label)}">${buttons}</div>`;
  }).join('');
  const flowHintsJson = JSON.stringify(
    Object.fromEntries(EMAIL_FLOW_GROUPS.map((g) => [g.id, g.hint])),
  );
  const flowFirstPanelJson = JSON.stringify(
    Object.fromEntries(
      EMAIL_FLOW_GROUPS.map((g) => {
        const first = emailPanelsMeta.find((p) => p.flow === g.id);
        return [g.id, first ? first.id : ''];
      }),
    ),
  );

  const emailCopyPt = await getEmailCopy(env, 'pt');
  const emailCopyEn = await getEmailCopy(env, 'en');
  const pricing = await getPricing(env).catch(() => PRICING_FALLBACKS);
  const pay = await getPaymentDetails(env).catch(() => PAYMENT_FALLBACKS);
  const assetBase = siteUrl(env).replace(/\/$/, '');
  const emailPanels = emailPanelsMeta.map((p, i) => {
    const active = i === 0 ? ' active' : '';
    if (p.id === 'footer') {
      return `
        <div class="settings-email-panel${active}" data-email="footer" data-email-flow="${p.flow}">
          <h3>${htmlEscape(p.label)}</h3>
          <p class="settings-hint">${p.hint}</p>
          <div class="sig-preview">${emailSignatureHtml(emailCopyPt.wrapFooter)}</div>
        </div>`;
    }
    return `
        <div class="settings-email-panel${active}" data-email="${p.id}" data-email-flow="${p.flow}">
          <h3>${htmlEscape(p.label)}</h3>
          <p class="settings-hint">${p.hint}</p>
          <div data-email-locale="pt">${emailTemplateFields(p.id, emailCopyPt[p.id], demoBlockFor(p.id, pricing, pay, assetBase, 'pt'), 'pt')}</div>
          <div data-email-locale="en" hidden>${emailTemplateFields(p.id, emailCopyEn[p.id], demoBlockFor(p.id, pricing, pay, assetBase, 'en'), 'en')}</div>
        </div>`;
  }).join('');

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h1>Settings</h1>
    </div>

    <nav class="filters settings-nav" role="tablist" aria-label="Secções">${nav}</nav>

    <form id="settings-form">
      <section class="settings-panel active" data-section="precos">
        <h2>Preços</h2>
        <div class="card">
          <h3>Bridal</h3>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
            ${priceField('price_bridal_hair', 'Hair', get('price_bridal_hair', '250'))}
            ${priceField('price_bridal_makeup', 'Makeup', get('price_bridal_makeup', '250'))}
            ${priceField('price_bridal_pack', 'Pack', get('price_bridal_pack', '475'))}
          </div>

          <h3>Beauty</h3>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
            ${priceField('price_beauty_hair', 'Hair', get('price_beauty_hair', '60'))}
            ${priceField('price_beauty_makeup', 'Makeup', get('price_beauty_makeup', '60'))}
            ${priceField('price_beauty_pack', 'Pack', get('price_beauty_pack', '110'))}
          </div>

          <h3>Skin Call</h3>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
            ${priceField('price_skin_session1', '1 sessão', get('price_skin_session1', '80'))}
            ${priceField('price_skin_session2', '2 sessões', get('price_skin_session2', '150'))}
            ${priceField('price_skin_session3', '3 sessões', get('price_skin_session3', '210'))}
            ${priceField('price_skin_session4', '4 sessões', get('price_skin_session4', '260'))}
          </div>

          <h3>Education</h3>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            ${priceField('price_education_workshop', 'Workshop', get('price_education_workshop', '150'))}
          </div>
        </div>
      </section>

      <section class="settings-panel" data-section="tempos">
        <h2>Tempos</h2>
        <div class="card">
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px">
              <label class="lbl" for="time_setup">Setup (min)</label>
              <input id="time_setup" class="in" type="number" value="${htmlEscape(get('time_setup', '15'))}" />
            </div>
            <div style="flex:1;min-width:140px">
              <label class="lbl" for="time_bridal">Bridal (min)</label>
              <input id="time_bridal" class="in" type="number" value="${htmlEscape(get('time_bridal', '60'))}" />
            </div>
            <div style="flex:1;min-width:140px">
              <label class="lbl" for="time_guest">Guest (min)</label>
              <input id="time_guest" class="in" type="number" value="${htmlEscape(get('time_guest', '45'))}" />
            </div>
          </div>
        </div>
      </section>

      <section class="settings-panel" data-section="contactos">
        <h2>Contactos</h2>
        <div class="card">
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="contact_email">Email</label>
              <input id="contact_email" class="in" type="email" value="${htmlEscape(get('contact_email', 'hello@marianapita.pt'))}" />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="contact_phone">Telefone</label>
              <input id="contact_phone" class="in" value="${htmlEscape(get('contact_phone'))}" />
            </div>
          </div>
          <div style="margin-top:16px">
            <label class="lbl" for="contact_address">Morada</label>
            <input id="contact_address" class="in" value="${htmlEscape(get('contact_address'))}" />
          </div>
        </div>
      </section>

      <section class="settings-panel" data-section="pagamento">
        <h2>Pagamento</h2>
        <div class="card">
          <p class="settings-hint">Usados no email de termos e condições (placeholders até teres os dados reais).</p>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="payment_account_name">Titular</label>
              <input id="payment_account_name" class="in" value="${htmlEscape(get('payment_account_name', '[Titular da conta - substituir]'))}" />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="payment_iban">IBAN</label>
              <input id="payment_iban" class="in" value="${htmlEscape(get('payment_iban', '[IBAN - substituir]'))}" />
            </div>
          </div>
          <div style="margin-top:16px">
            <label class="lbl" for="payment_mbway">MB Way</label>
            <input id="payment_mbway" class="in" value="${htmlEscape(get('payment_mbway', '[MB Way - substituir]'))}" />
          </div>
        </div>
      </section>

      <section class="settings-panel" data-section="google">
        <h2>Google Calendar</h2>
        <div class="card" id="google-card">
          <p class="settings-hint">Necessário para o botão «Marcar e formulário» (cria o Meet na data escolhida).</p>
          <p id="google-status-line">${googleLine}</p>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <a class="btn btn-sm" href="/api/admin/google/connect">Ligar Google Calendar</a>
            <button type="button" class="btn btn-outline btn-sm" id="google-disconnect">Desligar</button>
          </div>
        </div>
      </section>

      <section class="settings-panel" data-section="emails">
        <h2>Emails</h2>
        <p class="settings-hint">Organizados pelo flow de cada formulário. Notificações internas não se editam aqui.</p>
        <nav class="filters" role="tablist" aria-label="Idioma da copy">
          <button type="button" class="filter-btn active" data-email-locale-btn="pt">PT</button>
          <button type="button" class="filter-btn" data-email-locale-btn="en">EN</button>
        </nav>
        <nav class="filters settings-email-flows" role="tablist" aria-label="Flows de email">${flowNav}</nav>
        <p class="settings-hint" id="email-flow-hint">${htmlEscape(EMAIL_FLOW_GROUPS[0].hint)}</p>
        ${stepNav}
        <div class="card">
          ${emailPanels}
        </div>
      </section>

      <div style="margin-top:24px;display:flex;gap:8px">
        <button type="submit" class="btn">Guardar</button>
      </div>
      <p id="settings-status" class="status" role="status" aria-live="polite"></p>
    </form>
  `;

  const emailKeysJson = JSON.stringify(EMAIL_COPY_SETTING_KEYS);

  const script = `
    (function () {
      var sections = ${JSON.stringify(SECTIONS.map((s) => s.id))};
      function showSection(id) {
        if (sections.indexOf(id) === -1) id = 'precos';
        document.querySelectorAll('[data-section]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-section') === id);
        });
        document.querySelectorAll('[data-section-btn]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-section-btn') === id);
        });
        if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
      }
      document.querySelectorAll('[data-section-btn]').forEach(function (btn) {
        btn.addEventListener('click', function () { showSection(btn.getAttribute('data-section-btn')); });
      });
      window.addEventListener('hashchange', function () {
        showSection(location.hash.slice(1));
      });
      var params = new URLSearchParams(location.search);
      var initial = location.hash.slice(1) || (params.has('google') ? 'google' : 'precos');
      showSection(initial);

      var flowHints = ${flowHintsJson};
      var flowFirstPanel = ${flowFirstPanelJson};
      function showEmailFlow(flowId, panelId) {
        document.querySelectorAll('[data-email-flow-btn]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-email-flow-btn') === flowId);
        });
        document.querySelectorAll('[data-email-steps]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-email-steps') === flowId);
        });
        var hint = document.getElementById('email-flow-hint');
        if (hint) hint.textContent = flowHints[flowId] || '';
        showEmail(panelId || flowFirstPanel[flowId]);
      }
      function showEmail(id) {
        if (!id) return;
        document.querySelectorAll('[data-email]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-email') === id);
        });
        document.querySelectorAll('[data-email-btn]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-email-btn') === id);
        });
      }
      document.querySelectorAll('[data-email-flow-btn]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          showEmailFlow(btn.getAttribute('data-email-flow-btn'));
        });
      });
      document.querySelectorAll('[data-email-btn]').forEach(function (btn) {
        btn.addEventListener('click', function () { showEmail(btn.getAttribute('data-email-btn')); });
      });
      function showEmailLocale(locale) {
        document.querySelectorAll('[data-email-locale-btn]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-email-locale-btn') === locale);
        });
        document.querySelectorAll('[data-email-locale]').forEach(function (el) {
          el.hidden = el.getAttribute('data-email-locale') !== locale;
        });
      }
      document.querySelectorAll('[data-email-locale-btn]').forEach(function (btn) {
        btn.addEventListener('click', function () { showEmailLocale(btn.getAttribute('data-email-locale-btn')); });
      });

      document.querySelectorAll('.rte').forEach(function (box) {
        var editor = box.querySelector('.rte-editor');
        if (!editor) return;
        box.querySelectorAll('[data-cmd]').forEach(function (btn) {
          btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
          btn.addEventListener('click', function () {
            editor.focus();
            document.execCommand(btn.getAttribute('data-cmd'), false, null);
          });
        });
      });
    })();

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('settings-status');
      msg.textContent = 'A guardar...';
      msg.className = 'status';

      document.querySelectorAll('[data-rte-for]').forEach(function (ed) {
        var hid = document.getElementById(ed.getAttribute('data-rte-for'));
        if (hid) hid.value = (ed.innerHTML || '').trim();
      });
      document.querySelectorAll('input[id$="_body"], input[id$="_body_en"]').forEach(function (hid) {
        hid.value = hid.value
          .replace(/<!--miana-block-start-->[\\s\\S]*?<!--miana-block-end-->/g, '{{bloco}}')
          .replace(/<div[^>]*data-miana-block="1"[^>]*>[\\s\\S]*?<\\/div>/gi, '{{bloco}}');
      });

      const keys = [
        'price_bridal_hair', 'price_bridal_makeup', 'price_bridal_pack',
        'price_beauty_hair', 'price_beauty_makeup', 'price_beauty_pack',
        'price_skin_session1', 'price_skin_session2', 'price_skin_session3', 'price_skin_session4',
        'price_education_workshop',
        'time_setup', 'time_bridal', 'time_guest',
        'contact_email', 'contact_phone', 'contact_address',
        'payment_iban', 'payment_account_name', 'payment_mbway',
      ].concat(${emailKeysJson});

      const data = {};
      for (const key of keys) {
        const el = document.getElementById(key);
        if (el) data[key] = el.value;
      }

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          msg.textContent = 'Guardado!';
          msg.className = 'status';
        } else {
          msg.textContent = result.error || 'Erro ao guardar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao guardar.';
        msg.className = 'status err';
      }
    });

    (async function googleStatus() {
      const line = document.getElementById('google-status-line');
      if (!line) return;
      try {
        const res = await fetch('/api/admin/google/status', { credentials: 'same-origin' });
        const g = await res.json();
        if (!g.configured) {
          line.textContent = 'Falta configurar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Worker.';
          return;
        }
        if (g.connected) {
          line.textContent = 'Ligado' + (g.email ? ' (' + g.email + ')' : '') + '.';
        } else {
          line.textContent = 'Por ligar.';
        }
      } catch {
        line.textContent = 'Não foi possível verificar o estado do Google.';
      }
    })();

    document.getElementById('google-disconnect').addEventListener('click', async () => {
      if (!confirm('Desligar o Google Calendar?')) return;
      await fetch('/api/admin/google/disconnect', { method: 'POST', credentials: 'same-origin' });
      location.hash = 'google';
      location.reload();
    });
  `;

  return { content, script };
}
