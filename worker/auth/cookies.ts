// Gestão de cookies HttpOnly para sessões de admin.

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 dias em segundos

/** cookiePath — caminho base para o cookie (admin only). */
const COOKIE_PATH = '/admin';

/** Define o cookie de sessão na resposta. */
export function setSessionCookie(headers: Headers, sessionId: string): void {
  const cookie = `${COOKIE_NAME}=${sessionId}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
  headers.append('Set-Cookie', cookie);
}

/** Lê o cookie de sessão do request. Devolve null se não existir. */
export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

/** Limpa o cookie de sessão (logout). */
export function clearSessionCookie(headers: Headers): void {
  const cookie = `${COOKIE_NAME}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0`;
  headers.append('Set-Cookie', cookie);
}
