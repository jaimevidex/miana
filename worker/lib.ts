// Helpers partilhados do Worker — formulários, leads, diagnóstico.
// Sem dependências externas: usa APIs nativas do runtime Cloudflare Workers.

import { LEAD_TTL, RATE_WINDOW, RATE_MAX, KV_KEYS } from './constants';

export { LEAD_TTL, RATE_WINDOW, RATE_MAX };

export interface Env {
  DB: D1Database;
  DIAG_PHOTOS?: R2Bucket;
  RESEND_API_KEY?: string;
  ASSETS: Fetcher;
  EMAIL_ENABLED?: string;
  OWNER_EMAIL?: string;
  RATE_LIMIT_DISABLED?: string;
  SITE_URL?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
  ADMIN_URL?: string;
}

// ─── Tipos de formulário ────────────────────────────────────────────────────
export type LeadType = 'skin-call' | 'bridal-beauty' | 'education';

export interface LeadInput {
  nome: string;
  telefone: string;
  email: string;
  type: LeadType;
  formData?: Record<string, unknown>;
}

// Lead format used by the diagnostic form pages (token-based access)
export interface DiagnosticLead {
  token: string;
  nome: string;
  telefone: string;
  email: string;
  plano: string;
  createdAt: number;
}

// ─── Diagnóstico (preenchido pelo cliente Skin Call) ─────────────────────────
export interface DiagnosticData {
  idade?: string;
  situacao?: string[];
  doenca_cronica?: string;
  alergias_alimentares?: string;
  alergias_cosmeticos?: string;
  medicacao_continua?: string;
  diagnostico_medico?: string[];
  diagnostico_outro?: string;
  medicacao_oral?: string;
  medicacao_topica?: string;
  tratamentos_esteticos?: string;
  burnout_cutaneo?: string;
  vasos_visiveis?: string;
  rubor?: string;
  reacao_estacoes?: string;
  stress_nivel?: string;
  sono_tipo?: string[];
  sono_lado?: string;
  sono_fronha?: string;
  agua_ingestao?: string[];
  alimentacao?: string[];
  exposicao_solar?: string[];
  ambiente_fatores?: string[];
  pele_acordar?: string[];
  pele_2h?: string[];
  pele_tarde?: string[];
  pele_textura?: string[];
  pele_cor?: string[];
  pele_toque?: string[];
  pele_ambiente?: string[];
  pele_borbulhas?: string[];
  pele_firmeza?: string[];
  pele_contorno_olhos?: string[];
  rotina_manha?: string;
  rotina_noite?: string;
  rotina_consistencia?: string[];
  rotina_esfoliacao?: string;
  rotina_mascaras?: string;
  rotina_dispositivos?: string;
  rotina_favorito?: string;
  rotina_odeia?: string;
  rotina_maquilhagem_freq?: string[];
  rotina_maquilhagem_retirar?: string[];
  rotina_lavar_rosto?: string[];
  rotina_pinceis?: string;
  rotina_telemovel?: string;
  rotina_mexer_rosto?: string;
  rotina_espremer?: string;
  rotina_depilacao?: string;
  preferencias_tempo?: string[];
  preferencias_texturas?: string[];
  preferencias_texturas_outro?: string;
  preferencias_dificuldades?: string[];
  preferencias_dificuldades_outro?: string;
  preferencias_orcamento?: string[];
  prioridade_1?: string;
  prioridade_2?: string;
  pergunta_nao_pode_ficar?: string;
  mais_alguma_coisa?: string;
  consent?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function htmlEscape(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Validação básica — nome, telefone, email são sempre obrigatórios. */
export function validateLead(body: LeadInput): string | null {
  if (!body.nome || body.nome.trim().length < 2) return 'O nome deve ter pelo menos 2 caracteres.';
  if (!body.telefone || body.telefone.trim().length < 6) return 'O telefone deve ter pelo menos 6 caracteres.';
  if (!body.email || !isValidEmail(body.email.trim())) return 'O email não é válido.';
  if (!body.type) return 'Tipo de formulário inválido.';
  return null;
}

/** Honeypot anti-bot. */
export function isBot(form: FormData): boolean {
  const botcheck = form.get('botcheck');
  return typeof botcheck === 'string' && botcheck.trim().length > 0;
}

/** Carrega FormData de json ou urlencoded. */
export async function readForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json: Record<string, unknown> = await request.json();
    const fd = new FormData();
    for (const [k, v] of Object.entries(json)) fd.append(k, v as string);
    return fd;
  }
  return await request.formData();
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// ─── Rate Limit ─────────────────────────────────────────────────────────────

function rateKey(clientIP: string, _email: string): string {
  return `${KV_KEYS.RATE_LIMIT}${clientIP}`;
}

import { eq } from 'drizzle-orm';
import { createDb } from './db';
import { rateLimits } from './db/schema';

export async function allowRequest(env: Env, clientIP: string, email: string): Promise<boolean> {
  if (env.RATE_LIMIT_DISABLED === 'true') return true;

  const key = rateKey(clientIP, email);
  const now = Date.now();
  const windowStart = now - RATE_WINDOW * 1000;

  const db = createDb(env);

  const existing = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  const row = existing[0];

  if (!row) {
    await db.insert(rateLimits).values({ key, count: 1, windowStart: now });
    return true;
  }

  if (row.windowStart < windowStart) {
    await db.update(rateLimits).set({ count: 1, windowStart: now }).where(eq(rateLimits.key, key));
    return true;
  }

  if (row.count >= RATE_MAX) return false;

  await db.update(rateLimits).set({ count: row.count + 1 }).where(eq(rateLimits.key, key));

  return true;
}

// ─── Labels de campos para emails ───────────────────────────────────────────

export const FIELD_LABELS: Record<string, string> = {
  // Skin Call
  plano: 'Plano',
  rotina: 'Rotina',
  rotina_frequencia: 'Frequência da rotina',
  pele_tipo: 'Tipo de pele',
  preocupacoes: 'Preocupações',
  preocupacoes_outro: 'Outra preocupação',
  // Bridal
  opcao_servico: 'Opção de serviço',
  data_casamento: 'Data do casamento',
  hora_pronta: 'Hora de estar pronta',
  local_preparacao: 'Local da preparação',
  local_prova: 'Local da prova',
  servicos_procurados: 'Serviços procurados',
  numero_guests: 'Número de guests',
  addon_skin_call: 'Add-on Skin Call',
  data_evento: 'Data do evento',
  hora_pronta_evento: 'Hora do evento',
  local_evento: 'Local do evento',
  servicos_procurados_guests: 'Serviços procurados',
  numero_pessoas: 'Número de pessoas',
  mensagem: 'Mensagem',
  // Education
  formato: 'Formato',
  local_workshop: 'Local do workshop',
  data_hora: 'Data e hora',
  tipo: 'Tipo',
  modalidade: 'Modalidade',
  numero_participantes: 'Número de participantes',
  regime: 'Regime',
};
