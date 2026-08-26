// Dashboard admin — renderização HTML server-side.
// Cores da marca: burgundy #8a2831, offwhite #fbf5ef, fundo #f6f0ea.

import { eq, desc } from 'drizzle-orm';
import { createDb } from './db';
import { leads as leadsTable, diagnostics as diagnosticsTable, clients as clientsTable } from './db/schema';
import type { Env } from './lib';

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
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.badge-skin-call{background:#e8f5e9;color:#2e7d32}
.badge-bridal-beauty{background:#fce4ec;color:#c62828}
.badge-education{background:#e3f2fd;color:#1565c0}
.badge-novo{background:#e8f5e9;color:#2e7d32}
.badge-orcamento_enviado{background:#fff3e0;color:#e65100}
.badge-aguarda_resposta{background:#e3f2fd;color:#1565c0}
.badge-em_analise{background:#f3e5f5;color:#7b1fa2}
.badge-proposta_enviada{background:#fce4ec;color:#c62828}
.badge-aceite{background:#e8f5e9;color:#2e7d32}
.badge-em_curso{background:#e0f7fa;color:#00838f}
.badge-concluido{background:#e8f5e9;color:#1b5e20}
.badge-recusado{background:#ffebee;color:#b71c1c}
.badge-desativo{background:#f5f5f5;color:#757575}
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
`;

// ─── Status labels ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  orcamento_enviado: 'Orçamento Enviado',
  aguarda_resposta: 'Aguarda Resposta',
  em_analise: 'Em Análise',
  proposta_enviada: 'Proposta Enviada',
  aceite: 'Aceite',
  em_curso: 'Em Curso',
  concluido: 'Concluído',
  recusado: 'Recusado',
  desativo: 'Desativado',
};

const TYPE_LABELS: Record<string, string> = {
  'skin-call': 'Skin Call',
  'bridal-beauty': 'Bridal & Beauty',
  'education': 'Education',
};

function formatDate(d: Date | number): string {
  const date = new Date(d);
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function navbar(active: string): string {
  const links = [
    { href: '/admin', label: 'Leads', key: 'leads' },
    { href: '/admin/clients', label: 'Clientes', key: 'clients' },
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

function htmlShell(title: string, content: string, script: string = '', navActive: string = 'leads'): Response {
  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>${title} — Admin</title>
  <style>${CSS}</style>
</head>
<body>
  ${navbar(navActive)}
  <main class="wrap">${content}</main>
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
  <title>Login — Admin</title>
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

// ─── Dashboard — lista de leads ─────────────────────────────────────────────
export async function renderDashboard(env: Env): Promise<Response> {
  const db = createDb(env);

  const allLeads = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  const rows = allLeads as typeof leadsTable.$inferSelect[];

  const tableRows = rows.map((lead) => {
    const typeLabel = TYPE_LABELS[lead.type] || lead.type;
    return `
    <tr onclick="window.location.href='/admin/lead/${lead.id}'" style="cursor:pointer">
      <td><span class="badge badge-${lead.type}">${typeLabel}</span></td>
      <td>${lead.nome}</td>
      <td>${lead.email}</td>
      <td><span class="badge badge-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span></td>
      <td>${formatDate(lead.createdAt)}</td>
    </tr>`;
  }).join('');

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>Leads</h1>
    </div>
    <p style="color:#8a7a74;font-size:14px;margin-bottom:24px">${rows.length} lead(s) registado(s)</p>
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
    </div>`;

  return htmlShell('Leads', content, '', 'leads');
}

// ─── Detalhe do lead ────────────────────────────────────────────────────────
export async function renderLeadDetail(env: Env, id: string): Promise<Response> {
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
  const typeLabel = TYPE_LABELS[lead.type] || lead.type;

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

  const formDataHtml = Object.entries(formData).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="field-group">
        <div class="field-label">${label}</div>
        <div class="field-value">${value || '—'}</div>
      </div>
    `;
  }).join('');

  // Diagnóstico (Skin Call only)
  let diagHtml = '';
  if (lead.type === 'skin-call') {
    const diagResult = await db
      .select()
      .from(diagnosticsTable)
      .where(eq(diagnosticsTable.leadId, lead.id))
      .limit(1);

    const diag = diagResult[0] as typeof diagnosticsTable.$inferSelect | undefined;

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
          ['Exposição solar', diag.exposicaoSolar], ['Ambiente/fatores', diag.ambienteFatores],
        ]},
        { title: 'A Tua Pele', fields: [
          ['Ao acordar', diag.peleAcordar], ['2h após lavar', diag.pele2h],
          ['À tarde', diag.peleTarde], ['Textura', diag.peleTextura],
          ['Cor', diag.peleCor], ['Reação ao toque', diag.peleToque],
          ['Reação ao ambiente', diag.peleAmbiente], ['Borbulhas', diag.peleBorbulhas],
          ['Firmeza/línhas', diag.peleFirmeza], ['Contorno olhos', diag.peleContornoOlhos],
        ]},
        { title: 'Rotina Atual', fields: [
          ['Rotina manhã', diag.rotinaManha], ['Rotina noite', diag.rotinaNoite],
          ['Consistência', diag.rotinaConsistencia], ['Esfoliação', diag.rotinaEsfoliacao],
          ['Máscaras', diag.rotinaMascaras], ['Dispositivos', diag.rotinaDispositivos],
          ['Produto favorito', diag.rotinaFavorito], ['Produto odiado', diag.rotinaOdeia],
          ['Maquilhagem freq.', diag.rotinaMaquilhagemFreq], ['Retirar maquilhagem', diag.rotinaMaquilhagemRetirar],
          ['Lavar rosto', diag.rotinaLavarRosto], ['Pincéis', diag.rotinaPinceis],
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
                <img src="/api/admin/photo/${encodeURIComponent(p.path!)}" alt="${p.label}" loading="lazy" />
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      diagHtml = '<p style="color:#8a7a74">Diagnóstico ainda não preenchido.</p>';
    }
  }

  const actionsHtml = `
    <div class="actions">
      <button class="btn btn-outline btn-sm" onclick="openModal('quote-modal')">Enviar Orçamento</button>
      ${lead.type === 'skin-call' ? '<button class="btn btn-outline btn-sm" onclick="sendDiagnosticInvite()">Enviar Link Diagnóstico</button>' : ''}
      <button class="btn btn-success btn-sm" onclick="openModal('accept-modal')">Orçamento Aceite</button>
      <button class="btn btn-sm" onclick="updateStatus('em_analise')">Em Análise</button>
      <button class="btn btn-sm" onclick="updateStatus('aguarda_resposta')">Aguarda Resposta</button>
      <button class="btn btn-sm" onclick="updateStatus('concluido')">Concluído</button>
      <button class="btn btn-danger btn-sm" onclick="updateStatus('recusado')">Fechar Lead</button>
      <button class="btn btn-sm" style="background:#757575" onclick="updateStatus('desativo')">Descartar</button>
    </div>
  `;

  const quoteModalHtml = `
    <div id="quote-modal" class="modal-overlay">
      <div class="modal">
        <button class="close" onclick="closeModal('quote-modal')">&times;</button>
        <h2>Enviar Orçamento</h2>
        <p style="color:#8a7a74;font-size:14px;margin-bottom:16px">Email para <strong>${lead.email}</strong></p>
        <form id="quote-form" style="display:grid;gap:16px">
          <div>
            <label class="lbl" for="quote-subject">Assunto</label>
            <input id="quote-subject" class="in" value="Orçamento — ${typeLabel}" required />
          </div>
          <div>
            <label class="lbl" for="quote-body">Corpo do email</label>
            <textarea id="quote-body" class="in" required placeholder="Escreve o orçamento aqui..."></textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn">Enviar</button>
            <button type="button" class="btn btn-outline" onclick="closeModal('quote-modal')">Cancelar</button>
          </div>
          <p id="quote-status" class="status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  const acceptModalHtml = `
    <div id="accept-modal" class="modal-overlay">
      <div class="modal" style="max-width:420px;text-align:center">
        <h2 style="margin-bottom:12px">Aceitar Orçamento</h2>
        <p style="color:#8a7a74;margin-bottom:24px">Isto vai criar um cliente com os dados desta lead. Desejas continuar?</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-outline" onclick="closeModal('accept-modal')">Cancelar</button>
          <button class="btn btn-success" onclick="acceptLead()">Sim, aceitar</button>
        </div>
        <p id="accept-status" class="status" role="status" aria-live="polite"></p>
      </div>
    </div>
  `;

  const content = `
    <a href="/admin" class="back-link">← Voltar à lista</a>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>${lead.nome}</h1>
      <span class="badge badge-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span>
    </div>

    <h2>Dados Pessoais</h2>
    <div class="card">${personalHtml}</div>

    <h2>Dados do Formulário</h2>
    <div class="card">${formDataHtml || '<p style="color:#8a7a74">Sem dados.</p>'}</div>

    ${diagHtml ? `
      <h2>Diagnóstico de Pele</h2>
      <div class="card">${diagHtml}</div>
    ` : ''}

    <h2>Ações</h2>
    <div class="card">
      ${actionsHtml}
      <p id="action-msg" class="status" role="status" aria-live="polite"></p>
    </div>

    ${quoteModalHtml}
    ${acceptModalHtml}
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

    document.getElementById('quote-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('quote-status');
      msg.textContent = 'A enviar...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/lead/${lead.id}/quote', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: document.getElementById('quote-subject').value,
            html: document.getElementById('quote-body').value.replace(/\\n/g, '<br>'),
          }),
        });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Orçamento enviado!';
          msg.className = 'status';
          setTimeout(() => location.reload(), 1000);
        } else {
          msg.textContent = data.error || 'Erro ao enviar.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao enviar.';
        msg.className = 'status err';
      }
    });

    async function sendDiagnosticInvite() {
      const msg = document.getElementById('action-msg');
      msg.textContent = 'A enviar link...';
      msg.className = 'status';
      try {
        const res = await fetch('/api/admin/lead/${lead.id}/diagnostic-invite', { method: 'POST', credentials: 'same-origin' });
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
          setTimeout(() => location.reload(), 1000);
        } else {
          msg.textContent = data.error || 'Erro ao criar cliente.';
          msg.className = 'status err';
        }
      } catch {
        msg.textContent = 'Erro ao criar cliente.';
        msg.className = 'status err';
      }
    }`;

  return htmlShell(`${lead.nome} — Admin`, content, script, 'leads');
}

// ─── Lista de clientes ──────────────────────────────────────────────────────
export async function renderClientsList(env: Env): Promise<Response> {
  const db = createDb(env);

  const allClients = await db.select().from(clientsTable).orderBy(desc(clientsTable.createdAt));
  const rows = allClients as typeof clientsTable.$inferSelect[];

  const tableRows = rows.map((client) => {
    const typeLabel = TYPE_LABELS[client.type] || client.type;
    return `
    <tr onclick="window.location.href='/admin/client/${client.id}'" style="cursor:pointer">
      <td><span class="badge badge-${client.type}">${typeLabel}</span></td>
      <td>${client.nome}</td>
      <td>${client.email}</td>
      <td>${client.telefone}</td>
      <td>${formatDate(client.createdAt)}</td>
    </tr>`;
  }).join('');

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h1>Clientes</h1>
    </div>
    <p style="color:#8a7a74;font-size:14px;margin-bottom:24px">${rows.length} cliente(s) registado(s)</p>
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
    </div>`;

  return htmlShell('Clientes', content, '', 'clients');
}

// ─── Detalhe do cliente ─────────────────────────────────────────────────────
export async function renderClientDetail(env: Env, id: string): Promise<Response> {
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
  const typeLabel = TYPE_LABELS[client.type] || client.type;

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
        <div class="field-value">${value || '—'}</div>
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
          ['Exposição solar', diag.exposicaoSolar], ['Ambiente/fatores', diag.ambienteFatores],
        ]},
        { title: 'A Tua Pele', fields: [
          ['Ao acordar', diag.peleAcordar], ['2h após lavar', diag.pele2h],
          ['À tarde', diag.peleTarde], ['Textura', diag.peleTextura],
          ['Cor', diag.peleCor], ['Reação ao toque', diag.peleToque],
          ['Reação ao ambiente', diag.peleAmbiente], ['Borbulhas', diag.peleBorbulhas],
          ['Firmeza/línhas', diag.peleFirmeza], ['Contorno olhos', diag.peleContornoOlhos],
        ]},
        { title: 'Rotina Atual', fields: [
          ['Rotina manhã', diag.rotinaManha], ['Rotina noite', diag.rotinaNoite],
          ['Consistência', diag.rotinaConsistencia], ['Esfoliação', diag.rotinaEsfoliacao],
          ['Máscaras', diag.rotinaMascaras], ['Dispositivos', diag.rotinaDispositivos],
          ['Produto favorito', diag.rotinaFavorito], ['Produto odiado', diag.rotinaOdeia],
          ['Maquilhagem freq.', diag.rotinaMaquilhagemFreq], ['Retirar maquilhagem', diag.rotinaMaquilhagemRetirar],
          ['Lavar rosto', diag.rotinaLavarRosto], ['Pincéis', diag.rotinaPinceis],
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
                <img src="/api/admin/photo/${encodeURIComponent(p.path!)}" alt="${p.label}" loading="lazy" />
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      diagHtml = `
        <p style="color:#8a7a74">Diagnóstico ainda não preenchido.</p>
        <button class="btn btn-outline btn-sm" onclick="sendDiagnosticInvite()" style="margin-top:8px">Enviar Link Diagnóstico</button>
      `;
    }
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

    <p id="action-msg" class="status" role="status" aria-live="polite"></p>
  `;

  const script = `
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
    }`;

  return htmlShell(`${client.nome} — Admin`, content, script, 'clients');
}
