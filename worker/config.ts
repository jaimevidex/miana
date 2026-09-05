// Configuração centralizada do Worker.
// Todos os valores vêm de env vars com fallbacks sensatos.
// Isto elimina hardcoded values espalhados pelo código.

import type { Env } from './lib';

const DEFAULTS = {
  SITE_URL: 'https://marianapita.pt',
  FROM_EMAIL: 'hello@marianapita.pt',
  FROM_NAME: 'Mariana Pita Makeup',
  OWNER_EMAIL: 'hello@marianapita.pt',
  R2_FOLDER: 'diagnostics',
} as const;

export const OWNER_EMAIL = DEFAULTS.OWNER_EMAIL;

/** URL base do site - lê de env.SITE_URL com fallback. */
export function siteUrl(env: Env): string {
  return env.SITE_URL || DEFAULTS.SITE_URL;
}

/** Email de origem - hello@marianapita.pt para emails ao cliente. */
export function fromEmail(env: Env): string {
  return env.FROM_EMAIL || DEFAULTS.FROM_EMAIL;
}

/** Reply-To com tag da conversa (hello+{id}@) para matching inbound. */
export function replyToForConversation(env: Env, conversationId: string): string {
  const addr = fromEmail(env);
  const at = addr.lastIndexOf('@');
  if (at < 1) return addr;
  const local = addr.slice(0, at);
  const domain = addr.slice(at + 1);
  return `${local}+${conversationId.replace(/-/g, '')}@${domain}`;
}

/** Nome de exibição do remetente. */
export function fromName(env: Env): string {
  return env.FROM_NAME || DEFAULTS.FROM_NAME;
}

/** Email da dona - recebe notificações. */
export function ownerEmail(env: Env): string {
  return env.OWNER_EMAIL || DEFAULTS.OWNER_EMAIL;
}

/** URL base da dashboard admin - usa ADMIN_URL ou monta a partir de SITE_URL. */
export function adminUrl(env: Env): string {
  return env.ADMIN_URL || `${siteUrl(env)}/admin`;
}

/** URL completa para um lead específico na dashboard admin. */
export function adminLeadUrl(env: Env, id: string): string {
  return `${adminUrl(env)}/lead/${encodeURIComponent(id)}`;
}

/** URL completa para um cliente específico na dashboard admin. */
export function adminClientUrl(env: Env, id: string): string {
  return `${adminUrl(env)}/client/${encodeURIComponent(id)}`;
}

/** Prefixo da pasta no bucket R2 onde ficam os diagnósticos. */
export function r2Folder(): string {
  return DEFAULTS.R2_FOLDER;
}
