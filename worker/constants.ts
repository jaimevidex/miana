// Constantes centralizadas — KV key prefixes e R2 paths.
// Evita strings hardcoded espalhadas pelo código.

// ─── KV key prefixes ────────────────────────────────────────────────────────
export const KV_KEYS = {
  LEAD: 'lead:',
  DIAG: 'diag:',
  RATE_LIMIT: 'rl:',
} as const;

// ─── R2 key prefix (folder dentro do bucket media) ──────────────────────────
export const R2_FOLDER = 'diagnostics';

// ─── TTLs ───────────────────────────────────────────────────────────────────
export const LEAD_TTL = 60 * 60 * 24 * 60; // 2 meses em segundos
export const RATE_WINDOW = 60 * 60; // 1 hora
export const RATE_MAX = 5; // máx. 5 submissões por IP por janela
