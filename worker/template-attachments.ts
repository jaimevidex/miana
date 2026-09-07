// Anexos default por template de email (Settings), PT e EN separados.

import { createDb } from './db';
import { settings as settingsTable } from './db/schema';
import type { Env, LeadType } from './lib';
import { loadSettingsMap } from './pricing';
import {
  isBuiltinTemplateId,
  isCustomTemplateId,
  type EmailTemplateId,
} from './email-copy';
import { parseLocale, type Locale } from './locale';
import {
  MAX_CHAT_EXTRA_ATTACHMENTS,
  TEMPLATE_ATTACHMENTS_FOLDER,
} from './constants';
import type { EmailAttachment } from './email';
import { termosPlaceholderPdf, TERMOS_PLACEHOLDER_FILENAME, TERMOS_PLACEHOLDER_TYPE } from './assets/termos-placeholder';
import {
  bridalServicesPlaceholderPdf,
  BRIDAL_SERVICES_PLACEHOLDER_FILENAME,
  BRIDAL_SERVICES_PLACEHOLDER_TYPE,
} from './assets/bridal-services-placeholder';

export const BUILTIN_TERMOS = 'builtin:termos';
export const BUILTIN_BRIDAL_SERVICES = 'builtin:bridal_services';

export type TemplateAttachmentRef = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  r2Key?: string;
};

type StoredAttachment = {
  id: string;
  filename?: string;
  contentType?: string;
  size?: number;
  r2Key?: string;
};

export function isEmailTemplateId(value: string): boolean {
  return isBuiltinTemplateId(value) || isCustomTemplateId(value);
}

export function attachmentsSettingKey(id: string, locale: Locale): string {
  return locale === 'en' ? `email_${id}_attachments_en` : `email_${id}_attachments`;
}

export function isAttachmentsSettingKey(key: string): boolean {
  return /^email_[a-z0-9_]+_attachments(_en)?$/.test(key);
}

export function quoteTemplateId(type: LeadType): EmailTemplateId {
  switch (type) {
    case 'bridal':
      return 'bridal';
    case 'beauty':
      return 'beauty';
    case 'skin-call':
      return 'skin_call';
    case 'education':
      return 'education';
  }
}

export function termsTemplateId(type: LeadType): EmailTemplateId {
  switch (type) {
    case 'bridal':
      return 'bridal_terms';
    case 'beauty':
      return 'beauty_terms';
    case 'skin-call':
      return 'skin_call_terms';
    case 'education':
      return 'education_terms';
  }
}

export function builtinTermosRef(): TemplateAttachmentRef {
  const content = termosPlaceholderPdf();
  return {
    id: BUILTIN_TERMOS,
    filename: TERMOS_PLACEHOLDER_FILENAME,
    contentType: TERMOS_PLACEHOLDER_TYPE,
    size: content.byteLength,
  };
}

export function builtinBridalServicesRef(): TemplateAttachmentRef {
  const content = bridalServicesPlaceholderPdf();
  return {
    id: BUILTIN_BRIDAL_SERVICES,
    filename: BRIDAL_SERVICES_PLACEHOLDER_FILENAME,
    contentType: BRIDAL_SERVICES_PLACEHOLDER_TYPE,
    size: content.byteLength,
  };
}

export function defaultTemplateAttachments(id: string): TemplateAttachmentRef[] {
  if (id === 'bridal_intro') return [builtinBridalServicesRef()];
  if (isBuiltinTemplateId(id) && id.endsWith('_terms')) return [builtinTermosRef()];
  return [];
}

function hydrateBuiltin(id: string): TemplateAttachmentRef | null {
  if (id === BUILTIN_TERMOS) return builtinTermosRef();
  if (id === BUILTIN_BRIDAL_SERVICES) return builtinBridalServicesRef();
  return null;
}

function hydrateStored(item: StoredAttachment): TemplateAttachmentRef | null {
  const builtin = hydrateBuiltin(item.id);
  if (builtin) return builtin;
  if (!item.filename || !item.r2Key || !item.contentType) return null;
  return {
    id: item.id,
    filename: item.filename,
    contentType: item.contentType,
    size: typeof item.size === 'number' ? item.size : 0,
    r2Key: item.r2Key,
  };
}

export function parseAttachmentList(raw: string | undefined, id: string, configured: boolean): TemplateAttachmentRef[] {
  if (!configured) return defaultTemplateAttachments(id);
  try {
    const parsed = JSON.parse(raw || '[]') as unknown;
    if (!Array.isArray(parsed)) return defaultTemplateAttachments(id);
    return parsed
      .map((item) => (item && typeof item === 'object' ? hydrateStored(item as StoredAttachment) : null))
      .filter((item): item is TemplateAttachmentRef => !!item);
  } catch {
    return defaultTemplateAttachments(id);
  }
}

export function serializeAttachmentList(items: TemplateAttachmentRef[]): string {
  return JSON.stringify(items.map((item) => {
    if (item.id === BUILTIN_TERMOS || item.id === BUILTIN_BRIDAL_SERVICES) {
      return { id: item.id };
    }
    return {
      id: item.id,
      filename: item.filename,
      contentType: item.contentType,
      size: item.size,
      r2Key: item.r2Key,
    };
  }));
}

export function listTemplateAttachmentsFromMap(
  map: Record<string, string>,
  id: string,
  locale: Locale,
): TemplateAttachmentRef[] {
  const key = attachmentsSettingKey(id, locale);
  return parseAttachmentList(map[key], id, Object.prototype.hasOwnProperty.call(map, key));
}

export async function listTemplateAttachments(
  env: Env,
  id: string,
  locale: Locale,
): Promise<TemplateAttachmentRef[]> {
  const map = await loadSettingsMap(env);
  return listTemplateAttachmentsFromMap(map, id, locale);
}

function publicAttachment(item: TemplateAttachmentRef): TemplateAttachmentRef {
  return {
    id: item.id,
    filename: item.filename,
    contentType: item.contentType,
    size: item.size,
  };
}

export function publicAttachmentList(items: TemplateAttachmentRef[]): TemplateAttachmentRef[] {
  return items.map(publicAttachment);
}

async function writeAttachmentList(
  env: Env,
  id: string,
  locale: Locale,
  items: TemplateAttachmentRef[],
): Promise<void> {
  const db = createDb(env);
  const key = attachmentsSettingKey(id, locale);
  const now = Date.now();
  await db.insert(settingsTable).values({
    key,
    value: serializeAttachmentList(items),
    updatedAt: now,
  }).onConflictDoUpdate({
    target: settingsTable.key,
    set: { value: serializeAttachmentList(items), updatedAt: now },
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'anexo';
}

export function isSafeTemplateAttachmentKey(key: string): boolean {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return false;
  }
  if (!decoded || decoded.includes('..') || decoded.includes('\\')) return false;
  return decoded.startsWith(`${TEMPLATE_ATTACHMENTS_FOLDER}/`);
}

export async function addTemplateAttachment(
  env: Env,
  id: string,
  locale: Locale,
  file: { filename: string; contentType: string; content: Uint8Array },
): Promise<{ ok: true; attachments: TemplateAttachmentRef[] } | { ok: false; error: string }> {
  if (!env.DIAG_PHOTOS) return { ok: false, error: 'R2 não configurado.' };

  const current = await listTemplateAttachments(env, id, locale);
  if (current.length >= MAX_CHAT_EXTRA_ATTACHMENTS) {
    return { ok: false, error: `Máximo de ${MAX_CHAT_EXTRA_ATTACHMENTS} anexos por template.` };
  }

  const type = file.contentType;
  const attId = crypto.randomUUID();
  const key = `${TEMPLATE_ATTACHMENTS_FOLDER}/${id}/${locale}/${attId}-${safeFilename(file.filename)}`;
  await env.DIAG_PHOTOS.put(key, file.content, {
    httpMetadata: { contentType: type },
  });

  const next = [
    ...current,
    {
      id: attId,
      filename: file.filename.slice(0, 180) || 'anexo',
      contentType: type,
      size: file.content.byteLength,
      r2Key: key,
    },
  ];
  await writeAttachmentList(env, id, locale, next);
  return { ok: true, attachments: publicAttachmentList(next) };
}

export async function removeTemplateAttachment(
  env: Env,
  id: string,
  locale: Locale,
  attachmentId: string,
): Promise<{ ok: true; attachments: TemplateAttachmentRef[] } | { ok: false; error: string }> {
  const current = await listTemplateAttachments(env, id, locale);
  const found = current.find((item) => item.id === attachmentId);
  if (!found) return { ok: false, error: 'Anexo não encontrado.' };

  const next = current.filter((item) => item.id !== attachmentId);
  if (found.r2Key && isSafeTemplateAttachmentKey(found.r2Key) && env.DIAG_PHOTOS) {
    await env.DIAG_PHOTOS.delete(found.r2Key);
  }
  await writeAttachmentList(env, id, locale, next);
  return { ok: true, attachments: publicAttachmentList(next) };
}

export async function resolveTemplateAttachmentBytes(
  env: Env,
  item: TemplateAttachmentRef,
): Promise<EmailAttachment | { error: string }> {
  if (item.id === BUILTIN_TERMOS) {
    return {
      filename: TERMOS_PLACEHOLDER_FILENAME,
      contentType: TERMOS_PLACEHOLDER_TYPE,
      content: termosPlaceholderPdf(),
    };
  }
  if (item.id === BUILTIN_BRIDAL_SERVICES) {
    return {
      filename: BRIDAL_SERVICES_PLACEHOLDER_FILENAME,
      contentType: BRIDAL_SERVICES_PLACEHOLDER_TYPE,
      content: bridalServicesPlaceholderPdf(),
    };
  }
  if (!item.r2Key || !isSafeTemplateAttachmentKey(item.r2Key)) {
    return { error: `${item.filename}: key inválida.` };
  }
  if (!env.DIAG_PHOTOS) return { error: 'R2 não configurado.' };
  const object = await env.DIAG_PHOTOS.get(item.r2Key);
  if (!object) return { error: `${item.filename}: ficheiro em falta.` };
  const bytes = new Uint8Array(await object.arrayBuffer());
  return {
    filename: item.filename,
    contentType: object.httpMetadata?.contentType || item.contentType,
    content: bytes,
  };
}

export async function resolveSelectedTemplateAttachments(
  env: Env,
  id: string,
  locale: Locale,
  ids: string[],
): Promise<{ ok: true; attachments: EmailAttachment[] } | { ok: false; error: string }> {
  if (ids.length > MAX_CHAT_EXTRA_ATTACHMENTS) {
    return { ok: false, error: `Máximo de ${MAX_CHAT_EXTRA_ATTACHMENTS} anexos por envio.` };
  }
  const stored = await listTemplateAttachments(env, id, locale);
  const byId = new Map(stored.map((item) => [item.id, item]));
  const out: EmailAttachment[] = [];
  for (const attId of ids) {
    const item = byId.get(attId);
    if (!item) return { ok: false, error: 'Um dos anexos do template já não existe.' };
    const resolved = await resolveTemplateAttachmentBytes(env, item);
    if ('error' in resolved) return { ok: false, error: resolved.error };
    out.push(resolved);
  }
  return { ok: true, attachments: out };
}

export async function deleteAllTemplateAttachments(env: Env, id: string): Promise<void> {
  if (!env.DIAG_PHOTOS || !isEmailTemplateId(id)) return;
  const prefix = `${TEMPLATE_ATTACHMENTS_FOLDER}/${id}/`;
  let cursor: string | undefined;
  do {
    const listed = await env.DIAG_PHOTOS.list({ prefix, cursor });
    const keys = listed.objects.map((obj) => obj.key).filter(isSafeTemplateAttachmentKey);
    await Promise.all(keys.map((key) => env.DIAG_PHOTOS!.delete(key)));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

export function parseTemplateLocale(raw: string | null | undefined): Locale {
  return parseLocale(raw);
}
