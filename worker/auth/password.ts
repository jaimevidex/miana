// Hash e verificação de passwords com PBKDF2 via WebCrypto.
// Sem dependências externas — usa APIs nativas do runtime Cloudflare Workers.

const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';
const ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/** Gera um salt aleatório (base64). */
function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return btoa(String.fromCharCode(...salt));
}

/** Deriva bits a partir de password + salt. */
async function deriveBits(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: salt.buffer.slice(0) as ArrayBuffer, iterations: ITERATIONS, hash: HASH },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

/** Hash da password → "salt:hash" (base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const bits = await deriveBits(password, Uint8Array.from(atob(salt), c => c.charCodeAt(0)));
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `${salt}:${hash}`;
}

/** Verifica se a password corresponde ao hash armazenado. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;

  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const bits = await deriveBits(password, salt);
  const computedHash = btoa(String.fromCharCode(...new Uint8Array(bits)));

  // Comparação constante para evitar timing attacks
  if (computedHash.length !== hashB64.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  }
  return result === 0;
}
