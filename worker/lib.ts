// Helpers partilhados do Worker do funnel Skin Call (fase 2).
// Sem dependências externas: usa APIs nativas do runtime Cloudflare Workers.

export interface Env {
  LEADS: KVNamespace;
  RESEND_API_KEY?: string;
  ASSETS: Fetcher;
  EMAIL_ENABLED?: string;
  OWNER_EMAIL?: string;
  RATE_LIMIT_DISABLED?: string;
}

export interface Lead {
  token: string;
  nome: string;
  telefone: string;
  email: string;
  plano: string;
  rotina?: string;
  rotina_frequencia?: string;
  preocupacoes?: string;
  createdAt: number;
}

export const LEAD_TTL = 60 * 60 * 24 * 60; // 2 meses em segundos
export const RATE_WINDOW = 60 * 60; // 1h
export const RATE_MAX = 5; // máx. 5 submissões por IP/email por janela

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Gera um token criptograficamente seguro e URL-safe.
export function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Onde fica o email/telefone a "encobrir" com asteriscos na página pré-preenchida? Não — a página
// pré-preenchida mostra os dados ao dono do token (o próprio lead). Só não expomos o token.
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export interface LeadInput {
  nome: string;
  telefone: string;
  email: string;
  plano: string;
}

// Validação básica do payload do stage 1/2. Devolve mensagem de erro ou null.
export function validateLead(body: LeadInput): string | null {
  if (!body.nome || body.nome.trim().length < 2) return 'Falta o nome.';
  if (!body.telefone || body.telefone.trim().length < 6) return 'Falta um contacto telefónico válido.';
  if (!body.email || !isValidEmail(body.email.trim())) return 'Falta um email válido.';
  if (!body.plano || body.plano.trim().length < 2) return 'Falta selecionar o plano.';
  return null;
}

// Honeypot anti-bot: se o campo escondido `botcheck` vier preenchido, é bot.
export function isBot(form: FormData): boolean {
  const botcheck = form.get('botcheck');
  return typeof botcheck === 'string' && botcheck.trim().length > 0;
}

// Carrega o FormData do corpo da request (json ou urlencoded).
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

function rateKey(clientIP: string, email: string): string {
  return `rl:${clientIP}`;
}

// Rate-limit simples por IP. Devolve true se o pedido deve ser aceite.
export async function allowRequest(env: Env, clientIP: string, email: string): Promise<boolean> {
  // Desativável em dev (RATE_LIMIT_DISABLED=true em .dev.vars) — o IP local é partilhado nos testes.
  if (env.RATE_LIMIT_DISABLED === 'true') return true;

  const key = rateKey(clientIP, email);
  const now = Date.now();
  const raw = await env.LEADS.get(key);
  const windowStart = await env.LEADS.get(`${key}:start`);

  if (!raw) {
    await env.LEADS.put(key, '1', { expirationTtl: RATE_WINDOW });
    await env.LEADS.put(`${key}:start`, String(now), { expirationTtl: RATE_WINDOW });
    return true;
  }

  const count = parseInt(raw, 10) || 0;
  if (count >= RATE_MAX) return false;

  await env.LEADS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return true;
}