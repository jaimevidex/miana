// Entry point do Worker — serve os assets estáticos do Astro e adiciona o funnel.
//
// Rotas:
//   POST /api/lead                 Cria lead (Skin Call, Bridal, Education)
//   GET  /diagnostico?token=&page= Página privada multi-página do diagnóstico.
//   POST /api/diagnostico/save     Guarda dados de uma página do diagnóstico.
//   POST /api/diagnostico          Submete diagnóstico completo (Skin Call).
//   GET  /admin/login              Página de login.
//   POST /api/admin/login          Validar credenciais.
//   POST /api/admin/logout         Destruir sessão.
//   GET  /admin                    Dashboard (protegido).
//   GET  /admin/lead/:id           Detalhe lead (protegido).
//   POST /api/admin/lead/:id/status Mudar estado do lead.
//   POST /api/admin/lead/:id/quote Enviar orçamento por email.
//   POST /api/admin/lead/:id/diagnostic Invite - enviar link diagnóstico ao cliente.
//   POST /api/admin/lead/:id/accept Aceitar orçamento → criar cliente.
//   GET  /api/admin/photo/:key     Servir foto R2 (auth required).

import { eq, desc } from 'drizzle-orm';
import { allowRequest, generateToken, isBot, isValidEmail, json, readForm, validateLead, type Env, type LeadType, FIELD_LABELS } from './lib';
import { R2_FOLDER } from './constants';
import { createDb } from './db';
import { leads, diagnostics, users, clients } from './db/schema';
import { sendLeadNotification, sendDiagnosticComplete, sendDiagnosticInvite, sendQuoteEmail } from './email';
import { renderDiagnosticError, renderDiagnosticPage } from './diagnostico';
import { createSession, validateSession, destroySession } from './auth/session';
import { setSessionCookie, getSessionCookie, clearSessionCookie } from './auth/cookies';
import { verifyPassword } from './auth/password';
import { renderLoginPage, renderDashboard, renderLeadDetail, renderClientsList, renderClientDetail } from './admin';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // ─── API pública ─────────────────────────────────────────────────────
    if (path === '/api/lead' && method === 'POST') return handleLead(request, env);
    if (path === '/api/diagnostico/save' && method === 'POST') return handleDiagnosticoSave(request, env);
    if (path === '/api/diagnostico' && method === 'POST') return handleDiagnostico(request, env);
    if (path === '/diagnostico' && method === 'GET') return handleDiagnosticPage(request, env);

    // ─── Admin auth ──────────────────────────────────────────────────────
    if (path === '/admin/login' && method === 'GET') return renderLoginPage();
    if (path === '/api/admin/login' && method === 'POST') return handleLogin(request, env);
    if (path === '/api/admin/logout' && method === 'POST') return handleLogout(request, env);

    // ─── Admin protegido ─────────────────────────────────────────────────
    if (path.startsWith('/admin')) {
      const userId = await requireAuth(request, env);
      if (!userId) return new Response(null, { status: 302, headers: { Location: '/admin/login' } });

      if (path === '/admin' && method === 'GET') return renderDashboard(env);
      if (path === '/admin/clients' && method === 'GET') return renderClientsList(env);
      if (path.startsWith('/admin/lead/') && method === 'GET') {
        const id = path.split('/admin/lead/')[1];
        return renderLeadDetail(env, id);
      }
      if (path.startsWith('/admin/client/') && method === 'GET') {
        const id = path.split('/admin/client/')[1];
        return renderClientDetail(env, id);
      }
    }

    // ─── Admin API protegida ─────────────────────────────────────────────
    if (path.startsWith('/api/admin/')) {
      const userId = await requireAuth(request, env);
      if (!userId) return json({ error: 'Não autenticado' }, 401);

      if (path.startsWith('/api/admin/lead/') && path.endsWith('/status') && method === 'POST') {
        const id = path.split('/api/admin/lead/')[1]?.replace('/status', '');
        return handleUpdateStatus(request, env, id);
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/quote') && method === 'POST') {
        const id = path.split('/api/admin/lead/')[1]?.replace('/quote', '');
        return handleSendQuote(request, env, id, userId);
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/diagnostic-invite') && method === 'POST') {
        const id = path.split('/api/admin/lead/')[1]?.replace('/diagnostic-invite', '');
        return handleDiagnosticInvite(request, env, id);
      }
      if (path.startsWith('/api/admin/lead/') && path.endsWith('/accept') && method === 'POST') {
        const id = path.split('/api/admin/lead/')[1]?.replace('/accept', '');
        return handleAcceptLead(request, env, id);
      }
      if (path.startsWith('/api/admin/client/') && path.endsWith('/diagnostic-invite') && method === 'POST') {
        const id = path.split('/api/admin/client/')[1]?.replace('/diagnostic-invite', '');
        return handleClientDiagnosticInvite(request, env, id);
      }
      if (path.startsWith('/api/admin/photo/') && method === 'GET') {
        const key = decodeURIComponent(path.split('/api/admin/photo/')[1] || '');
        return handleServePhoto(env, key);
      }
    }

    return env.ASSETS.fetch(request as Request);
  },
} satisfies ExportedHandler<Env>;

// ─── Auth helpers ───────────────────────────────────────────────────────────

async function requireAuth(request: Request, env: Env): Promise<string | null> {
  const sessionId = getSessionCookie(request);
  if (!sessionId) return null;
  return validateSession(env, sessionId);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return json({ success: false, error: 'Email e password são obrigatórios.' }, 400);
    }

    const db = createDb(env);
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const loginUser = userResult[0];

    if (!loginUser) {
      return json({ success: false, error: 'Credenciais inválidas.' }, 401);
    }

    const valid = await verifyPassword(password, loginUser.passwordHash);
    if (!valid) {
      return json({ success: false, error: 'Credenciais inválidas.' }, 401);
    }

    const sessionId = await createSession(env, loginUser.id);
    const headers = new Headers();
    setSessionCookie(headers, sessionId);
    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify({ success: true, redirect: '/admin' }), { status: 200, headers });
  } catch (e) {
    console.error('[api/admin/login] error:', e);
    return json({ success: false, error: 'Erro no servidor.' }, 500);
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const sessionId = getSessionCookie(request);
  if (sessionId) await destroySession(env, sessionId);

  const headers = new Headers();
  clearSessionCookie(headers);
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify({ success: true, redirect: '/admin/login' }), { status: 200, headers });
}

// ─── Lead creation (todos os tipos) ─────────────────────────────────────────

async function handleLead(request: Request, env: Env): Promise<Response> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    const form = await readForm(request);
    if (isBot(form)) return json({ success: true });

    const type = (form.get('form_type') || 'skin-call') as LeadType;
    const nome = ((form.get('nome') || '') as string).trim();
    const telefone = ((form.get('telefone') || '') as string).trim();
    const email = ((form.get('email') || '') as string).trim().toLowerCase();

    const err = validateLead({ nome, telefone, email, type });
    if (err) return json({ success: false, error: err }, 400);

    const allowed = await allowRequest(env, clientIP, email);
    if (!allowed) {
      return json({ success: false, error: 'Demasiadas tentativas. Tenta mais tarde.' }, 429);
    }

    // Token só para Skin Call
    const token = type === 'skin-call' ? generateToken() : null;

    // Recolher todos os campos do formulário (exclui os básicos e honeypot)
    const skip = new Set(['botcheck', 'form_type', 'nome', 'telefone', 'email']);
    const formData: Record<string, string> = {};
    form.forEach((value, key) => {
      if (skip.has(key)) return;
      // Checkboxes: múltiplos valores
      const existing = formData[key];
      if (existing) {
        formData[key] = existing + ', ' + String(value);
      } else {
        formData[key] = String(value);
      }
    });

    const id = crypto.randomUUID();
    const now = Date.now();

    const db = createDb(env);
    await db.insert(leads).values([{
      id,
      token,
      type,
      nome,
      telefone,
      email,
      status: 'novo',
      formData: JSON.stringify(formData),
      createdAt: now,
      updatedAt: now,
    }]);

    // Notificação para a Mariana
    await sendLeadNotification(env, { id, nome, email, telefone, type });

    return json({ success: true });
  } catch (e) {
    console.error('[api/lead] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

// ─── Diagnóstico (Skin Call) ────────────────────────────────────────────────

async function handleDiagnosticoSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { token: string; page: number; data: Record<string, string[]> };
    const { token, page, data } = body;

    if (!token || !page) return json({ success: false, error: 'Faltam dados.' }, 400);

    const db = createDb(env);

    const leadResult = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
    const leadRow = leadResult[0];
    if (!leadRow) return json({ success: false, error: 'Token expirado ou inválido.' }, 410);

    const existingDiag = await db.select().from(diagnostics).where(eq(diagnostics.leadId, leadRow.id)).limit(1);
    const diagRow = existingDiag[0];
    const now = Date.now();

    const flatData: Record<string, string> = {};
    for (const [key, values] of Object.entries(data)) {
      flatData[key] = Array.isArray(values) ? values.join(', ') : String(values);
    }

    if (diagRow) {
      await db.update(diagnostics).set({ ...flatData, pageSaved: page, updatedAt: now }).where(eq(diagnostics.id, diagRow.id));
    } else {
      await db.insert(diagnostics).values([{
        id: crypto.randomUUID(),
        leadId: leadRow.id,
        ...flatData,
        pageSaved: page,
        completed: 0,
        createdAt: now,
        updatedAt: now,
      }]);
    }

    return json({ success: true });
  } catch (e) {
    console.error('[api/diagnostico/save] error:', e);
    return json({ success: false, error: 'Erro ao guardar.' }, 500);
  }
}

async function handleDiagnostico(request: Request, env: Env): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';

    let token: string;
    let allData: Record<string, string[]> = {};
    let photos: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      token = (form.get('token') || '') as string;
      form.forEach((value, key) => {
        if (key === 'token') return;
        if (value instanceof File) {
          if (value.size > 0) photos.push(value);
        } else {
          if (!allData[key]) allData[key] = [];
          allData[key].push(String(value));
        }
      });
    } else {
      const body = await request.json() as { token: string; data: Record<string, string[]> };
      token = body.token;
      allData = body.data || {};
    }

    if (!token) return json({ success: false, error: 'Falta o token de acesso.' }, 400);

    const db = createDb(env);

    const leadResult = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
    const stored = leadResult[0];
    if (!stored) return json({ success: false, error: 'Este link expirou ou não é válido. Pede um novo.' }, 410);

    // Upload fotos para R2
    const photoUrls: string[] = [];
    if (env.DIAG_PHOTOS && photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const key = `${R2_FOLDER}/${token}/photo-${i + 1}.${ext}`;
        await env.DIAG_PHOTOS.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        photoUrls.push(key);
      }
    }

    const flatData: Record<string, string> = {};
    for (const [key, values] of Object.entries(allData)) {
      if (Array.isArray(values)) {
        flatData[key] = values.join(', ');
      } else {
        flatData[key] = String(values);
      }
    }

    flatData.consent = allData.consent?.[0] === 'on' ? 'Sim' : 'Não';

    const now = Date.now();

    const existingDiag = await db.select().from(diagnostics).where(eq(diagnostics.leadId, stored.id)).limit(1);
    const diagRow = existingDiag[0];

    if (diagRow) {
      await db.update(diagnostics).set({
        ...flatData,
        fotoFrente: photoUrls[0] || null,
        fotoPerfilEsq: photoUrls[1] || null,
        fotoPerfilDir: photoUrls[2] || null,
        completed: 1,
        updatedAt: now,
      }).where(eq(diagnostics.id, diagRow.id));
    } else {
      await db.insert(diagnostics).values([{
        id: crypto.randomUUID(),
        leadId: stored.id,
        ...flatData,
        fotoFrente: photoUrls[0] || null,
        fotoPerfilEsq: photoUrls[1] || null,
        fotoPerfilDir: photoUrls[2] || null,
        completed: 1,
        createdAt: now,
        updatedAt: now,
      }]);
    }

    // Notificar Mariana
    await sendDiagnosticComplete(env, {
      nome: stored.nome,
      email: stored.email,
      telefone: stored.telefone,
    }, stored.id);

    return json({
      success: true,
      message: 'Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.',
    });
  } catch (e) {
    console.error('[api/diagnostico] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

async function handleDiagnosticPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);

  if (!token) return renderDiagnosticError('missing');

  const db = createDb(env);

  const leadResult = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
  const stored = leadResult[0];

  if (!stored) {
    const mockLead = {
      token,
      nome: 'Dev User',
      telefone: '',
      email: '',
      plano: '',
      createdAt: Date.now(),
    };
    return renderDiagnosticPage(mockLead, page, {});
  }

  try {
    // Extrair plano do form_data JSON
    const formData = stored.formData ? JSON.parse(stored.formData) : {};
    const lead = {
      token: stored.token || '',
      nome: stored.nome,
      telefone: stored.telefone,
      email: stored.email,
      plano: formData.plano || '',
      createdAt: stored.createdAt,
    };

    const savedData = await loadSavedData(env, stored.id);
    return renderDiagnosticPage(lead, page, savedData);
  } catch (e) {
    console.error('[diagnostico] page error:', e);
    return renderDiagnosticError('invalid');
  }
}

async function loadSavedData(env: Env, leadId: string): Promise<Record<string, string[]>> {
  const db = createDb(env);
  const diagResult = await db.select().from(diagnostics).where(eq(diagnostics.leadId, leadId)).limit(1);
  const diag = diagResult[0];

  if (!diag) return {};

  const merged: Record<string, string[]> = {};
  const fieldsToConvert: [string, string][] = [
    ['situacao', 'situacao'], ['diagnosticoMedico', 'diagnostico_medico'],
    ['sonoTipo', 'sono_tipo'], ['aguaIngestao', 'agua_ingestao'],
    ['alimentacao', 'alimentacao'], ['exposicaoSolar', 'exposicao_solar'],
    ['ambienteFatores', 'ambiente_fatores'], ['peleAcordar', 'pele_acordar'],
    ['pele2h', 'pele_2h'], ['peleTarde', 'pele_tarde'],
    ['peleTextura', 'pele_textura'], ['peleCor', 'pele_cor'],
    ['peleToque', 'pele_toque'], ['peleAmbiente', 'pele_ambiente'],
    ['peleBorbulhas', 'pele_borbulhas'], ['peleFirmeza', 'pele_firmeza'],
    ['peleContornoOlhos', 'pele_contorno_olhos'],
    ['rotinaConsistencia', 'rotina_consistencia'],
    ['rotinaMaquilhagemFreq', 'rotina_maquilhagem_freq'],
    ['rotinaMaquilhagemRetirar', 'rotina_maquilhagem_retirar'],
    ['rotinaLavarRosto', 'rotina_lavar_rosto'],
    ['preferenciasTempo', 'preferencias_tempo'],
    ['preferenciasTexturas', 'preferencias_texturas'],
    ['preferenciasDificuldades', 'preferencias_dificuldades'],
    ['preferenciasOrcamento', 'preferencias_orcamento'],
    ['stressNivel', 'stress_nivel'], ['sonoLado', 'sono_lado'],
    ['sonoFronha', 'sono_fronha'], ['alimentacaoOutro', 'alimentacao_outro'],
    ['peleTexturaOutro', 'pele_textura_outro'], ['peleCorOutro', 'pele_cor_outro'],
    ['peleToqueOutro', 'pele_toque_outro'], ['rotinaManha', 'rotina_manha'],
    ['rotinaNoite', 'rotina_noite'], ['rotinaEsfoliacao', 'rotina_esfoliacao'],
    ['rotinaMascaras', 'rotina_mascaras'], ['rotinaDispositivos', 'rotina_dispositivos'],
    ['rotinaFavorito', 'rotina_favorito'], ['rotinaOdeia', 'rotina_odeia'],
    ['rotinaPinceis', 'rotina_pinceis'], ['rotinaTelemovel', 'rotina_telemovel'],
    ['rotinaMexerRosto', 'rotina_mexer_rosto'], ['rotinaEspremer', 'rotina_espremer'],
    ['rotinaDepilacao', 'rotina_depilacao'],
    ['preferenciasTexturasOutro', 'preferencias_texturas_outro'],
    ['preferenciasDificuldadesOutro', 'preferencias_dificuldades_outro'],
    ['prioridade1', 'prioridade_1'], ['prioridade2', 'prioridade_2'],
    ['perguntaNaoPodeFicar', 'pergunta_nao_pode_ficar'],
    ['maisAlgumaCoisa', 'mais_alguma_coisa'],
  ];

  for (const [camel, snake] of fieldsToConvert) {
    const value = diag[camel as keyof typeof diag] as string | null;
    if (value) {
      merged[snake] = value.split(', ');
    }
  }

  return merged;
}

// ─── Admin API handlers ─────────────────────────────────────────────────────

async function handleUpdateStatus(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const body = await request.json() as { status: string };
    const { status } = body;

    const validStatuses = [
      'novo', 'orcamento_enviado', 'aguarda_resposta', 'em_analise',
      'proposta_enviada', 'aceite', 'em_curso', 'concluido', 'recusado', 'desativo',
    ];
    if (!validStatuses.includes(status)) {
      return json({ error: 'Estado inválido' }, 400);
    }

    const db = createDb(env);
    await db.update(leads).set({ status, updatedAt: Date.now() }).where(eq(leads.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/status] error:', e);
    return json({ error: 'Erro ao atualizar estado' }, 500);
  }
}

async function handleSendQuote(request: Request, env: Env, id: string | undefined, userId: string): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const body = await request.json() as { subject: string; html: string };
    const { subject, html } = body;

    if (!subject || !html) {
      return json({ error: 'Assunto e corpo do email são obrigatórios.' }, 400);
    }

    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);

    // Enviar email ao cliente
    await sendQuoteEmail(env, lead.email, subject, html);

    // Atualizar estado da lead
    await db.update(leads).set({ status: 'orcamento_enviado', updatedAt: Date.now() }).where(eq(leads.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/quote] error:', e);
    return json({ error: 'Erro ao enviar orçamento' }, 500);
  }
}

async function handleDiagnosticInvite(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (!lead.token) return json({ error: 'Esta lead não tem token de diagnóstico.' }, 400);

    await sendDiagnosticInvite(env, {
      nome: lead.nome,
      email: lead.email,
      token: lead.token,
    });

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/diagnostic-invite] error:', e);
    return json({ error: 'Erro ao enviar convite' }, 500);
  }
}

async function handleAcceptLead(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);

    const now = Date.now();

    // Criar cliente
    await db.insert(clients).values([{
      id: crypto.randomUUID(),
      leadId: lead.id,
      type: lead.type,
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      data: lead.formData,
      createdAt: now,
      updatedAt: now,
    }]);

    // Atualizar estado da lead
    await db.update(leads).set({ status: 'aceite', updatedAt: now }).where(eq(leads.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/accept] error:', e);
    return json({ error: 'Erro ao aceitar lead' }, 500);
  }
}

async function handleClientDiagnosticInvite(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const clientResult = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    const client = clientResult[0];

    if (!client) return json({ error: 'Cliente não encontrado.' }, 404);

    // Buscar a lead original para ter o token
    const leadResult = await db.select().from(leads).where(eq(leads.id, client.leadId)).limit(1);
    const lead = leadResult[0];

    if (!lead || !lead.token) return json({ error: 'Lead original sem token de diagnóstico.' }, 400);

    await sendDiagnosticInvite(env, {
      nome: client.nome,
      email: client.email,
      token: lead.token,
    });

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/client/diagnostic-invite] error:', e);
    return json({ error: 'Erro ao enviar convite' }, 500);
  }
}

async function handleServePhoto(env: Env, key: string): Promise<Response> {
  if (!env.DIAG_PHOTOS) return json({ error: 'R2 não configurado' }, 503);
  if (!key) return json({ error: 'Key inválida' }, 400);

  try {
    const object = await env.DIAG_PHOTOS.get(key);
    if (!object) return json({ error: 'Foto não encontrada' }, 404);

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'private, max-age=3600');

    return new Response(object.body, { headers });
  } catch (e) {
    console.error('[api/admin/photo] error:', e);
    return json({ error: 'Erro ao carregar foto' }, 500);
  }
}
