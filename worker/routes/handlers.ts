// Route handlers extracted from the Worker entrypoint.

import { eq, desc, like, or, gte, lte, and } from 'drizzle-orm';
import { allowRequest, generateToken, isBot, isValidEmail, json, readForm, validateLead, type Env, type LeadType } from '../lib';
import { createDb } from '../db';
import { leads, diagnostics, users, clients, settings as settingsTable } from '../db/schema';
import { sendLeadNotification, sendDiagnosticComplete, diagnosticInviteContent } from '../email';
import { renderDiagnosticError, renderDiagnosticPage } from '../diagnostico';
import { createSession, destroySession, generateCsrfToken } from '../auth/session';
import { setSessionCookie, getSessionCookie, clearSessionCookie } from '../auth/cookies';
import { verifyPassword } from '../auth/password';
import { getPricing } from '../pricing';
import { getCookieValue } from '../http';
import { generateQuoteHtml, generateQuoteSubject } from '../services/quotes';
import { isSafePhotoKey, isUploadedPhoto, MAX_PHOTOS, MAX_PHOTO_BYTES, prepareStoredPhoto, sniffImageType } from '../photos';
import {
  getOrCreateConversationForLead,
  getOrCreateConversationForClient,
  sendConversationMessage,
  linkConversationToClient,
} from '../conversation';

export async function handleLogin(request: Request, env: Env): Promise<Response> {
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
    const csrfToken = generateCsrfToken();
    const headers = new Headers();
    setSessionCookie(headers, sessionId);
    headers.append('Set-Cookie', `csrf_token=${csrfToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify({ success: true, redirect: '/admin' }), { status: 200, headers });
  } catch (e) {
    console.error('[api/admin/login] error:', e);
    return json({ success: false, error: 'Erro no servidor.' }, 500);
  }
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const sessionId = getSessionCookie(request);
  if (sessionId) await destroySession(env, sessionId);

  const headers = new Headers();
  clearSessionCookie(headers);
  headers.append('Set-Cookie', 'csrf_token=; Path=/; Max-Age=0');
  headers.set('Content-Type', 'application/json');

  headers.set('Location', '/admin/login');
  return new Response(null, { status: 302, headers });
}

// ─── Lead creation (todos os tipos) ─────────────────────────────────────────

export async function handleLead(request: Request, env: Env): Promise<Response> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    const form = await readForm(request);
    if (isBot(form)) return json({ success: true });

    const rawType = (form.get('form_type') || 'skin-call') as string;
    const opcaoServico = (form.get('opcao_servico') || '') as string;

    // Separar bridal-beauty em bridal ou beauty baseado em opcao_servico
    let type: LeadType;
    if (rawType === 'bridal-beauty') {
      type = opcaoServico === 'Bride' ? 'bridal' : 'beauty';
    } else {
      type = rawType as LeadType;
    }
    const nome = ((form.get('nome') || '') as string).trim();
    const telefone = ((form.get('telefone') || '') as string).trim();
    const email = ((form.get('email') || '') as string).trim().toLowerCase();

    const err = validateLead({ nome, telefone, email, type });
    if (err) return json({ success: false, error: err }, 400);

    const allowed = await allowRequest(env, clientIP, email);
    if (!allowed) {
      return json({ success: false, error: 'Demasiadas tentativas. Tenta mais tarde.' }, 429);
    }

    // Token para todos os tipos (usado no diagnóstico Skin Call)
    const token = generateToken();

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

/** Form snake_case → Drizzle camelCase (só colunas do schema). */
const DIAGNOSTIC_SNAKE_TO_CAMEL: Record<string, string> = {
  idade: 'idade',
  situacao: 'situacao',
  doenca_cronica: 'doencaCronica',
  alergias_alimentares: 'alergiasAlimentares',
  alergias_cosmeticos: 'alergiasCosmeticos',
  medicacao_continua: 'medicacaoContinua',
  diagnostico_medico: 'diagnosticoMedico',
  diagnostico_outro: 'diagnosticoOutro',
  medicacao_oral: 'medicacaoOral',
  medicacao_topica: 'medicacaoTopica',
  tratamentos_esteticos: 'tratamentosEsteticos',
  burnout_cutaneo: 'burnoutCutaneo',
  vasos_visiveis: 'vasosVisiveis',
  rubor: 'rubor',
  reacao_estacoes: 'reacaoEstacoes',
  stress_nivel: 'stressNivel',
  sono_tipo: 'sonoTipo',
  sono_lado: 'sonoLado',
  sono_fronha: 'sonoFronha',
  agua_ingestao: 'aguaIngestao',
  alimentacao: 'alimentacao',
  alimentacao_outro: 'alimentacaoOutro',
  exposicao_solar: 'exposicaoSolar',
  ambiente_fatores: 'ambienteFatores',
  ambiente_fatores_outro: 'ambienteFatoresOutro',
  pele_acordar: 'peleAcordar',
  pele_acordar_outro: 'peleAcordarOutro',
  pele_2h: 'pele2h',
  pele_2h_outro: 'pele2hOutro',
  pele_tarde: 'peleTarde',
  pele_tarde_outro: 'peleTardeOutro',
  pele_textura: 'peleTextura',
  pele_textura_outro: 'peleTexturaOutro',
  pele_cor: 'peleCor',
  pele_cor_outro: 'peleCorOutro',
  pele_toque: 'peleToque',
  pele_toque_outro: 'peleToqueOutro',
  pele_ambiente: 'peleAmbiente',
  pele_ambiente_outro: 'peleAmbienteOutro',
  pele_borbulhas: 'peleBorbulhas',
  pele_borbulhas_outro: 'peleBorbulhasOutro',
  pele_firmeza: 'peleFirmeza',
  pele_firmeza_outro: 'peleFirmezaOutro',
  pele_contorno_olhos: 'peleContornoOlhos',
  rotina_manha: 'rotinaManha',
  rotina_noite: 'rotinaNoite',
  rotina_consistencia: 'rotinaConsistencia',
  rotina_esfoliacao: 'rotinaEsfoliacao',
  rotina_mascaras: 'rotinaMascaras',
  rotina_dispositivos: 'rotinaDispositivos',
  rotina_favorito: 'rotinaFavorito',
  rotina_odeia: 'rotinaOdeia',
  rotina_maquilhagem_freq: 'rotinaMaquilhagemFreq',
  rotina_maquilhagem_retirar: 'rotinaMaquilhagemRetirar',
  rotina_maquilhagem_retirar_outro: 'rotinaMaquilhagemRetirarOutro',
  rotina_lavar_rosto: 'rotinaLavarRosto',
  rotina_lavar_rosto_outro: 'rotinaLavarRostoOutro',
  rotina_pinceis: 'rotinaPinceis',
  rotina_telemovel: 'rotinaTelemovel',
  rotina_mexer_rosto: 'rotinaMexerRosto',
  rotina_espremer: 'rotinaEspremer',
  rotina_depilacao: 'rotinaDepilacao',
  preferencias_tempo: 'preferenciasTempo',
  preferencias_texturas: 'preferenciasTexturas',
  preferencias_texturas_outro: 'preferenciasTexturasOutro',
  preferencias_dificuldades: 'preferenciasDificuldades',
  preferencias_dificuldades_outro: 'preferenciasDificuldadesOutro',
  preferencias_orcamento: 'preferenciasOrcamento',
  prioridade_1: 'prioridade1',
  prioridade_2: 'prioridade2',
  pergunta_nao_pode_ficar: 'perguntaNaoPodeFicar',
  mais_alguma_coisa: 'maisAlgumaCoisa',
  consent: 'consent',
};

function mapDiagnosticFormToColumns(data: Record<string, string | string[]>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, values] of Object.entries(data)) {
    const camel = DIAGNOSTIC_SNAKE_TO_CAMEL[key];
    if (!camel) continue;
    mapped[camel] = Array.isArray(values) ? values.join(', ') : String(values);
  }
  return mapped;
}

async function resolveClientForLead(
  db: ReturnType<typeof createDb>,
  leadId: string
): Promise<{ id: string; nome: string; email: string; telefone: string } | null> {
  const result = await db.select().from(clients).where(eq(clients.leadId, leadId)).limit(1);
  const client = result[0];
  if (!client) return null;
  return { id: client.id, nome: client.nome, email: client.email, telefone: client.telefone };
}

export async function handleDiagnosticoSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { token: string; page: number; data: Record<string, string[]> };
    const { token, page, data } = body;

    if (!token || !page) return json({ success: false, error: 'Faltam dados.' }, 400);

    const db = createDb(env);

    const leadResult = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
    const leadRow = leadResult[0];
    if (!leadRow) return json({ success: false, error: 'Token expirado ou inválido.' }, 410);

    const client = await resolveClientForLead(db, leadRow.id);
    if (!client) {
      return json({ success: false, error: 'Diagnóstico só está disponível após aceitar a lead (cliente).' }, 400);
    }

    const existingDiag = await db.select().from(diagnostics).where(eq(diagnostics.leadId, leadRow.id)).limit(1);
    const diagRow = existingDiag[0];
    const now = Date.now();
    const columns = mapDiagnosticFormToColumns(data);

    if (diagRow) {
      await db.update(diagnostics).set({
        ...columns,
        clientId: client.id,
        pageSaved: page,
        updatedAt: now,
      }).where(eq(diagnostics.id, diagRow.id));
    } else {
      await db.insert(diagnostics).values([{
        id: crypto.randomUUID(),
        leadId: leadRow.id,
        clientId: client.id,
        ...columns,
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

export async function handleDiagnostico(request: Request, env: Env): Promise<Response> {
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
        if (isUploadedPhoto(value)) {
          photos.push(value);
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

    const client = await resolveClientForLead(db, stored.id);
    if (!client) {
      return json({ success: false, error: 'Diagnóstico só está disponível após aceitar a lead (cliente).' }, 400);
    }

    // Upload fotos para R2. HEIC is converted in the browser (admin + diagnostico).
    const photoUrls: string[] = [];
    if (env.DIAG_PHOTOS && photos.length > 0) {
      if (photos.length > MAX_PHOTOS) {
        return json({ success: false, error: 'Envia no máximo 3 fotos.' }, 400);
      }
      if (photos.some((file) => file.size > MAX_PHOTO_BYTES)) {
        return json({ success: false, error: 'Uma das fotos é demasiado grande (máx. 20 MB).' }, 400);
      }
      for (let i = 0; i < photos.length; i++) {
        const photo = await prepareStoredPhoto(photos[i], i + 1, token);
        await env.DIAG_PHOTOS.put(photo.key, photo.body, {
          httpMetadata: { contentType: photo.contentType },
        });
        photoUrls.push(photo.key);
      }
    }

    const columns = mapDiagnosticFormToColumns(allData);
    columns.consent = allData.consent?.[0] === 'on' || allData.consent?.[0] === 'Sim' ? 'Sim' : 'Não';

    const now = Date.now();

    const existingDiag = await db.select().from(diagnostics).where(eq(diagnostics.leadId, stored.id)).limit(1);
    const diagRow = existingDiag[0];

    const photoFields = photoUrls.length > 0
      ? {
          fotoFrente: photoUrls[0] || null,
          fotoPerfilEsq: photoUrls[1] || null,
          fotoPerfilDir: photoUrls[2] || null,
        }
      : {};

    if (diagRow) {
      await db.update(diagnostics).set({
        ...columns,
        clientId: client.id,
        ...photoFields,
        completed: 1,
        updatedAt: now,
      }).where(eq(diagnostics.id, diagRow.id));
    } else {
      await db.insert(diagnostics).values([{
        id: crypto.randomUUID(),
        leadId: stored.id,
        clientId: client.id,
        ...columns,
        fotoFrente: photoUrls[0] || null,
        fotoPerfilEsq: photoUrls[1] || null,
        fotoPerfilDir: photoUrls[2] || null,
        completed: 1,
        createdAt: now,
        updatedAt: now,
      }]);
    }

    // Notificar Mariana - link para a página do cliente
    await sendDiagnosticComplete(env, {
      nome: client.nome || stored.nome,
      email: client.email || stored.email,
      telefone: client.telefone || stored.telefone,
    }, client.id);

    return json({
      success: true,
      message: 'Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.',
    });
  } catch (e) {
    console.error('[api/diagnostico] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

export async function handleDiagnosticPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);

  if (!token) return renderDiagnosticError('missing');

  const db = createDb(env);

  const leadResult = await db.select().from(leads).where(eq(leads.token, token)).limit(1);
  const stored = leadResult[0];

  if (!stored) {
    const isLocal = !env.RESEND_API_KEY || env.RESEND_API_KEY.startsWith('REPLACE');
    if (!isLocal) return renderDiagnosticError('invalid');
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

    // Já submetido: não reabrir respostas (evita misturar com outro formulário no mesmo browser)
    const diagResult = await db.select({ completed: diagnostics.completed })
      .from(diagnostics)
      .where(eq(diagnostics.leadId, stored.id))
      .limit(1);
    if (diagResult[0]?.completed === 1 || page === 4) {
      return renderDiagnosticPage(lead, 4, {});
    }

    const savedData = await loadSavedData(env, stored.id);
    return renderDiagnosticPage(lead, page, savedData);
  } catch (e) {
    console.error('[diagnostico] page error:', e);
    return renderDiagnosticError('invalid');
  }
}

export async function loadSavedData(env: Env, leadId: string): Promise<Record<string, string[]>> {
  const db = createDb(env);
  const diagResult = await db.select().from(diagnostics).where(eq(diagnostics.leadId, leadId)).limit(1);
  const diag = diagResult[0];

  if (!diag) return {};

  const merged: Record<string, string[]> = {};
  for (const [snake, camel] of Object.entries(DIAGNOSTIC_SNAKE_TO_CAMEL)) {
    const value = diag[camel as keyof typeof diag] as string | null | undefined;
    if (value) {
      merged[snake] = value.split(', ');
    }
  }

  return merged;
}

// ─── Admin API handlers ─────────────────────────────────────────────────────

/** Lead aceite ou eliminada: sem mais ações no admin. */
function isLeadLocked(status: string): boolean {
  return status === 'aceite' || status === 'eliminado';
}

const LEAD_LOCKED_MSG = 'Esta lead está fechada (aceite ou eliminada) - não é possível alterar.';

export async function handleUpdateStatus(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const body = await request.json() as { status: string };
    const { status } = body;

    const validStatuses = ['novo', 'pendente', 'eliminado'];
    if (!validStatuses.includes(status)) {
      return json({ error: 'Estado inválido. Para aceitar, usa a ação Aceitar.' }, 400);
    }

    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];
    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);

    await db.update(leads).set({ status, updatedAt: Date.now() }).where(eq(leads.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/status] error:', e);
    return json({ error: 'Erro ao atualizar estado' }, 500);
  }
}

export async function handlePreviewQuote(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);

    const formData = lead.formData ? JSON.parse(lead.formData) : {};
    const pricing = await getPricing(env);
    const html = generateQuoteHtml(lead.type as LeadType, formData, pricing);
    const subject = generateQuoteSubject(lead.type as LeadType);

    return json({ success: true, subject, html });
  } catch (e) {
    console.error('[api/admin/lead/preview] error:', e);
    return json({ error: 'Erro ao gerar preview' }, 500);
  }
}

export async function handleEditLead(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const body = await request.json() as {
      nome?: string;
      email?: string;
      telefone?: string;
      status?: string;
      type?: string;
      formData?: Record<string, string>;
    };

    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);

    if (body.status !== undefined) {
      if (!['novo', 'pendente', 'eliminado'].includes(body.status)) {
        return json({ error: 'Estado inválido. Para aceitar, usa a ação Aceitar.' }, 400);
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.nome !== undefined) updates.nome = body.nome.trim();
    if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
    if (body.telefone !== undefined) updates.telefone = body.telefone.trim();
    if (body.status !== undefined) updates.status = body.status;
    if (body.type !== undefined) updates.type = body.type;
    if (body.formData !== undefined) updates.formData = JSON.stringify(body.formData);

    await db.update(leads).set(updates).where(eq(leads.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/edit] error:', e);
    return json({ error: 'Erro ao editar lead' }, 500);
  }
}

export async function handleEditClient(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const body = await request.json() as {
      nome?: string;
      email?: string;
      telefone?: string;
      type?: string;
      data?: Record<string, string>;
    };

    const db = createDb(env);
    const clientResult = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    const client = clientResult[0];

    if (!client) return json({ error: 'Cliente não encontrado.' }, 404);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.nome !== undefined) updates.nome = body.nome.trim();
    if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
    if (body.telefone !== undefined) updates.telefone = body.telefone.trim();
    if (body.type !== undefined) updates.type = body.type;
    if (body.data !== undefined) updates.data = JSON.stringify(body.data);

    await db.update(clients).set(updates).where(eq(clients.id, id));

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/client/edit] error:', e);
    return json({ error: 'Erro ao editar cliente' }, 500);
  }
}

export async function handleUpdateSettings(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as Record<string, string>;
    const db = createDb(env);
    const now = Date.now();

    for (const [key, value] of Object.entries(body)) {
      if (key === 'google_calendar_refresh_token') continue;
      await db.insert(settingsTable).values({ key, value, updatedAt: now }).onConflictDoUpdate({
        target: settingsTable.key,
        set: { value, updatedAt: now },
      });
    }

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/settings] error:', e);
    return json({ error: 'Erro ao guardar settings' }, 500);
  }
}

export async function handleSendQuote(request: Request, env: Env, id: string | undefined, userId: string): Promise<Response> {
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
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);

    const conv = await getOrCreateConversationForLead(env, lead.id);
    const result = await sendConversationMessage(env, {
      conversationId: conv.id,
      to: lead.email,
      subject,
      html,
      userId,
      templateKind: 'quote',
    });
    if (!result.ok) return json({ error: result.error || 'Erro ao enviar orçamento' }, 502);

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/quote] error:', e);
    return json({ error: 'Erro ao enviar orçamento' }, 500);
  }
}

export async function handleDiagnosticInvite(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);
    if (!lead.token) return json({ error: 'Esta lead não tem token de diagnóstico.' }, 400);

    const content = diagnosticInviteContent(env, { nome: lead.nome, token: lead.token });
    const conv = await getOrCreateConversationForLead(env, lead.id);
    const result = await sendConversationMessage(env, {
      conversationId: conv.id,
      to: lead.email,
      subject: content.subject,
      html: content.html,
      userId: 'system',
      templateKind: 'diagnostic_invite',
    });
    if (!result.ok) return json({ error: result.error || 'Erro ao enviar convite' }, 502);

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/lead/diagnostic-invite] error:', e);
    return json({ error: 'Erro ao enviar convite' }, 500);
  }
}

export async function handleAcceptLead(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const leadResult = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = leadResult[0];

    if (!lead) return json({ error: 'Lead não encontrada.' }, 404);
    if (isLeadLocked(lead.status)) return json({ error: LEAD_LOCKED_MSG }, 409);

    const existingClient = await db.select({ id: clients.id }).from(clients).where(eq(clients.leadId, lead.id)).limit(1);
    if (existingClient[0]) {
      return json({ error: 'Esta lead já tem um cliente associado (relação 1:1).' }, 409);
    }

    const now = Date.now();
    const clientId = crypto.randomUUID();

    await db.insert(clients).values([{
      id: clientId,
      leadId: lead.id,
      type: lead.type,
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      data: lead.formData,
      createdAt: now,
      updatedAt: now,
    }]);

    await db.update(leads).set({ status: 'aceite', updatedAt: now }).where(eq(leads.id, id));
    await linkConversationToClient(env, lead.id, clientId);

    return json({ success: true, id: clientId });
  } catch (e) {
    console.error('[api/admin/lead/accept] error:', e);
    return json({ error: 'Erro ao aceitar lead' }, 500);
  }
}

export async function handleClientDiagnosticInvite(request: Request, env: Env, id: string | undefined): Promise<Response> {
  if (!id) return json({ error: 'ID inválido' }, 400);

  try {
    const db = createDb(env);
    const clientResult = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    const client = clientResult[0];

    if (!client) return json({ error: 'Cliente não encontrado.' }, 404);
    if (!client.leadId) return json({ error: 'Cliente sem lead associada - sem token de diagnóstico.' }, 400);

    // Buscar a lead original para ter o token
    const leadResult = await db.select().from(leads).where(eq(leads.id, client.leadId)).limit(1);
    const lead = leadResult[0];

    if (!lead || !lead.token) return json({ error: 'Lead original sem token de diagnóstico.' }, 400);

    const content = diagnosticInviteContent(env, { nome: client.nome, token: lead.token });
    const conv = await getOrCreateConversationForClient(env, client.id);
    const result = await sendConversationMessage(env, {
      conversationId: conv.id,
      to: client.email,
      subject: content.subject,
      html: content.html,
      userId: 'system',
      templateKind: 'diagnostic_invite',
    });
    if (!result.ok) return json({ error: result.error || 'Erro ao enviar convite' }, 502);

    return json({ success: true });
  } catch (e) {
    console.error('[api/admin/client/diagnostic-invite] error:', e);
    return json({ error: 'Erro ao enviar convite' }, 500);
  }
}

export async function handleCreateClient(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { nome: string; email: string; telefone: string; type: string; notes?: string };

    if (!body.nome || body.nome.trim().length < 2) return json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, 400);
    if (!body.email || !isValidEmail(body.email.trim())) return json({ error: 'Email não é válido.' }, 400);
    if (!body.telefone || body.telefone.trim().length < 6) return json({ error: 'Telefone deve ter pelo menos 6 caracteres.' }, 400);
    if (!body.type || !['skin-call', 'bridal', 'beauty', 'education'].includes(body.type)) {
      return json({ error: 'Tipo inválido.' }, 400);
    }

    const db = createDb(env);
    const now = Date.now();

    const clientId = crypto.randomUUID();
    await db.insert(clients).values([{
      id: clientId,
      leadId: null,
      type: body.type,
      nome: body.nome.trim(),
      telefone: body.telefone.trim(),
      email: body.email.trim().toLowerCase(),
      data: body.notes ? JSON.stringify({ notes: body.notes }) : null,
      createdAt: now,
      updatedAt: now,
    }]);

    return json({ success: true, id: clientId });
  } catch (e) {
    console.error('[api/admin/client] error:', e);
    return json({ error: 'Erro ao criar cliente' }, 500);
  }
}

export async function handleExportLeads(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const db = createDb(env);

  const conditions = [];
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  if (status && ['novo', 'pendente', 'aceite', 'eliminado'].includes(status)) {
    conditions.push(eq(leads.status, status));
  }
  if (type && ['skin-call', 'bridal', 'beauty', 'education'].includes(type)) {
    conditions.push(eq(leads.type, type));
  }
  if (search) {
    const q = `%${search}%`;
    conditions.push(or(like(leads.nome, q), like(leads.email, q))!);
  }
  if (dateFrom) {
    const ts = new Date(dateFrom).getTime();
    conditions.push(gte(leads.createdAt, ts));
  }
  if (dateTo) {
    const ts = new Date(dateTo).getTime() + 86400 * 1000;
    conditions.push(lte(leads.createdAt, ts));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(leads).where(where).orderBy(desc(leads.createdAt)) as typeof leads.$inferSelect[];

  const header = 'ID,Tipo,Nome,Email,Telefone,Estado,Criado em\n';
  const csvRows = rows.map(r => {
    const date = new Date(r.createdAt).toISOString().split('T')[0];
    return `${r.id},${r.type},"${r.nome.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}",${r.telefone},${r.status},${date}`;
  }).join('\n');

  return new Response(header + csvRows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
    },
  });
}

export async function handleExportClients(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const db = createDb(env);

  const conditions = [];
  const search = url.searchParams.get('search');

  if (search) {
    const q = `%${search}%`;
    conditions.push(or(like(clients.nome, q), like(clients.email, q))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(clients).where(where).orderBy(desc(clients.createdAt)) as typeof clients.$inferSelect[];

  const header = 'ID,Tipo,Nome,Email,Telefone,Criado em\n';
  const csvRows = rows.map(r => {
    const date = new Date(r.createdAt).toISOString().split('T')[0];
    return `${r.id},${r.type},"${r.nome.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}",${r.telefone},${date}`;
  }).join('\n');

  return new Response(header + csvRows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients.csv"',
    },
  });
}

export async function handleServePhoto(env: Env, key: string): Promise<Response> {
  if (!env.DIAG_PHOTOS) return json({ error: 'R2 não configurado' }, 503);
  if (!isSafePhotoKey(key)) return json({ error: 'Key inválida' }, 400);

  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return json({ error: 'Key inválida' }, 400);
  }

  try {
    const object = await env.DIAG_PHOTOS.get(decoded);
    if (!object) return json({ error: 'Foto não encontrada' }, 404);

    const bytes = await object.arrayBuffer();
    const contentType = sniffImageType(
      new Uint8Array(bytes),
      object.httpMetadata?.contentType || 'image/jpeg',
    );

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'private, max-age=3600');

    return new Response(bytes, { headers });
  } catch (e) {
    console.error('[api/admin/photo] error:', e);
    return json({ error: 'Erro ao carregar foto' }, 500);
  }
}
