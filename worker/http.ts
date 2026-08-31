// Shared HTTP/auth helpers for Worker routes.

import { json, type Env } from './lib';
import { validateSession } from './auth/session';
import { getSessionCookie } from './auth/cookies';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export async function requireAuth(request: Request, env: Env): Promise<string | null> {
  const sessionId = getSessionCookie(request);
  if (!sessionId) return null;
  return validateSession(env, sessionId);
}

export function getCookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function validateCsrf(request: Request): boolean {
  const cookieToken = getCookieValue(request, 'csrf_token');
  const headerToken = request.headers.get('X-CSRF-Token');
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}
