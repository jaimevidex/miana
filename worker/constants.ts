// Constantes centralizadas - rate-limit keys, R2 paths, TTLs.

/** Prefix for D1 rate_limits.key (legacy name kept for existing rows). */
export const RATE_KEY_PREFIX = 'rl:';

/** @deprecated Use RATE_KEY_PREFIX - kept for any external imports. */
export const KV_KEYS = {
  RATE_LIMIT: RATE_KEY_PREFIX,
} as const;

export const TEMPLATE_ATTACHMENTS_FOLDER = 'template_attachments';
export const LEADS_FOLDER = 'leads';
export const CLIENTS_FOLDER = 'clients';
export const LEAD_PHOTOS_SUBFOLDER = 'avaliacao-de-pele';
export const LEAD_ATTACHMENTS_SUBFOLDER = 'attachments';
export const MAX_EMAIL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_EMAIL_ATTACHMENTS_TOTAL_BYTES = MAX_EMAIL_ATTACHMENT_BYTES * 4;
export const MAX_CHAT_EXTRA_ATTACHMENTS = 5;

export const LEAD_TTL = 60 * 60 * 24 * 60; // 2 months (seconds) - informational
export const RATE_WINDOW = 60 * 60; // 1 hour
export const RATE_MAX = 5;
