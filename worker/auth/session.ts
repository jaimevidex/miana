// Gestão de sessões em D1 — criar, validar, destruir.
// Sessões duram 7 dias. Token é um UUID aleatório.

import { eq, and, gt } from 'drizzle-orm';
import { createDb } from '../db';
import { sessions } from '../db/schema';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/** Gera um ID de sessão aleatório (UUID v4 simplificado). */
function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  return [...bytes].map((b, i) => {
    const hex = b.toString(16);
    if (i === 4 || i === 6 || i === 8) return '-' + hex;
    return hex;
  }).join('');
}

/** Cria uma nova sessão e devolve o token. */
export async function createSession(env: { DB: D1Database }, userId: string): Promise<string> {
  const db = createDb(env);
  const id = generateSessionId();
  const now = Date.now();

  await db.insert(sessions).values([{
    id,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  }]);

  return id;
}

/** Valida uma sessão. Devolve o userId se válida, null se expirada/inexistente. */
export async function validateSession(env: { DB: D1Database }, sessionId: string): Promise<string | null> {
  const db = createDb(env);
  const now = Date.now();

  const result = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, now)
    ))
    .limit(1);

  return result[0]?.userId ?? null;
}

/** Destroi uma sessão (logout). */
export async function destroySession(env: { DB: D1Database }, sessionId: string): Promise<void> {
  const db = createDb(env);
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
