// Google Calendar OAuth + criação de eventos Meet.

import { eq } from 'drizzle-orm';
import { createDb } from './db';
import { settings } from './db/schema';
import type { Env } from './lib';
import { adminUrl } from './config';

const TOKEN_KEY = 'google_calendar_refresh_token';
const EMAIL_KEY = 'google_calendar_email';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

function callbackUrl(env: Env): string {
  return `${adminUrl(env)}/api/admin/google/callback`;
}

export function googleOAuthConfigured(env: Env): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export async function getGoogleStatus(env: Env): Promise<{ configured: boolean; connected: boolean; email: string }> {
  const db = createDb(env);
  const rows = await db.select().from(settings).where(eq(settings.key, EMAIL_KEY)).limit(1);
  const tokenRows = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1);
  return {
    configured: googleOAuthConfigured(env),
    connected: !!(tokenRows[0]?.value),
    email: rows[0]?.value || '',
  };
}

export function googleAuthUrl(env: Env, state: string): string | null {
  if (!googleOAuthConfigured(env)) return null;
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!);
  u.searchParams.set('redirect_uri', callbackUrl(env));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('state', state);
  return u.toString();
}

async function upsertSetting(env: Env, key: string, value: string): Promise<void> {
  const db = createDb(env);
  const now = Date.now();
  await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({
    target: settings.key,
    set: { value, updatedAt: now },
  });
}

export async function exchangeGoogleCode(env: Env, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!googleOAuthConfigured(env)) return { ok: false, error: 'OAuth Google não configurado.' };
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(env),
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json() as { refresh_token?: string; access_token?: string; error?: string };
  if (!res.ok || !data.refresh_token) {
    return { ok: false, error: data.error || 'Não foi possível obter o refresh token. Tenta ligar de novo.' };
  }
  await upsertSetting(env, TOKEN_KEY, data.refresh_token);
  const email = await fetchGoogleEmail(data.access_token);
  if (email) await upsertSetting(env, EMAIL_KEY, email);
  return { ok: true };
}

export async function disconnectGoogle(env: Env): Promise<void> {
  const db = createDb(env);
  await db.delete(settings).where(eq(settings.key, TOKEN_KEY));
  await db.delete(settings).where(eq(settings.key, EMAIL_KEY));
}

async function fetchGoogleEmail(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { email?: string };
    return data.email || null;
  } catch {
    return null;
  }
}

async function getAccessToken(env: Env): Promise<string | null> {
  if (!googleOAuthConfigured(env)) return null;
  const db = createDb(env);
  const rows = await db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1);
  const refresh = rows[0]?.value;
  if (!refresh) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as { access_token?: string };
  return data.access_token || null;
}

export async function createMeetEvent(
  env: Env,
  opts: { summary: string; startsAt: Date; attendeeEmail: string; durationMinutes?: number },
): Promise<{ meetUrl: string; htmlLink?: string }> {
  const access = await getAccessToken(env);
  if (!access) {
    throw new Error('Google Calendar não está ligado. Vai a Settings e liga a conta.');
  }
  const duration = opts.durationMinutes ?? 60;
  const end = new Date(opts.startsAt.getTime() + duration * 60 * 1000);
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: opts.summary,
        start: { dateTime: opts.startsAt.toISOString(), timeZone: 'Europe/Lisbon' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Lisbon' },
        attendees: [{ email: opts.attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  );
  const data = await res.json() as {
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Falha ao criar o evento no Google Calendar.');
  }
  const meetUrl =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    '';
  if (!meetUrl) {
    throw new Error('O evento foi criado mas o Google não devolveu o link Meet.');
  }
  return { meetUrl, htmlLink: data.htmlLink };
}
