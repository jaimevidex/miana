// Configuração centralizada do Worker.
// Todos os valores vêm de env vars com fallbacks sensatos.
// Isto elimina hardcoded values espalhados pelo código.

import type { Env } from './lib';

const DEFAULTS = {
  SITE_URL: 'https://marianapita.pt',
  FROM_EMAIL: 'no-reply@marianapita.pt',
  FROM_NAME: 'Mariana Pita Makeup',
  OWNER_EMAIL: 'hello@marianapita.pt',
  R2_FOLDER: 'diagnostics',
} as const;

/** URL base do site — lê de env.SITE_URL com fallback. */
export function siteUrl(env: Env): string {
  return env.SITE_URL || DEFAULTS.SITE_URL;
}

/** Email de origem — sempre no-reply@marianapita.pt para emails ao cliente. */
export function fromEmail(env: Env): string {
  return env.FROM_EMAIL || DEFAULTS.FROM_EMAIL;
}

/** Nome de exibição do remetente. */
export function fromName(env: Env): string {
  return env.FROM_NAME || DEFAULTS.FROM_NAME;
}

/** Email da dona — recebe notificações. */
export function ownerEmail(env: Env): string {
  return env.OWNER_EMAIL || DEFAULTS.OWNER_EMAIL;
}

/** URL base da dashboard admin — usa ADMIN_URL ou monta a partir de SITE_URL. */
export function adminUrl(env: Env): string {
  return env.ADMIN_URL || `${siteUrl(env)}/admin`;
}

/** URL completa para um lead específico na dashboard admin. */
export function adminLeadUrl(env: Env, id: string): string {
  return `${adminUrl(env)}/lead/${encodeURIComponent(id)}`;
}

/** Prefixo da pasta no bucket R2 onde ficam os diagnósticos. */
export function r2Folder(): string {
  return DEFAULTS.R2_FOLDER;
}
