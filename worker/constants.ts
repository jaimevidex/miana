// Constantes centralizadas - rate-limit keys, R2 paths, TTLs.

/** Prefix for D1 rate_limits.key (legacy name kept for existing rows). */
export const RATE_KEY_PREFIX = 'rl:';

/** @deprecated Use RATE_KEY_PREFIX - kept for any external imports. */
export const KV_KEYS = {
  RATE_LIMIT: RATE_KEY_PREFIX,
} as const;

export const R2_FOLDER = 'diagnostics';

export const LEAD_TTL = 60 * 60 * 24 * 60; // 2 months (seconds) - informational
export const RATE_WINDOW = 60 * 60; // 1 hour
export const RATE_MAX = 5;
