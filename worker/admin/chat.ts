// Chat de email na dashboard admin (SSR HTML + JS).

import { escapeHtml, sanitizeEmailHtml } from '../email-sanitize';
import type { MessageWithAttachments } from '../conversation';

export const CHAT_CSS = `
.chat-panel{display:flex;flex-direction:column;min-height:420px}
.chat-thread{display:flex;flex-direction:column;gap:12px;max-height:480px;overflow-y:auto;padding:8px 4px 16px}
.chat-empty{color:#8a7a74;font-size:14px;text-align:center;padding:32px 12px}
.chat-bubble{max-width:86%;padding:12px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}
.chat-bubble.out{align-self:flex-end;background:rgba(138,40,49,.1);color:#3b2a2a;border-bottom-right-radius:4px}
.chat-bubble.in{align-self:flex-start;background:rgba(138,40,49,.1);color:#3b2a2a;border-bottom-left-radius:4px}
.chat-meta{font-size:11px;opacity:.75;margin-bottom:6px}
.chat-bubble.out .chat-html a{color:#8a2831;text-decoration:underline}
.chat-bubble.in .chat-html a{color:#8a2831}
.chat-html p{margin:0 0 8px}
.chat-html p:last-child{margin:0}
.chat-atts{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
.chat-atts a{font-size:12px;color:inherit;opacity:.9}
.unread-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#8a2831;margin-left:6px;vertical-align:middle}
.chat-composer .rte-editor{min-height:160px;max-height:36vh}
.rte-tpl{font-size:12px;font-weight:600}
.lang-toggle{display:inline-flex;align-items:center;gap:2px;margin-right:6px}
.lang-toggle button{font-size:11px;font-weight:700;letter-spacing:.04em;padding:4px 8px;border:1px solid #e5ded7;background:#fff;color:#8a7a74;border-radius:8px;cursor:pointer}
.lang-toggle button.active{background:#8a2831;color:#fbf5ef;border-color:#8a2831}
`;

function formatChatDate(ts: number): string {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderBubble(m: MessageWithAttachments): string {
  const side = m.direction === 'outbound' ? 'out' : 'in';
  const who = m.direction === 'outbound' ? 'Tu' : escapeHtml(m.fromAddress);
  const html = m.direction === 'inbound' ? sanitizeEmailHtml(m.html || '') : (m.html || '');
  const body = html || `<p>${escapeHtml(m.text || '')}</p>`;
  const atts = (m.attachments || []).map((a) => {
    const href = `/api/admin/email-attachment?key=${encodeURIComponent(a.r2Key)}`;
    return `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(a.filename)}</a>`;
  }).join('');
  return `
    <div class="chat-bubble ${side}" data-id="${escapeHtml(m.id)}">
      <div class="chat-meta">${who} · ${formatChatDate(m.sentAt)}${m.subject ? ` · ${escapeHtml(m.subject)}` : ''}</div>
      <div class="chat-html">${body}</div>
      ${atts ? `<div class="chat-atts">${atts}</div>` : ''}
    </div>`;
}

export function renderChatPanel(opts: {
  conversationId: string;
  messages: MessageWithAttachments[];
  canCompose: boolean;
  recipientEmail: string;
  leadId?: string | null;
  clientId?: string | null;
  leadType: string;
  continueOnClientId?: string | null;
  googleConnected: boolean;
  showBookingTemplates?: boolean;
  locale?: string;
}): string {
  const emptyHint = opts.leadType === 'bridal'
    ? 'Ainda não há emails nesta conversa. Envia o introdutório para começar.'
    : 'Ainda não há emails nesta conversa. Envia o orçamento para começar.';
  const bubbles = opts.messages.length
    ? opts.messages.map(renderBubble).join('')
    : `<p class="chat-empty">${emptyHint}</p>`;

  const continueNote = opts.continueOnClientId
    ? `<p style="color:#8a7a74;font-size:13px;margin-bottom:12px">Lead aceite - continua o chat na <a href="/admin/client/${opts.continueOnClientId}">página do cliente</a>.</p>`
    : '';

  const isSkin = opts.leadType === 'skin-call' && !!opts.showBookingTemplates;
  const isBridal = opts.leadType === 'bridal';
  const locale = opts.locale === 'en' ? 'en' : 'pt';
  const composer = opts.canCompose ? `
    <div class="chat-composer" style="margin-top:16px">
      <label class="lbl" for="chat-subject">Assunto</label>
      <input id="chat-subject" class="in" style="margin-bottom:12px" placeholder="Assunto do email" />
      <div class="rte">
        <div class="rte-toolbar" role="toolbar" aria-label="Formatação e templates">
          <button type="button" class="rte-btn" data-cmd="bold" title="Negrito"><b>B</b></button>
          <button type="button" class="rte-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Lista">• Lista</button>
          <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>
          <span class="rte-sep"></span>
          <span class="lang-toggle" role="group" aria-label="Idioma do template">
            <button type="button" id="tpl-lang-pt" class="${locale === 'pt' ? 'active' : ''}" data-tpl-lang="pt">PT</button>
            <button type="button" id="tpl-lang-en" class="${locale === 'en' ? 'active' : ''}" data-tpl-lang="en">EN</button>
          </span>
          ${isBridal ? '<button type="button" class="rte-btn rte-tpl" id="tpl-bridal-intro" title="Inserir introdutório">Introdutório</button>' : ''}
          <button type="button" class="rte-btn rte-tpl" id="tpl-quote" title="Inserir orçamento">Orçamento</button>
          <button type="button" class="rte-btn rte-tpl" id="tpl-terms" title="Inserir termos e pagamento">Termos e condições</button>
          ${isSkin ? `<button type="button" class="rte-btn rte-tpl" id="tpl-schedule" title="Pedir datas">Marcar sessões</button>
          <button type="button" class="rte-btn rte-tpl" id="tpl-schedule-form" title="Meet + formulário">Marcar e formulário</button>` : ''}
        </div>
        <div id="chat-body-editor" class="rte-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Escreve a mensagem…"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn" id="chat-send">Enviar</button>
        <span id="chat-status" class="status" role="status"></span>
      </div>
      <p style="color:#8a7a74;font-size:12px;margin-top:8px">Para ${escapeHtml(opts.recipientEmail)}</p>
    </div>
    <div id="meet-modal" class="modal-overlay">
      <div class="modal" style="max-width:420px">
        <button class="close" onclick="document.getElementById('meet-modal').classList.remove('active')">&times;</button>
        <h2>Marcar e formulário</h2>
        <p style="color:#8a7a74;font-size:14px;margin-bottom:16px">Escolhe a data e hora (Lisboa). O Google Calendar cria o Meet e o email inclui o link do diagnóstico.</p>
        ${opts.googleConnected ? '' : '<p class="status err">Liga o Google Calendar em Settings antes de marcar.</p>'}
        <label class="lbl" for="meet-datetime">Data e hora</label>
        <input id="meet-datetime" class="in" type="datetime-local" />
        <div style="display:flex;gap:8px;margin-top:16px">
          <button type="button" class="btn" id="meet-generate" ${opts.googleConnected ? '' : 'disabled'}>Inserir no email</button>
          <button type="button" class="btn btn-outline" onclick="document.getElementById('meet-modal').classList.remove('active')">Cancelar</button>
        </div>
        <p id="meet-status" class="status"></p>
      </div>
    </div>
  ` : '';

  return `
    <h2>Conversa</h2>
    <div class="card chat-panel" data-conversation-id="${escapeHtml(opts.conversationId)}" data-lead-id="${escapeHtml(opts.leadId || '')}" data-client-id="${escapeHtml(opts.clientId || '')}" data-locale="${locale}">
      ${continueNote}
      <div id="chat-thread" class="chat-thread">${bubbles}</div>
      ${composer}
    </div>
  `;
}

export function chatScript(): string {
  return `
    (function(){
      const panel = document.querySelector('.chat-panel');
      if (!panel) return;
      const convId = panel.getAttribute('data-conversation-id');
      const leadId = panel.getAttribute('data-lead-id');
      const clientId = panel.getAttribute('data-client-id');
      const thread = document.getElementById('chat-thread');
      const editor = document.getElementById('chat-body-editor');
      const subjectEl = document.getElementById('chat-subject');
      let pendingKind = 'free';
      let attachTerms = false;
      let tplLocale = panel.getAttribute('data-locale') || 'pt';

      fetch('/api/admin/conversation/' + convId + '/read', { method: 'POST', credentials: 'same-origin' }).catch(function(){});

      function scrollChat() {
        if (thread) thread.scrollTop = thread.scrollHeight;
      }
      scrollChat();

      function qs() {
        const p = new URLSearchParams();
        if (leadId) p.set('leadId', leadId);
        if (clientId) p.set('clientId', clientId);
        p.set('locale', tplLocale);
        const s = p.toString();
        return s ? '?' + s : '';
      }

      function setTplLocale(next) {
        tplLocale = next === 'en' ? 'en' : 'pt';
        panel.querySelectorAll('[data-tpl-lang]').forEach(function(btn){
          btn.classList.toggle('active', btn.getAttribute('data-tpl-lang') === tplLocale);
        });
      }
      panel.querySelectorAll('[data-tpl-lang]').forEach(function(btn){
        btn.addEventListener('click', function(){ setTplLocale(btn.getAttribute('data-tpl-lang')); });
      });

      function setBody(html) {
        if (!editor) return;
        editor.innerHTML = html;
      }

      if (editor) {
        const toolbar = panel.querySelector('.rte-toolbar');
        toolbar && toolbar.querySelectorAll('[data-cmd]').forEach(function(btn){
          btn.addEventListener('mousedown', function(e){ e.preventDefault(); });
          btn.addEventListener('click', function(){
            editor.focus();
            document.execCommand(btn.getAttribute('data-cmd'), false, null);
          });
        });
      }

      async function loadTpl(path, kind, extra) {
        const msg = document.getElementById('chat-status');
        if (msg) { msg.textContent = 'A carregar template...'; msg.className = 'status'; }
        try {
          const res = await fetch(path, { credentials: 'same-origin' });
          const data = await res.json();
          if (!data.success) {
            if (msg) { msg.textContent = data.error || 'Erro no template.'; msg.className = 'status err'; }
            return;
          }
          if (subjectEl) subjectEl.value = data.subject || '';
          setBody(data.html || '');
          pendingKind = kind;
          attachTerms = !!(extra && extra.attachTerms) || !!data.attachTermsPdf;
          if (msg) { msg.textContent = 'Template inserido - podes editar antes de enviar.'; msg.className = 'status'; }
        } catch (e) {
          if (msg) { msg.textContent = 'Erro no template.'; msg.className = 'status err'; }
        }
      }

      const introBtn = document.getElementById('tpl-bridal-intro');
      if (introBtn) introBtn.addEventListener('click', function(){ loadTpl('/api/admin/templates/bridal-intro' + qs(), 'bridal_intro'); });
      const qBtn = document.getElementById('tpl-quote');
      if (qBtn) qBtn.addEventListener('click', function(){ loadTpl('/api/admin/templates/quote' + qs(), 'quote'); });
      const tBtn = document.getElementById('tpl-terms');
      if (tBtn) tBtn.addEventListener('click', function(){ loadTpl('/api/admin/templates/terms' + qs(), 'terms', { attachTerms: true }); });
      const sBtn = document.getElementById('tpl-schedule');
      if (sBtn) sBtn.addEventListener('click', function(){ loadTpl('/api/admin/templates/schedule' + qs(), 'schedule'); });
      const sfBtn = document.getElementById('tpl-schedule-form');
      if (sfBtn) sfBtn.addEventListener('click', function(){
        document.getElementById('meet-modal').classList.add('active');
      });

      const meetGen = document.getElementById('meet-generate');
      if (meetGen) meetGen.addEventListener('click', async function(){
        const st = document.getElementById('meet-status');
        const dt = document.getElementById('meet-datetime');
        if (!dt.value) {
          st.textContent = 'Escolhe a data e hora.';
          st.className = 'status err';
          return;
        }
        st.textContent = 'A criar Meet...';
        st.className = 'status';
        try {
          const res = await fetch('/api/admin/conversation/' + convId + '/schedule-form', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startsAt: new Date(dt.value).toISOString(), locale: tplLocale }),
          });
          const data = await res.json();
          if (!data.success) {
            st.textContent = data.error || 'Erro ao criar Meet.';
            st.className = 'status err';
            return;
          }
          if (subjectEl) subjectEl.value = data.subject || '';
          setBody(data.html || '');
          pendingKind = 'schedule_form';
          attachTerms = false;
          document.getElementById('meet-modal').classList.remove('active');
          const msg = document.getElementById('chat-status');
          if (msg) { msg.textContent = 'Template com Meet inserido - envia quando estiveres pronta.'; msg.className = 'status'; }
        } catch (e) {
          st.textContent = 'Erro ao criar Meet.';
          st.className = 'status err';
        }
      });

      const sendBtn = document.getElementById('chat-send');
      if (sendBtn) sendBtn.addEventListener('click', async function(){
        const msg = document.getElementById('chat-status');
        const html = (editor && editor.innerHTML || '').trim();
        const subject = (subjectEl && subjectEl.value || '').trim();
        if (!subject || !html) {
          msg.textContent = 'Assunto e corpo são obrigatórios.';
          msg.className = 'status err';
          return;
        }
        msg.textContent = 'A enviar...';
        msg.className = 'status';
        try {
          const res = await fetch('/api/admin/conversation/' + convId + '/messages', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, html, templateKind: pendingKind, attachTermsPdf: attachTerms }),
          });
          const data = await res.json();
          if (data.success) {
            msg.textContent = 'Enviado!';
            pendingKind = 'free';
            attachTerms = false;
            setTimeout(function(){ location.reload(); }, 600);
          } else {
            msg.textContent = data.error || 'Erro ao enviar.';
            msg.className = 'status err';
          }
        } catch (e) {
          msg.textContent = 'Erro ao enviar.';
          msg.className = 'status err';
        }
      });

      let lastCount = thread ? thread.querySelectorAll('.chat-bubble').length : 0;
      setInterval(async function(){
        try {
          const res = await fetch('/api/admin/conversation/' + convId, { credentials: 'same-origin' });
          const data = await res.json();
          if (!data.success || !data.messages) return;
          if (data.messages.length === lastCount) return;
          lastCount = data.messages.length;
          location.reload();
        } catch (e) {}
      }, 10000);
    })();
  `;
}
