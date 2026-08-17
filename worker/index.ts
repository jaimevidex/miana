// Entry point do Worker — serve os assets estáticos do Astro e adiciona o funnel Skin Call.
//
// Rotas:
//   POST /api/lead            Stage 1: grava lead no KV, envia email com link, devolve { url }.
//   GET  /diagnostico?token=  Página privada pré-preenchida (dados do KV, não do browser).
//   POST /api/diagnostico     Stage 2: submete o diagnóstico como pedido real (email à dona).
//   POST /api/contact         Formulários genéricos (Bridal, Education) — envia email à dona.

import { allowRequest, generateToken, isBot, isValidEmail, json, LEAD_TTL, readForm, validateLead, type Env, type Lead, type LeadInput } from './lib';
import { sendDiagnosticInvite, sendFormEmail, sendOwnerRequest } from './email';
import { renderDiagnosticError, renderDiagnosticPage } from './diagnostico';

// OK: tripé CORS e honeypot. Todos os posts vêm do nosso próprio domínio, mas aceitamos origins.
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

    if (path === '/api/lead' && method === 'POST') return handleLead(request, env);
    if (path === '/api/contact' && method === 'POST') return handleContact(request, env);
    if (path === '/api/diagnostico' && method === 'POST') return handleDiagnostico(request, env);
    if (path === '/diagnostico' && method === 'GET') return handleDiagnosticPage(request, env);

    // Tudo o resto: assets estáticos do Astro.
    return env.ASSETS.fetch(request as Request);
  },
} satisfies ExportedHandler<Env>;

// Stage 1 — guardar o lead e devolver o link do diagnóstico.
async function handleLead(request: Request, env: Env): Promise<Response> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    const form = await readForm(request);

    if (isBot(form)) {
      // Bot preencheu o honey pot — devolvemos sucesso falso, mas não gravamos nada.
      return json({ success: true, url: '/servicos/skin-call' });
    }

    const lead = {
      nome: (form.get('nome') || '') as string,
      telefone: (form.get('telefone') || '') as string,
      email: ((form.get('email') || '') as string).trim().toLowerCase(),
      plano: (form.get('plano') || '') as string,
    };

    const err = validateLead(lead);
    if (err) return json({ success: false, error: err }, 400);

    const allowed = await allowRequest(env, clientIP, lead.email);
    if (!allowed) {
      return json({ success: false, error: 'Demasiadas tentativas. Tenta mais tarde.' }, 429);
    }

    const token = generateToken();
    const record: Lead = {
      token,
      ...lead,
      createdAt: Date.now(),
    };
    await env.LEADS.put(`lead:${token}`, JSON.stringify(record), { expirationTtl: LEAD_TTL });

    // Em paralelo: enviar email ao lead com o link do diagnóstico. Nunca bloqueia a resposta.
    await Promise.allSettled([
      sendDiagnosticInvite(env, { nome: lead.nome, email: lead.email, token }),
    ]);

    const url = `/diagnostico?token=${encodeURIComponent(token)}`;
    return json({ success: true, url });
  } catch (e) {
    console.error('[api/lead] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

// Formulários genéricos (Bridal/Education) — envia um email à dona com os campos preenchidos.
async function handleContact(request: Request, env: Env): Promise<Response> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  try {
    const form = await readForm(request);
    if (isBot(form)) return json({ success: true });

    const nome = ((form.get('nome') || '') as string).trim();
    const email = ((form.get('email') || '') as string).trim().toLowerCase();

    // Validação mínima: nome + email têm de existir (resto fica ao critério do formulário).
    if (nome.length < 2) return json({ success: false, error: 'Falta o nome.' }, 400);
    if (!isValidEmail(email)) return json({ success: false, error: 'Falta um email válido.' }, 400);

    const allowed = await allowRequest(env, clientIP, email);
    if (!allowed) return json({ success: false, error: 'Demasiadas tentativas. Tenta mais tarde.' }, 429);

    // Ignora campos de sistema/honeypot e monta os campos legíveis a partir do form.
    const skip = new Set(['botcheck', 'access_key', 'subject']);
    const subject = ((form.get('subject') || '') as string).trim() || 'Novo pedido';
    const FIELD_LABELS: Record<string, string> = {
      nome: 'Nome', telefone: 'Contacto telefónico', email: 'E-mail',
      opcao_servico: 'Opção de serviço', data_casamento: 'Data do casamento',
      hora_pronta: 'Hora de estar pronta', local_preparacao: 'Local da preparação',
      local_prova: 'Local da prova', servicos_procurados: 'Serviços procurados',
      numero_guests: 'Número de guests', addon_skin_call: 'Add-on Skin Call',
      data_evento: 'Data do evento', hora_pronta_evento: 'Hora do evento',
      local_evento: 'Local do evento', servicos_procurados_guests: 'Serviços procurados',
      numero_pessoas: 'Número de pessoas', mensagem: 'Mensagem',
      formato: 'Formato', local_workshop: 'Local do workshop', data_hora: 'Data e hora',
      tipo: 'Tipo', modalidade: 'Modalidade', numero_participantes: 'Número de participantes',
      regime: 'Regime',
    };

    const fields: [string, string][] = [];
    form.forEach((value, key) => {
      if (skip.has(key)) return;
      const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
      fields.push([label, String(value)]);
    });

    // Rapidamente: monta o assunto com o nome se não estiver incluído.
    const finalSubject = subject.includes(nome) ? subject : `${subject} — ${nome}`;

    await sendFormEmail(env, { subject: finalSubject, fields });

    return json({ success: true, message: 'Obrigada! O teu pedido foi registado. Entrarei em contacto dentro de 48h.' });
  } catch (e) {
    console.error('[api/contact] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

// Stage 2 — submete o diagnóstico como pedido real.
async function handleDiagnostico(request: Request, env: Env): Promise<Response> {
  try {
    const form = await readForm(request);
    if (isBot(form)) return json({ success: true, message: 'Enviado!' });

    const token = (form.get('token') || '') as string;
    if (!token) return json({ success: false, error: 'Falta o token de acesso.' }, 400);

    const raw = await env.LEADS.get(`lead:${token}`);
    if (!raw) return json({ success: false, error: 'Este link expirou (48h) ou não é válido. Pede um novo.' }, 410);

    const stored: Lead = JSON.parse(raw);
    const payload = {
      nome: (form.get('nome') || stored.nome) as string,
      telefone: (form.get('telefone') || stored.telefone) as string,
      email: ((form.get('email') || stored.email) as string).trim().toLowerCase(),
      plano: (form.get('plano') || stored.plano) as string,
      rotina: (form.get('rotina') || '') as string,
      rotina_frequencia: (form.get('rotina_frequencia') || '') as string,
      preocupacoes: form.getAll('preocupacoes').join(', '),
      alergias: (form.get('alergias') || '') as string,
      consent: (form.get('consent') === 'on') ? 'Sim' : 'Não',
    };

    const err = validateLead(payload);
    if (err) return json({ success: false, error: err }, 400);

    // Consome o token imediatamente (uso único).
    await env.LEADS.delete(`lead:${token}`);

    // Entrega o pedido real à dona.
    await sendOwnerRequest(env, payload);

    return json({
      success: true,
      message: 'Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.',
    });
  } catch (e) {
    console.error('[api/diagnostico] error:', e);
    return json({ success: false, error: 'Erro no servidor. Tenta de novo.' }, 500);
  }
}

// GET /diagnostico?token=… — página privada pré-preenchida.
async function handleDiagnosticPage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!token) return renderDiagnosticError('missing');

  const raw = await env.LEADS.get(`lead:${token}`);
  if (!raw) return renderDiagnosticError('invalid');

  try {
    const lead: Lead = JSON.parse(raw);
    return renderDiagnosticPage(lead);
  } catch {
    return renderDiagnosticError('invalid');
  }
}