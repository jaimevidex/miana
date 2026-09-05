// Dashboard admin - renderização HTML server-side.
// Cores da marca: burgundy #8a2831, offwhite #fbf5ef, fundo #f6f0ea.

import { eq, desc, like, and, or, gte, lte, sql } from 'drizzle-orm';
import { createDb } from './db';
import { leads as leadsTable, diagnostics as diagnosticsTable, clients as clientsTable, settings as settingsTable } from './db/schema';
import type { Env, LeadType } from './lib';
import { TYPE_LABELS } from './lib';
import { calculateDuration, formatDuration, suggestTimeRange, suggestBridalDualSchedule } from './scheduling';
import { getTiming } from './pricing';
import { photoAdminUrl } from './photos';
import { CHAT_CSS, renderChatPanel, chatScript } from './admin/chat';
import {
  getOrCreateConversationForLead,
  getOrCreateConversationForClient,
  listMessages,
  unreadByLeadIds,
  unreadByClientIds,
} from './conversation';
import { getGoogleStatus } from './google-calendar';

// ─── CSS partilhado ─────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f6f0ea;color:#3b2a2a;line-height:1.6}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px 48px}
.card{background:#fff;border:1px solid rgba(59,42,42,.08);border-radius:16px;padding:32px 28px;box-shadow:0 12px 40px rgba(59,42,42,.06)}
h1{font-size:26px;margin:0 0 8px;color:#8a2831}
h2{font-size:20px;margin:28px 0 12px;color:#8a2831;border-bottom:1px solid #e5ded7;padding-bottom:8px}
h3{font-size:16px;color:#8a2831;margin:20px 0 8px}
.lbl{display:block;font-size:14px;font-weight:600;color:#3b2a2a;margin-bottom:2px}
.req{color:#8a2831}
.in{border:1.5px solid #e5ded7;border-radius:12px;padding:14px 16px;font-size:15px;width:100%;background:#fff;transition:border-color .15s,box-shadow .15s;color:#3b2a2a}
.in:focus{border-color:#8a2831;box-shadow:0 0 0 4px rgba(138,40,49,.10);outline:none}
textarea.in{min-height:200px;resize:vertical;font-family:inherit}
.btn{display:inline-block;background:#8a2831;color:#fbf5ef;padding:14px 28px;font-size:15px;font-weight:600;border:0;border-radius:999px;cursor:pointer;transition:background .15s;text-decoration:none}
.btn:hover{background:#6f2027}
.btn-sm{padding:8px 16px;font-size:13px}
.btn-outline{background:transparent;color:#8a2831;border:1.5px solid #8a2831}
.btn-outline:hover{background:#8a2831;color:#fbf5ef}
.btn-danger{background:#b3261e}
.btn-danger:hover{background:#911d17}
.btn-success{background:#2e7d32}
.btn-success:hover{background:#1b5e20}
.status{margin-top:12px;font-size:13px}
.status.err{color:#b3261e}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;padding:10px 12px;border-bottom:2px solid #e5ded7;color:#8a7a74;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
td{padding:10px 12px;border-bottom:1px solid #f0ebe6}
tr:hover{background:#faf7f4}
tr.lead-row-aceite td{background:rgba(46,125,50,.08)}
tr.lead-row-aceite:hover td{background:rgba(46,125,50,.14)}
tr.lead-row-eliminado td{background:rgba(183,28,28,.08)}
tr.lead-row-eliminado:hover td{background:rgba(183,28,28,.14)}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.badge-skin-call{background:#e8f5e9;color:#2e7d32}
.badge-bridal{background:#fce4ec;color:#c62828}
.badge-beauty{background:#fff3e0;color:#e65100}
.badge-education{background:#e3f2fd;color:#1565c0}
.badge-novo{background:#e8f5e9;color:#2e7d32}
.badge-pendente{background:#fff3e0;color:#e65100}
.badge-aceite{background:#e3f2fd;color:#1565c0}
.badge-eliminado{background:#ffebee;color:#b71c1c}
.field-group{margin-bottom:16px}
.field-label{font-size:12px;color:#8a7a74;font-weight:600;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}
.field-value{font-size:15px;color:#3b2a2a}
.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
.photo-grid img{width:100%;border-radius:8px;border:1px solid #e5ded7}
.back-link{display:inline-block;color:#8a2831;text-decoration:none;font-size:14px;margin-bottom:16px}
.back-link:hover{text-decoration:underline}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.filter-btn{padding:6px 14px;border-radius:999px;font-size:13px;border:1.5px solid #e5ded7;background:#fff;color:#3b2a2a;cursor:pointer;text-decoration:none}
.filter-btn:hover,.filter-btn.active{background:#8a2831;color:#fbf5ef;border-color:#8a2831}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
.modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100;justify-content:center;align-items:center}
.modal-overlay.active{display:flex}
.modal{background:#fff;border-radius:16px;padding:32px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto}
.modal h2{margin-top:0}
.modal .close{float:right;background:none;border:none;font-size:24px;cursor:pointer;color:#8a7a74}
/* Navbar */
.navbar{background:#8a2831;color:#fbf5ef;padding:0 16px;display:flex;align-items:center;gap:0;height:56px;margin-bottom:24px;border-radius:0 0 16px 16px}
.navbar-brand{font-weight:700;font-size:16px;color:#fbf5ef;text-decoration:none;padding:0 16px 0 0;border-right:1px solid rgba(255,255,255,.2)}
.navbar-links{display:flex;gap:0;margin-left:16px}
.navbar-links a{color:rgba(255,255,255,.7);text-decoration:none;padding:8px 16px;font-size:14px;font-weight:500;border-radius:8px;transition:all .15s}
.navbar-links a:hover,.navbar-links a.active{color:#fbf5ef;background:rgba(255,255,255,.15)}
.navbar-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.navbar-right .btn-logout{background:transparent;border:1.5px solid rgba(255,255,255,.3);color:#fbf5ef;padding:6px 14px;font-size:13px;border-radius:999px;cursor:pointer;text-decoration:none}
.navbar-right .btn-logout:hover{background:rgba(255,255,255,.15)}
/* Rich text editor (quote email body) */
.rte{border:1.5px solid #e5ded7;border-radius:12px;overflow:hidden;background:#fff}
.rte:focus-within{border-color:#8a2831;box-shadow:0 0 0 4px rgba(138,40,49,.10)}
.rte-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:8px 10px;background:#faf7f4;border-bottom:1px solid #e5ded7}
.rte-btn{min-width:34px;height:34px;padding:0 8px;border:1px solid transparent;border-radius:8px;background:transparent;color:#3b2a2a;font-size:14px;font-weight:600;cursor:pointer;line-height:1}
.rte-btn:hover,.rte-btn.active{background:#fff;border-color:#e5ded7}
.rte-btn:focus-visible{outline:2px solid #8a2831;outline-offset:1px}
.rte-sep{width:1px;height:22px;background:#e5ded7;margin:0 4px}
.rte-select{height:34px;border:1px solid #e5ded7;border-radius:8px;background:#fff;color:#3b2a2a;font-size:13px;padding:0 8px;cursor:pointer}
.rte-editor{min-height:280px;max-height:50vh;overflow-y:auto;padding:16px 18px;font-size:15px;line-height:1.6;color:#3b2a2a;outline:none}
.rte-editor:empty:before{content:attr(data-placeholder);color:#b4a8a1;pointer-events:none}
.rte-editor ul,.rte-editor ol{padding-left:1.4em;margin:8px 0}
.rte-editor li{margin:2px 0}
.rte-editor blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #e5ded7;color:#5c4a4a}
${CHAT_CSS}
`;

// ─── Status labels ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  pendente: 'Pendente',
  aceite: 'Aceite',
  eliminado: 'Eliminado',
};

function formatDate(d: Date | number): string {
  const date = new Date(d);
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function navbar(active: string): string {
  const links = [
    { href: '/admin', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/leads', label: 'Leads', key: 'leads' },
    { href: '/admin/clients', label: 'Clientes', key: 'clients' },
    { href: '/admin/settings', label: 'Settings', key: 'settings' },
  ];
  const linksHtml = links.map(l => {
    const cls = l.key === active ? 'active' : '';
    return `<a href="${l.href}" class="${cls}">${l.label}</a>`;
  }).join('');

  return `
    <nav class="navbar">
      <a href="/admin" class="navbar-brand">Miana Admin</a>
      <div class="navbar-links">${linksHtml}</div>
      <div class="navbar-right">
        <a href="/" target="_blank" style="color:rgba(255,255,255,.7);text-decoration:none;font-size:13px">Ver site ↗</a>
        <button class="btn-logout" onclick="document.getElementById('logout-form').submit()">Sair</button>
      </div>
    </nav>
    <form id="logout-form" action="/api/admin/logout" method="POST" style="display:none"></form>
  `;
}

// ─── HTML shell ─────────────────────────────────────────────────────────────

const CSRF_SCRIPT = `
<script>
(function(){
  var token = document.querySelector('meta[name="csrf-token"]');
  if (!token) return;
  var t = token.getAttribute('content');
  if (!t) return;
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (typeof opts.headers.set === 'function') {
      opts.headers.set('X-CSRF-Token', t);
    } else {
      opts.headers['X-CSRF-Token'] = t;
    }
    return origFetch.call(this, url, opts);
  };
})();
</script>`;

function htmlShell(title: string, content: string, script: string = '', navActive: string = 'leads', csrfToken: string = ''): Response {
  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <meta name="csrf-token" content="${csrfToken}"/>
  <title>${title} - Admin</title>
  <style>${CSS}</style>
</head>
<body>
  ${navbar(navActive)}
  <main class="wrap">${content}</main>
  ${CSRF_SCRIPT}
  ${script ? `<script>${script}</script>` : ''}
</body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// ─── Login page (sem navbar) ────────────────────────────────────────────────
export function renderLoginPage(): Response {
  const content = `
    <div class="card" style="max-width:400px;margin:80px auto">
      <h1 style="text-align:center">Admin</h1>
      <p style="text-align:center;color:#8a7a74;font-size:14px;margin-bottom:24px">Entrar no dashboard</p>
      <form id="login-form" class="grid" style="gap:16px">
        <div>
          <label class="lbl" for="email">Email</label>
          <input id="email" name="email" type="email" required class="in" />
        </div>
        <div style="position:relative">
          <label class="lbl" for="password">Password</label>
          <input id="password" name="password" type="password" required class="in" style="padding-right:44px" />
          <button type="button" id="toggle-pw" aria-label="Mostrar password" style="position:absolute;right:12px;top:38px;background:none;border:none;cursor:pointer;color:#8a7a74;font-size:18px;line-height:1;padding:4px">
            <svg id="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg id="eye-closed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
        <button type="submit" class="btn" style="width:100%;margin-top:8px">Entrar</button>
        <p id="login-status" class="status err" role="status" aria-live="polite"></p>
      </form>
    </div>`;

  const script = `
    document.getElementById('toggle-pw').addEventListener('click', () => {
      const input = document.getElementById('password');
      const open = document.getElementById('eye-open');
      const closed = document.getElementById('eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        open.style.display = 'none';
        closed.style.display = 'block';
      } else {
        input.type = 'password';
        open.style.display = 'block';
        closed.style.display = 'none';
      }
    });
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('login-status');
      status.textContent = 'A entrar...';
      status.className = 'status';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
          }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect || '/admin';
        } else {
          status.textContent = data.error || 'Erro ao entrar.';
          status.className = 'status err';
        }
      } catch {
        status.textContent = 'Erro ao entrar. Tenta de novo.';
        status.className = 'status err';
      }
    });`;

  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>Login - Admin</title>
  <style>${CSS}</style>
</head>
<body>
  <main class="wrap">${content}</main>
  <script>${script}</script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// ─── Dashboard - landing page (sem navbar) ────────────────────────────────
export async function renderDashboard(env: Env, csrfToken: string = ''): Promise<Response> {
  const db = createDb(env);

  const allLeads = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  const leads = allLeads as typeof leadsTable.$inferSelect[];
  const totalLeads = leads.length;

  const allClients = await db.select().from(clientsTable).orderBy(desc(clientsTable.createdAt));
  const totalClients = allClients.length;

  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <meta name="csrf-token" content="${csrfToken}"/>
  <title>Dashboard - Admin</title>
  <style>${CSS}</style>
</head>
<body>
  <main class="wrap" style="max-width:720px;margin:80px auto 48px">
    <h1 style="text-align:center;margin-bottom:32px">Miana Admin</h1>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      <a href="/admin/leads" class="card" style="text-decoration:none;text-align:center;padding:32px 16px;cursor:pointer;transition:transform .15s">
        <div style="font-size:40px;font-weight:700;color:#8a2831">${totalLeads}</div>
        <div style="font-size:15px;color:#8a7a74;margin-top:8px">Leads</div>
      </a>
      <a href="/admin/clients" class="card" style="text-decoration:none;text-align:center;padding:32px 16px;cursor:pointer;transition:transform .15s">
        <div style="font-size:40px;font-weight:700;color:#8a2831">${totalClients}</div>
        <div style="font-size:15px;color:#8a7a74;margin-top:8px">Clientes</div>
      </a>
      <a href="/admin/settings" class="card" style="text-decoration:none;text-align:center;padding:32px 16px;cursor:pointer;transition:transform .15s">
        <div style="font-size:40px;font-weight:700;color:#8a2831">⚙</div>
        <div style="font-size:15px;color:#8a7a74;margin-top:8px">Settings</div>
      </a>
    </div>
  </main>
</body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// ─── Lista de leads ────────────────────────────────────────────────────────
export async function renderLeadsList(env: Env, filters: { status?: string; search?: string; type?: string; dateFrom?: string; dateTo?: string; page?: number }, csrfToken: string = ''): Promise<Response> {
  const db = createDb(env);
  const PAGE_SIZE = 25;
  const page = Math.max(1, filters.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (filters.status && ['novo', 'pendente', 'aceite', 'eliminado'].includes(filters.status)) {
    conditions.push(eq(leadsTable.status, filters.status));
  }
  if (filters.type && ['skin-call', 'bridal', 'beauty', 'education'].includes(filters.type)) {
    conditions.push(eq(leadsTable.type, filters.type));
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    conditions.push(or(like(leadsTable.nome, q), like(leadsTable.email, q))!);
  }
  if (filters.dateFrom) {
    const ts = new Date(filters.dateFrom).getTime();
    conditions.push(gte(leadsTable.createdAt, ts));
  }
  if (filters.dateTo) {
    const ts = new Date(filters.dateTo).getTime() + 86400 * 1000;
    conditions.push(lte(leadsTable.createdAt, ts));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(where);
  const totalCount = (countResult[0] as { count: number }).count;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const allLeads = await db
    .select()
    .from(leadsTable)
    .where(where)
    .orderBy(
      sql`(CASE WHEN ${leadsTable.status} = 'eliminado' THEN 2 WHEN ${leadsTable.status} = 'aceite' THEN 1 ELSE 0 END)`,
      desc(leadsTable.createdAt),
    )
    .limit(PAGE_SIZE)
    .offset(offset);
  const rows = allLeads as typeof leadsTable.$inferSelect[];

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (overrides.status || filters.status) params.set('status', overrides.status ?? filters.status!);
    if (overrides.type || filters.type) params.set('type', overrides.type ?? filters.type!);
    if (overrides.search || filters.search) params.set('search', overrides.search ?? filters.search!);
    if (overrides.dateFrom || filters.dateFrom) params.set('dateFrom', overrides.dateFrom ?? filters.dateFrom!);
    if (overrides.dateTo || filters.dateTo) params.set('dateTo', overrides.dateTo ?? filters.dateTo!);
    if (overrides.page || filters.page) params.set('page', overrides.page ?? String(filters.page!));
    const qs = params.toString();
    return qs ? `/admin/leads?${qs}` : '/admin/leads';
  };

  const unreadMap = await unreadByLeadIds(env).catch(() => new Map<string, number>());

  const tableRows = rows.map((lead) => {
    const typeLabel = TYPE_LABELS[lead.type as LeadType] || lead.type;
    const rowClass = lead.status === 'aceite'
      ? 'lead-row-aceite'
      : lead.status === 'eliminado'
        ? 'lead-row-eliminado'
        : '';
    const unread = unreadMap.get(lead.id) || 0;
    const unreadBadge = unread > 0 ? `<span class="unread-dot" title="${unread} não lida(s)"></span>` : '';
    return `
    <tr class="${rowClass}" onclick="window.location.href='/admin/lead/${lead.id}'" style="cursor:pointer">
      <td><span class="badge badge-${lead.type}">${typeLabel}</span>${unreadBadge}</td>
      <td>${lead.nome}</td>
      <td>${lead.email}</td>
      <td><span class="badge badge-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span></td>
      <td>${formatDate(lead.createdAt)}</td>
    </tr>`;
  }).join('');

  const statusFilters = [
    { value: '', label: 'Todos' },
    { value: 'novo', label: 'Novos' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'aceite', label: 'Aceites' },
  ];

  const typeFilters = [
    { value: '', label: 'Todos' },
    { value: 'skin-call', label: 'Skin Call' },
    { value: 'bridal', label: 'Bridal' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'education', label: 'Education' },
  ];

  const paginationHtml = totalPages > 1 ? `
    <div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:16px">
      ${page > 1 ? `<a href="${buildUrl({ page: String(page - 1) })}" class="filter-btn">← Anterior</a>` : ''}
      <span style="font-size:13px;color:#8a7a74">Página ${page} de ${totalPages}</span>
      ${page < totalPages ? `<a href="${buildUrl({ page: String(page + 1) })}" class="filter-btn">Próxima →</a>` : ''}
    </div>
  ` : '';

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>Leads</h1>
      <a href="/api/admin/export/leads${new URLSearchParams(Object.fromEntries(Object.entries({ status: filters.status, type: filters.type, search: filters.search, dateFrom: filters.dateFrom, dateTo: filters.dateTo }).filter(([, v]) => v) as [string, string][]))}" class="btn btn-outline btn-sm" download>Exportar CSV</a>
    </div>
    <p style="color:#8a7a74;font-size:14px;margin-bottom:24px">${totalCount} lead(s) registado(s)</p>

    <form method="GET" action="/admin/leads" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:end">
      <div>
        <label class="lbl" style="margin-bottom:4px">Buscar</label>
        <input name="search" class="in" placeholder="Nome ou email" value="${filters.search || ''}" style="width:200px;padding:8px 12px;font-size:13px" />
      </div>
      <div>
        <label class="lbl" style="margin-bottom:4px">Tipo</label>
        <select name="type" class="in" style="padding:8px 12px;font-size:13px">
          ${typeFilters.map(t => `<option value="${t.value}" ${filters.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="lbl" style="margin-bottom:4px">Estado</label>
        <select name="status" class="in" style="padding:8px 12px;font-size:13px">
          ${statusFilters.map(s => `<option value="${s.value}" ${filters.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="lbl" style="margin-bottom:4px">De</label>
        <input name="dateFrom" type="date" class="in" value="${filters.dateFrom || ''}" style="padding:8px 12px;font-size:13px" />
      </div>
      <div>
        <label class="lbl" style="margin-bottom:4px">Até</label>
        <input name="dateTo" type="date" class="in" value="${filters.dateTo || ''}" style="padding:8px 12px;font-size:13px" />
      </div>
      <button type="submit" class="btn btn-sm">Filtrar</button>
      <a href="/admin/leads" class="btn btn-outline btn-sm">Limpar</a>
    </form>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="5" style="text-align:center;color:#8a7a74;padding:32px">Nenhuma lead ainda.</td></tr>'}
        </tbody>
      </table>
      ${paginationHtml}
    </div>`;

  return htmlShell('Leads', content, '', 'leads', csrfToken);
}

// ─── Detalhe do lead ────────────────────────────────────────────────────────
export async function renderLeadDetail(env: Env, id: string, csrfToken: string = ''): Promise<Response> {
  if (!id) return htmlShell('Erro', '<div class="wrap"><h1>ID inválido</h1></div>');

  const db = createDb(env);

  const leadResult = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, id))
    .limit(1);

  const lead = leadResult[0] as typeof leadsTable.$inferSelect | undefined;
  if (!lead) return htmlShell('Não encontrado', '<div class="wrap"><h1>Lead não encontrado</h1><a href="/admin" class="back-link">← Voltar</a></div>');

  const formData = lead.formData ? JSON.parse(lead.formData) : {};
  const typeLabel = TYPE_LABELS[lead.type as LeadType] || lead.type;

  const personalFields = [
    ['Nome', lead.nome],
    ['Email', lead.email],
    ['Telefone', lead.telefone],
    ['Tipo', `<span class="badge badge-${lead.type}">${typeLabel}</span>`],
  ];

  const personalHtml = personalFields.map(([k, v]) => `
    <div class="field-group">
      <div class="field-label">${k}</div>
      <div class="field-value">${v}</div>
    </div>
  `).join('');

  const formDataHtml = Object.entries(formData).filter(([key]) => {
    const bridalOnly = [
      'data_casamento', 'hora_pronta', 'local_preparacao', 'local_prova',
      'servicos_procurados', 'guests_makeup', 'guests_hair', 'guests_pack', 'numero_guests',
    ];
    const beautyOnly = ['data_evento', 'hora_pronta_evento', 'local_evento', 'numero_pessoas'];
    if (lead.type === 'bridal') return !beautyOnly.includes(key);
    if (lead.type === 'beauty') return !bridalOnly.includes(key);
    return true;
  }).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="field-group">
        <div class="field-label">${label}</div>
        <div class="field-value">${value || '-'}</div>
      </div>
    `;
  }).join('');

  const locked = lead.status === 'aceite' || lead.status === 'eliminado';
  let linkedClientId: string | null = null;
  if (lead.status === 'aceite') {
    const clientRows = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.leadId, lead.id))
      .limit(1);
    linkedClientId = clientRows[0]?.id ?? null;
  }

  const actionsHtml = locked
    ? `
    <div class="actions" style="flex-direction:column;align-items:flex-start;gap:12px">
      <p style="color:#8a7a74;margin:0">
        Esta lead está <strong>${STATUS_LABELS[lead.status] || lead.status}</strong> - não é possível editar, aceitar ou eliminar.
      </p>
      ${linkedClientId
        ? `<a class="btn btn-outline btn-sm" href="/admin/client/${linkedClientId}">Ver cliente</a>`
        : ''}
    </div>
  `
    : `
    <div class="actions">
      <button class="btn btn-outline btn-sm" onclick="openModal('edit-modal')">Editar</button>
      <button class="btn btn-success btn-sm" onclick="openModal('accept-modal')">Aceitar</button>
      <button class="btn btn-danger btn-sm" onclick="updateStatus('eliminado')">Eliminar</button>
    </div>
  `;

  let chatHtml = '';
  try {
    const conv = await getOrCreateConversationForLead(env, lead.id);
    const messages = await listMessages(env, conv.id);
    const google = await getGoogleStatus(env).catch(() => ({ connected: false, configured: false, email: '' }));
    chatHtml = renderChatPanel({
      conversationId: conv.id,
      messages,
      canCompose: !locked,
      recipientEmail: lead.email,
      leadId: lead.id,
      clientId: linkedClientId,
      leadType: lead.type,
      continueOnClientId: locked ? linkedClientId : null,
      googleConnected: google.connected,
      showBookingTemplates: false,
    });
  } catch (e) {
    console.error('[admin] chat lead', e);
    chatHtml = `<h2>Conversa</h2><div class="card"><p style="color:#8a7a74">A conversa ainda não está disponível (aplica a migration 0010).</p></div>`;
  }

  const acceptModalHtml = locked ? '' : `
    <div id="accept-modal" class="modal-overlay">
      <div class="modal" style="max-width:420px;text-align:center">
        <h2 style="margin-bottom:12px">Aceitar Orçamento</h2>
        <p style="color:#8a7a74;margin-bottom:24px">Isto vai criar um cliente com os dados desta lead. Depois a lead fica aceite e sem mais ações. Desejas continuar?</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-outline" onclick="closeModal('accept-modal')">Cancelar</button>
          <button class="btn btn-success" onclick="acceptLead()">Sim, aceitar</button>
        </div>
        <p id="accept-status" class="status" role="status" aria-live="polite"></p>
      </div>
    </div>
  `;

  const editModalHtml = locked ? '' : `
    <div id="edit-modal" class="modal-overlay">
      <div class="modal">
        <button class="close" onclick="closeModal('edit-modal')">&times;</button>
        <h2>Editar Lead</h2>
        <form id="edit-form" style="display:grid;gap:16px;margin-top:16px">
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ed-nome">Nome</label>
              <input id="ed-nome" class="in" value="${lead.nome}" required />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ed-email">Email</label>
              <input id="ed-email" type="email" class="in" value="${lead.email}" required />
            </div>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ed-telefone">Telefone</label>
              <input id="ed-telefone" class="in" value="${lead.telefone}" required />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ed-status">Estado</label>
              <select id="ed-status" class="in">
                <option value="novo" ${lead.status === 'novo' ? 'selected' : ''}>Novo</option>
                <option value="pendente" ${lead.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                <option value="eliminado" ${lead.status === 'eliminado' ? 'selected' : ''}>Eliminado</option>
              </select>
            </div>
          </div>
          <div>
            <label class="lbl" for="ed-formdata">Dados do formulário (JSON)</label>
            <textarea id="ed-formdata" class="in" style="min-height:120px;font-family:monospace;font-size:13px">${JSON.stringify(formData, null, 2)}</textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn">Guardar</button>
            <button type="button" class="btn btn-outline" onclick="closeModal('edit-modal')">Cancelar</button>
          </div>
          <p id="edit-status" class="status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  const content = `
    <a href="/admin/leads" class="back-link">← Voltar à lista</a>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>${lead.nome}</h1>
      <span class="badge badge-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span>
    </div>

    <h2>Dados Pessoais</h2>
    <div class="card">${personalHtml}</div>

    <h2>Dados do Formulário</h2>
    <div class="card">${formDataHtml || '<p style="color:#8a7a74">Sem dados.</p>'}</div>

    <h2>Ações</h2>
    <div class="card">
      ${actionsHtml}
      <p id="action-msg" class="status" role="status" aria-live="polite"></p>
    </div>

    ${chatHtml}

    ${acceptModalHtml}
    ${editModalHtml}
  `;

  const script = `
    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

    async function updateStatus(status) {
      const msg = document.getElementById('action-msg');
      msg.textContent = 'A atualizar...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/lead/${lead.id}/status', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Estado atualizado!';
          msg.className = 'status';
          setTimeout(() => location.reload(), 500);
        } else {
          msg.textContent = data.error || 'Erro ao atualizar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao atualizar.';
        msg.className = 'status err';
      }
    }

    async function acceptLead() {
      const msg = document.getElementById('accept-status');
      msg.textContent = 'A criar cliente...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/lead/${lead.id}/accept', { method: 'POST', credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Cliente criado com sucesso!';
          msg.className = 'status';
          setTimeout(() => {
            if (data.id) location.href = '/admin/client/' + data.id;
            else location.reload();
          }, 800);
        } else {
          msg.textContent = data.error || 'Erro ao criar cliente.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao criar cliente.';
        msg.className = 'status err';
      }
    }

    document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('edit-status');
      msg.textContent = 'A guardar...';
      msg.className = 'status';
      try {
        let formData;
        try {
          formData = JSON.parse(document.getElementById('ed-formdata').value);
        } catch {
          msg.textContent = 'JSON inválido nos dados do formulário.';
          msg.className = 'status err';
          return;
        }
        const res = await fetch('/api/admin/lead/${lead.id}', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: document.getElementById('ed-nome').value,
            email: document.getElementById('ed-email').value,
            telefone: document.getElementById('ed-telefone').value,
            status: document.getElementById('ed-status').value,
            formData,
          }),
        });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Guardado!';
          msg.className = 'status';
          setTimeout(() => location.reload(), 500);
        } else {
          msg.textContent = data.error || 'Erro ao guardar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao guardar.';
        msg.className = 'status err';
      }
    });
    ${chatScript()}`;

  return htmlShell(`${lead.nome} - Admin`, content, script, 'leads', csrfToken);
}

// ─── Lista de clientes ──────────────────────────────────────────────────────
export async function renderClientsList(env: Env, filters: { search?: string; page?: number }, csrfToken: string = ''): Promise<Response> {
  const db = createDb(env);
  const PAGE_SIZE = 25;
  const page = Math.max(1, filters.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (filters.search) {
    const q = `%${filters.search}%`;
    conditions.push(or(like(clientsTable.nome, q), like(clientsTable.email, q))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(where);
  const totalCount = (countResult[0] as { count: number }).count;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const allClients = await db.select().from(clientsTable).where(where).orderBy(desc(clientsTable.createdAt)).limit(PAGE_SIZE).offset(offset);
  const rows = allClients as typeof clientsTable.$inferSelect[];

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (overrides.search || filters.search) params.set('search', overrides.search ?? filters.search!);
    if (overrides.page || filters.page) params.set('page', overrides.page ?? String(filters.page!));
    const qs = params.toString();
    return qs ? `/admin/clients?${qs}` : '/admin/clients';
  };

  const unreadMap = await unreadByClientIds(env).catch(() => new Map<string, number>());

  const tableRows = rows.map((client) => {
    const typeLabel = TYPE_LABELS[client.type as LeadType] || client.type;
    const unread = unreadMap.get(client.id) || 0;
    const unreadBadge = unread > 0 ? `<span class="unread-dot" title="${unread} não lida(s)"></span>` : '';
    return `
    <tr onclick="window.location.href='/admin/client/${client.id}'" style="cursor:pointer">
      <td><span class="badge badge-${client.type}">${typeLabel}</span>${unreadBadge}</td>
      <td>${client.nome}</td>
      <td>${client.email}</td>
      <td>${client.telefone}</td>
      <td>${formatDate(client.createdAt)}</td>
    </tr>`;
  }).join('');

  const paginationHtml = totalPages > 1 ? `
    <div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:16px">
      ${page > 1 ? `<a href="${buildUrl({ page: String(page - 1) })}" class="filter-btn">← Anterior</a>` : ''}
      <span style="font-size:13px;color:#8a7a74">Página ${page} de ${totalPages}</span>
      ${page < totalPages ? `<a href="${buildUrl({ page: String(page + 1) })}" class="filter-btn">Próxima →</a>` : ''}
    </div>
  ` : '';

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>Clientes</h1>
      <div style="display:flex;gap:8px">
        <a href="/api/admin/export/clients${filters.search ? '?search=' + encodeURIComponent(filters.search) : ''}" class="btn btn-outline btn-sm" download>Exportar CSV</a>
        <button class="btn btn-sm" onclick="openModal('new-client-modal')">Novo Cliente</button>
      </div>
    </div>
    <p style="color:#8a7a74;font-size:14px;margin-bottom:24px">${totalCount} cliente(s) registado(s)</p>

    <form method="GET" action="/admin/clients" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:end">
      <div>
        <label class="lbl" style="margin-bottom:4px">Buscar</label>
        <input name="search" class="in" placeholder="Nome ou email" value="${filters.search || ''}" style="width:200px;padding:8px 12px;font-size:13px" />
      </div>
      <button type="submit" class="btn btn-sm">Filtrar</button>
      <a href="/admin/clients" class="btn btn-outline btn-sm">Limpar</a>
    </form>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="5" style="text-align:center;color:#8a7a74;padding:32px">Nenhum cliente ainda.</td></tr>'}
        </tbody>
      </table>
      ${paginationHtml}
    </div>

    <div id="new-client-modal" class="modal-overlay">
      <div class="modal">
        <button class="close" onclick="closeModal('new-client-modal')">&times;</button>
        <h2>Novo Cliente</h2>
        <form id="new-client-form" style="display:grid;gap:16px;margin-top:16px">
          <div>
            <label class="lbl" for="nc-nome">Nome completo <span class="req">*</span></label>
            <input id="nc-nome" name="nome" type="text" required class="in" />
          </div>
          <div>
            <label class="lbl" for="nc-email">Email <span class="req">*</span></label>
            <input id="nc-email" name="email" type="email" required class="in" />
          </div>
          <div>
            <label class="lbl" for="nc-telefone">Telefone <span class="req">*</span></label>
            <input id="nc-telefone" name="telefone" type="tel" required class="in" />
          </div>
          <div>
            <label class="lbl" for="nc-type">Tipo <span class="req">*</span></label>
            <select id="nc-type" name="type" required class="in">
              <option value="">Selecione...</option>
              <option value="skin-call">Skin Call</option>
              <option value="bridal">Bridal</option>
              <option value="beauty">Beauty</option>
              <option value="education">Education</option>
            </select>
          </div>
          <div>
            <label class="lbl" for="nc-notes">Notas (opcional)</label>
            <textarea id="nc-notes" name="notes" rows="3" class="in"></textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn">Criar Cliente</button>
            <button type="button" class="btn btn-outline" onclick="closeModal('new-client-modal')">Cancelar</button>
          </div>
          <p id="nc-status" class="status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  const script = `
    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

    document.getElementById('new-client-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('nc-status');
      msg.textContent = 'A criar...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/client', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: document.getElementById('nc-nome').value,
            email: document.getElementById('nc-email').value,
            telefone: document.getElementById('nc-telefone').value,
            type: document.getElementById('nc-type').value,
            notes: document.getElementById('nc-notes').value || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin/client/' + data.id;
        } else {
          msg.textContent = data.error || 'Erro ao criar cliente.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao criar cliente.';
        msg.className = 'status err';
      }
    });
  `;

  return htmlShell('Clientes', content, script, 'clients', csrfToken);
}

// ─── Detalhe do cliente ─────────────────────────────────────────────────────
export async function renderClientDetail(env: Env, id: string, csrfToken: string = ''): Promise<Response> {
  if (!id) return htmlShell('Erro', '<div class="wrap"><h1>ID inválido</h1></div>');

  const db = createDb(env);

  const clientResult = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, id))
    .limit(1);

  const client = clientResult[0] as typeof clientsTable.$inferSelect | undefined;
  if (!client) return htmlShell('Não encontrado', '<div class="wrap"><h1>Cliente não encontrado</h1><a href="/admin/clients" class="back-link">← Voltar</a></div>');

  const data = client.data ? JSON.parse(client.data) : {};
  const typeLabel = TYPE_LABELS[client.type as LeadType] || client.type;

  const personalFields = [
    ['Nome', client.nome],
    ['Email', client.email],
    ['Telefone', client.telefone],
    ['Tipo', `<span class="badge badge-${client.type}">${typeLabel}</span>`],
  ];

  const personalHtml = personalFields.map(([k, v]) => `
    <div class="field-group">
      <div class="field-label">${k}</div>
      <div class="field-value">${v}</div>
    </div>
  `).join('');

  const dataHtml = Object.entries(data).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="field-group">
        <div class="field-label">${label}</div>
        <div class="field-value">${value || '-'}</div>
      </div>
    `;
  }).join('');

  // Diagnóstico para Skin Call clients
  let diagHtml = '';
  if (client.type === 'skin-call') {
    const diagResult = await db
      .select()
      .from(diagnosticsTable)
      .where(eq(diagnosticsTable.clientId, client.id))
      .limit(1);

    const diag = diagResult[0] as typeof diagnosticsTable.$inferSelect | undefined;

    // Verificar se o cliente tem lead com token
    let hasToken = false;
    if (client.leadId) {
      const { leads: leadsTable2 } = await import('./db/schema');
      const leadResult = await db.select({ token: leadsTable2.token }).from(leadsTable2).where(eq(leadsTable2.id, client.leadId)).limit(1);
      hasToken = !!leadResult[0]?.token;
    }

    const statusBadge = diag?.completed
      ? '<span class="badge" style="background:#e8f5e9;color:#2e7d32;margin-left:8px">Completo</span>'
      : '<span class="badge" style="background:#fff3e0;color:#e65100;margin-left:8px">Pendente</span>';

    if (diag && diag.completed) {
      const sections = [
        { title: 'Identificação', fields: [['Idade', diag.idade]] },
        { title: 'Histórico', fields: [
          ['Situação', diag.situacao], ['Doença crónica', diag.doencaCronica],
          ['Alergias alimentares', diag.alergiasAlimentares], ['Alergias cosméticos', diag.alergiasCosmeticos],
          ['Medicação contínua', diag.medicacaoContinua],
        ]},
        { title: 'Histórico Dermatológico', fields: [
          ['Diagnóstico médico', diag.diagnosticoMedico], ['Outro diagnóstico', diag.diagnosticoOutro],
          ['Medicação oral', diag.medicacaoOral], ['Medicação tópica', diag.medicacaoTopica],
          ['Tratamentos estéticos', diag.tratamentosEsteticos], ['Burnout cutâneo', diag.burnoutCutaneo],
          ['Vasos visíveis', diag.vasosVisiveis], ['Rubor', diag.rubor],
          ['Reação às estações', diag.reacaoEstacoes],
        ]},
        { title: 'Estilo & Hábitos de Vida', fields: [
          ['Stress', diag.stressNivel], ['Sono', diag.sonoTipo],
          ['Lado dormir', diag.sonoLado], ['Fronha', diag.sonoFronha],
          ['Água', diag.aguaIngestao], ['Alimentação', diag.alimentacao],
          ['Alimentação (outro)', diag.alimentacaoOutro],
          ['Exposição solar', diag.exposicaoSolar], ['Ambiente/fatores', diag.ambienteFatores],
          ['Ambiente/fatores (outro)', diag.ambienteFatoresOutro],
        ]},
        { title: 'A Tua Pele', fields: [
          ['Ao acordar', diag.peleAcordar], ['Ao acordar (outro)', diag.peleAcordarOutro],
          ['2h após lavar', diag.pele2h], ['2h após lavar (outro)', diag.pele2hOutro],
          ['À tarde', diag.peleTarde], ['À tarde (outro)', diag.peleTardeOutro],
          ['Textura', diag.peleTextura], ['Textura (outro)', diag.peleTexturaOutro],
          ['Cor', diag.peleCor], ['Cor (outro)', diag.peleCorOutro],
          ['Reação ao toque', diag.peleToque], ['Reação ao toque (outro)', diag.peleToqueOutro],
          ['Reação ao ambiente', diag.peleAmbiente], ['Reação ao ambiente (outro)', diag.peleAmbienteOutro],
          ['Borbulhas', diag.peleBorbulhas], ['Borbulhas (outro)', diag.peleBorbulhasOutro],
          ['Firmeza/linhas', diag.peleFirmeza], ['Firmeza/linhas (outro)', diag.peleFirmezaOutro],
          ['Contorno olhos', diag.peleContornoOlhos],
        ]},
        { title: 'Rotina Atual', fields: [
          ['Rotina manhã', diag.rotinaManha], ['Rotina noite', diag.rotinaNoite],
          ['Consistência', diag.rotinaConsistencia], ['Esfoliação', diag.rotinaEsfoliacao],
          ['Máscaras', diag.rotinaMascaras], ['Dispositivos', diag.rotinaDispositivos],
          ['Produto favorito', diag.rotinaFavorito], ['Produto odiado', diag.rotinaOdeia],
          ['Maquilhagem freq.', diag.rotinaMaquilhagemFreq], ['Retirar maquilhagem', diag.rotinaMaquilhagemRetirar],
          ['Lavar rosto', diag.rotinaLavarRosto], ['Lavar rosto (outro)', diag.rotinaLavarRostoOutro],
          ['Pincéis', diag.rotinaPinceis],
          ['Telemóvel', diag.rotinaTelemovel], ['Mexer no rosto', diag.rotinaMexerRosto],
          ['Espremer borbulhas', diag.rotinaEspremer], ['Depilação', diag.rotinaDepilacao],
        ]},
        { title: 'Preferências & Expectativas', fields: [
          ['Tempo rotina', diag.preferenciasTempo], ['Texturas detestadas', diag.preferenciasTexturas],
          ['Dificuldades', diag.preferenciasDificuldades], ['Orçamento', diag.preferenciasOrcamento],
          ['Prioridade 1', diag.prioridade1], ['Prioridade 2', diag.prioridade2],
          ['Pergunta urgente', diag.perguntaNaoPodeFicar], ['Mais informações', diag.maisAlgumaCoisa],
        ]},
      ];

      diagHtml = sections.map((s) => {
        const fields = s.fields.filter(([, v]) => v);
        if (fields.length === 0) return '';
        return `
          <h3 style="font-size:16px;color:#8a2831;margin:20px 0 8px">${s.title}</h3>
          ${fields.map(([k, v]) => `
            <div class="field-group">
              <div class="field-label">${k}</div>
              <div class="field-value">${v}</div>
            </div>
          `).join('')}
        `;
      }).join('');

      const photos = [
        { label: 'Frente', path: diag.fotoFrente },
        { label: 'Perfil Esquerdo', path: diag.fotoPerfilEsq },
        { label: 'Perfil Direito', path: diag.fotoPerfilDir },
      ].filter((p) => p.path);

      if (photos.length > 0) {
        diagHtml += `
          <h3 style="font-size:16px;color:#8a2831;margin:20px 0 8px">Fotos</h3>
          <div class="photo-grid">
            ${photos.map((p) => `
              <div>
                <div class="field-label" style="margin-bottom:4px">${p.label}</div>
                <img src="${photoAdminUrl(p.path!)}" alt="${p.label}" loading="lazy" />
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      diagHtml = `
        <p style="color:#8a7a74">Diagnóstico ainda não preenchido.</p>
        ${hasToken
          ? '<button class="btn btn-outline btn-sm" onclick="sendDiagnosticInvite()" style="margin-top:8px">Enviar Link Diagnóstico</button>'
          : '<p style="color:#8a7a74;font-size:13px;margin-top:8px">Cliente criado manualmente - sem lead associada para enviar diagnóstico.</p>'
        }
      `;
    }

    diagHtml = `<h3 style="font-size:16px;color:#8a2831;margin:20px 0 8px">Estado do Diagnóstico ${statusBadge}</h3>` + diagHtml;
  }

  // Horário sugerido para Bridal (duas agendas) e Beauty
  let schedulingHtml = '';
  if (client.type === 'bridal' && data) {
    const timing = await getTiming(env);
    const schedule = suggestBridalDualSchedule(
      { ...data, hora_pronta: data.hora_pronta || '', servicos_procurados: data.servicos_procurados || '' },
      timing
    );
    if (schedule && (schedule.makeup.blocks.length > 0 || schedule.hair.blocks.length > 0)) {
      const renderTrack = (track: typeof schedule.makeup) => {
        if (track.blocks.length === 0) {
          return `<p style="color:#8a7a74;font-size:13px">Sem blocos neste calendário.</p>`;
        }
        const rows = track.blocks.map((b) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f0eae4">${b.start} - ${b.end}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0eae4">${b.label}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0eae4;text-align:right">${formatDuration(b.minutes)}</td>
          </tr>
        `).join('');
        return `
          <div class="field-group" style="margin-bottom:16px">
            <div class="field-label">${track.title}</div>
            <div class="field-value" style="font-size:16px;font-weight:600;color:#8a2831;margin-bottom:8px">${track.range} · ${formatDuration(track.duration)}</div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="text-align:left;color:#8a7a74">
                <th style="padding:4px 8px">Horário</th>
                <th style="padding:4px 8px">Bloco</th>
                <th style="padding:4px 8px;text-align:right">Duração</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      };
      schedulingHtml = `
        <h2>Horário Sugerido</h2>
        <div class="card">
          <p style="font-size:13px;color:#8a7a74;margin-bottom:16px">
            Agendas separadas para Makeup artist e Hair stylist.
            Pack = hair primeiro, depois makeup (nunca em paralelo na mesma pessoa).
          </p>
          ${renderTrack(schedule.makeup)}
          ${renderTrack(schedule.hair)}
        </div>
      `;
    }
  } else if (client.type === 'beauty' && data) {
    const readyTime = data.hora_pronta_evento;
    const guestCount = parseInt(data.numero_pessoas || '0', 10);
    const timing = await getTiming(env);
    const duration = calculateDuration(client.type, guestCount, timing);
    const timeRange = suggestTimeRange(readyTime, duration);

    if (timeRange && duration > 0) {
      schedulingHtml = `
        <h2>Horário Sugerido</h2>
        <div class="card">
          <div class="field-group">
            <div class="field-label">Duração estimada</div>
            <div class="field-value">${formatDuration(duration)}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Horário sugerido</div>
            <div class="field-value" style="font-size:18px;font-weight:600;color:#8a2831">${timeRange}</div>
          </div>
        </div>
      `;
    }
  }

  let chatHtml = '';
  try {
    const conv = await getOrCreateConversationForClient(env, client.id);
    const messages = await listMessages(env, conv.id);
    const google = await getGoogleStatus(env).catch(() => ({ connected: false, configured: false, email: '' }));
    chatHtml = renderChatPanel({
      conversationId: conv.id,
      messages,
      canCompose: true,
      recipientEmail: client.email,
      leadId: client.leadId,
      clientId: client.id,
      leadType: client.type,
      googleConnected: google.connected,
      showBookingTemplates: client.type === 'skin-call',
    });
  } catch (e) {
    console.error('[admin] chat client', e);
    chatHtml = `<h2>Conversa</h2><div class="card"><p style="color:#8a7a74">A conversa ainda não está disponível (aplica a migration 0010).</p></div>`;
  }

  const content = `
    <a href="/admin/clients" class="back-link">← Voltar à lista</a>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>${client.nome}</h1>
      <span class="badge badge-${client.type}">${typeLabel}</span>
    </div>

    <h2>Dados Pessoais</h2>
    <div class="card">${personalHtml}</div>

    <h2>Dados do Formulário</h2>
    <div class="card">${dataHtml || '<p style="color:#8a7a74">Sem dados.</p>'}</div>

    ${diagHtml ? `
      <h2>Diagnóstico de Pele</h2>
      <div class="card">${diagHtml}</div>
    ` : ''}

    ${schedulingHtml}

    ${chatHtml}

    <div style="margin:16px 0">
      <button class="btn btn-outline btn-sm" onclick="openModal('edit-client-modal')">Editar</button>
    </div>

    <p id="action-msg" class="status" role="status" aria-live="polite"></p>

    <div id="edit-client-modal" class="modal-overlay">
      <div class="modal">
        <button class="close" onclick="closeModal('edit-client-modal')">&times;</button>
        <h2>Editar Cliente</h2>
        <form id="edit-client-form" style="display:grid;gap:16px;margin-top:16px">
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ec-nome">Nome</label>
              <input id="ec-nome" class="in" value="${client.nome}" required />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ec-email">Email</label>
              <input id="ec-email" type="email" class="in" value="${client.email}" required />
            </div>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ec-telefone">Telefone</label>
              <input id="ec-telefone" class="in" value="${client.telefone}" required />
            </div>
            <div style="flex:1;min-width:200px">
              <label class="lbl" for="ec-type">Tipo</label>
              <select id="ec-type" class="in">
                <option value="skin-call" ${client.type === 'skin-call' ? 'selected' : ''}>Skin Call</option>
                <option value="bridal" ${client.type === 'bridal' ? 'selected' : ''}>Bridal</option>
                <option value="beauty" ${client.type === 'beauty' ? 'selected' : ''}>Beauty</option>
                <option value="education" ${client.type === 'education' ? 'selected' : ''}>Education</option>
              </select>
            </div>
          </div>
          <div>
            <label class="lbl" for="ec-data">Dados (JSON)</label>
            <textarea id="ec-data" class="in" style="min-height:120px;font-family:monospace;font-size:13px">${JSON.stringify(data, null, 2)}</textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn">Guardar</button>
            <button type="button" class="btn btn-outline" onclick="closeModal('edit-client-modal')">Cancelar</button>
          </div>
          <p id="ec-status" class="status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  const script = `
    (async function hydratePhotos() {
      const imgs = document.querySelectorAll('.photo-grid img');
      if (!imgs.length) return;
      let heicTo = null;
      let isHeic = null;
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/heic-to@1.5.2/+esm');
        heicTo = mod.heicTo;
        isHeic = mod.isHeic;
      } catch (err) {
        console.warn('heic-to unavailable', err);
      }
      for (const img of imgs) {
        const src = img.getAttribute('src');
        if (!src) continue;
        try {
          const res = await fetch(src, { credentials: 'same-origin' });
          if (!res.ok) continue;
          const blob = await res.blob();
          let out = blob;
          if (isHeic && heicTo && await isHeic(blob)) {
            out = await heicTo({ blob: blob, type: 'image/jpeg', quality: 0.9 });
          }
          img.src = URL.createObjectURL(out);
        } catch (err) {
          console.warn('photo hydrate failed', err);
        }
      }
    })();

    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

    async function sendDiagnosticInvite() {
      const msg = document.getElementById('action-msg');
      msg.textContent = 'A enviar link...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/client/${client.id}/diagnostic-invite', { method: 'POST', credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Link de diagnóstico enviado!';
          msg.className = 'status';
        } else {
          msg.textContent = data.error || 'Erro ao enviar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao enviar.';
        msg.className = 'status err';
      }
    }

    document.getElementById('edit-client-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('ec-status');
      msg.textContent = 'A guardar...';
      msg.className = 'status';
      try {
        let formData;
        try {
          formData = JSON.parse(document.getElementById('ec-data').value);
        } catch {
          msg.textContent = 'JSON inválido nos dados.';
          msg.className = 'status err';
          return;
        }
        const res = await fetch('/api/admin/client/${client.id}', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: document.getElementById('ec-nome').value,
            email: document.getElementById('ec-email').value,
            telefone: document.getElementById('ec-telefone').value,
            type: document.getElementById('ec-type').value,
            data: formData,
          }),
        });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Guardado!';
          msg.className = 'status';
          setTimeout(() => location.reload(), 500);
        } else {
          msg.textContent = data.error || 'Erro ao guardar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao guardar.';
        msg.className = 'status err';
      }
    });
    ${chatScript()}`;

  return htmlShell(`${client.nome} - Admin`, content, script, 'clients', csrfToken);
}

// ─── Settings ──────────────────────────────────────────────────────────────
export async function renderSettingsPage(env: Env, csrfToken: string = ''): Promise<Response> {
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

  const get = (key: string, fallback: string = '') => settingsMap[key] || fallback;

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>Settings</h1>
    </div>

    <form id="settings-form">
      <h2>Preços</h2>
      <div class="card">
        <h3>Bridal</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_bridal_hair">Hair</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_bridal_hair" class="in" type="number" value="${get('price_bridal_hair', '250')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_bridal_makeup">Makeup</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_bridal_makeup" class="in" type="number" value="${get('price_bridal_makeup', '250')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_bridal_pack">Pack</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_bridal_pack" class="in" type="number" value="${get('price_bridal_pack', '475')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
        </div>

        <h3>Beauty</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_beauty_hair">Hair</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_beauty_hair" class="in" type="number" value="${get('price_beauty_hair', '60')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_beauty_makeup">Makeup</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_beauty_makeup" class="in" type="number" value="${get('price_beauty_makeup', '60')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_beauty_pack">Pack</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_beauty_pack" class="in" type="number" value="${get('price_beauty_pack', '110')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
        </div>

        <h3>Skin Call</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
          <div style="flex:1;min-width:120px">
            <label class="lbl" for="price_skin_session1">1 sessão</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_skin_session1" class="in" type="number" value="${get('price_skin_session1', '80')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:120px">
            <label class="lbl" for="price_skin_session2">2 sessões</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_skin_session2" class="in" type="number" value="${get('price_skin_session2', '150')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:120px">
            <label class="lbl" for="price_skin_session3">3 sessões</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_skin_session3" class="in" type="number" value="${get('price_skin_session3', '210')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
          <div style="flex:1;min-width:120px">
            <label class="lbl" for="price_skin_session4">4 sessões</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_skin_session4" class="in" type="number" value="${get('price_skin_session4', '260')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
        </div>

        <h3>Education</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="price_education_workshop">Workshop</label>
            <div style="display:flex;align-items:center;gap:4px"><input id="price_education_workshop" class="in" type="number" value="${get('price_education_workshop', '150')}" style="flex:1" /><span style="color:#8a7a74">€</span></div>
          </div>
        </div>
      </div>

      <h2>Tempos</h2>
      <div class="card">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="time_setup">Setup (min)</label>
            <input id="time_setup" class="in" type="number" value="${get('time_setup', '15')}" />
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="time_bridal">Bridal (min)</label>
            <input id="time_bridal" class="in" type="number" value="${get('time_bridal', '60')}" />
          </div>
          <div style="flex:1;min-width:140px">
            <label class="lbl" for="time_guest">Guest (min)</label>
            <input id="time_guest" class="in" type="number" value="${get('time_guest', '45')}" />
          </div>
        </div>
      </div>

      <h2>Contactos</h2>
      <div class="card">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label class="lbl" for="contact_email">Email</label>
            <input id="contact_email" class="in" type="email" value="${get('contact_email', 'hello@marianapita.pt')}" />
          </div>
          <div style="flex:1;min-width:200px">
            <label class="lbl" for="contact_phone">Telefone</label>
            <input id="contact_phone" class="in" value="${get('contact_phone')}" />
          </div>
        </div>
        <div style="margin-top:16px">
          <label class="lbl" for="contact_address">Morada</label>
          <input id="contact_address" class="in" value="${get('contact_address')}" />
        </div>
      </div>

      <h2>Pagamento</h2>
      <div class="card">
        <p style="color:#8a7a74;font-size:13px;margin-bottom:16px">Usados no email de termos e condições (placeholders até teres os dados reais).</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label class="lbl" for="payment_account_name">Titular</label>
            <input id="payment_account_name" class="in" value="${get('payment_account_name', '[Titular da conta - substituir]')}" />
          </div>
          <div style="flex:1;min-width:200px">
            <label class="lbl" for="payment_iban">IBAN</label>
            <input id="payment_iban" class="in" value="${get('payment_iban', '[IBAN - substituir]')}" />
          </div>
        </div>
        <div style="margin-top:16px">
          <label class="lbl" for="payment_mbway">MB Way</label>
          <input id="payment_mbway" class="in" value="${get('payment_mbway', '[MB Way - substituir]')}" />
        </div>
      </div>

      <h2>Google Calendar</h2>
      <div class="card" id="google-card">
        <p style="color:#8a7a74;font-size:13px;margin-bottom:16px">Necessário para o botão «Marcar e formulário» (cria o Meet na data escolhida).</p>
        <p id="google-status-line">A verificar...</p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <a class="btn btn-sm" href="/api/admin/google/connect">Ligar Google Calendar</a>
          <button type="button" class="btn btn-outline btn-sm" id="google-disconnect">Desligar</button>
        </div>
      </div>

      <div style="margin-top:24px;display:flex;gap:8px">
        <button type="submit" class="btn">Guardar</button>
      </div>
      <p id="settings-status" class="status" role="status" aria-live="polite"></p>
    </form>
  `;

  const script = `
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('settings-status');
      msg.textContent = 'A guardar...';
      msg.className = 'status';

      const keys = [
        'price_bridal_hair', 'price_bridal_makeup', 'price_bridal_pack',
        'price_beauty_hair', 'price_beauty_makeup', 'price_beauty_pack',
        'price_skin_session1', 'price_skin_session2', 'price_skin_session3', 'price_skin_session4',
        'price_education_workshop',
        'time_setup', 'time_bridal', 'time_guest',
        'contact_email', 'contact_phone', 'contact_address',
        'payment_iban', 'payment_account_name', 'payment_mbway',
      ];

      const data: Record<string, string> = {};
      for (const key of keys) {
        const el = document.getElementById(key) as HTMLInputElement;
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
          line.textContent = 'Ainda não está ligado.';
        }
      } catch {
        line.textContent = 'Não foi possível verificar o estado do Google.';
      }
    })();

    document.getElementById('google-disconnect').addEventListener('click', async () => {
      if (!confirm('Desligar o Google Calendar?')) return;
      await fetch('/api/admin/google/disconnect', { method: 'POST', credentials: 'same-origin' });
      location.reload();
    });
  `;

  return htmlShell('Settings', content, script, 'settings', csrfToken);
}
