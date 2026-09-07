// API admin: anexos default dos templates de email.

import { json, type Env } from '../lib';
import type { Locale } from '../locale';
import {
  addTemplateAttachment,
  isEmailTemplateId,
  listTemplateAttachments,
  parseTemplateLocale,
  publicAttachmentList,
  removeTemplateAttachment,
  resolveTemplateAttachmentBytes,
} from '../template-attachments';
import { resolveOutgoingAttachmentType, validateOutgoingAttachment } from '../conversation';
import { MAX_EMAIL_ATTACHMENT_BYTES } from '../constants';

function isFormFile(value: FormDataEntryValue): value is File {
  return typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'name' in value;
}

export async function handleAddTemplateAttachment(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const templateId = String(form.get('templateId') || '');
  const locale = parseTemplateLocale(String(form.get('locale') || 'pt'));
  const file = form.get('file');
  if (!isEmailTemplateId(templateId)) return json({ error: 'Template inválido.' }, 400);
  if (!file || !isFormFile(file) || !(file.name || file.size)) return json({ error: 'Escolhe um ficheiro.' }, 400);
  if (file.size > MAX_EMAIL_ATTACHMENT_BYTES) {
    return json({ error: `${file.name}: demasiado grande (máx. 10 MB).` }, 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = validateOutgoingAttachment(file.name, file.type || '', bytes);
  if (invalid) return json({ error: invalid }, 400);
  const type = resolveOutgoingAttachmentType(file.name, file.type || '', bytes);
  const result = await addTemplateAttachment(env, templateId, locale, {
    filename: file.name,
    contentType: type || file.type || 'application/octet-stream',
    content: bytes,
  });
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ success: true, attachments: result.attachments });
}

export async function handleRemoveTemplateAttachment(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { templateId?: string; locale?: string; id?: string };
  const templateId = String(body.templateId || '');
  const locale = parseTemplateLocale(body.locale);
  const id = String(body.id || '');
  if (!isEmailTemplateId(templateId) || !id) return json({ error: 'Pedido inválido.' }, 400);
  const result = await removeTemplateAttachment(env, templateId, locale, id);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ success: true, attachments: result.attachments });
}

export async function handleServeTemplateAttachment(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const templateId = String(url.searchParams.get('templateId') || '');
  const id = String(url.searchParams.get('id') || '');
  const locale = parseTemplateLocale(url.searchParams.get('locale'));
  if (!isEmailTemplateId(templateId) || !id) return json({ error: 'Pedido inválido.' }, 400);
  const items = await listTemplateAttachments(env, templateId, locale);
  const item = items.find((att) => att.id === id);
  if (!item) return json({ error: 'Anexo não encontrado.' }, 404);
  const resolved = await resolveTemplateAttachmentBytes(env, item);
  if ('error' in resolved) return json({ error: resolved.error }, 404);
  const headers = new Headers();
  headers.set('Content-Type', resolved.contentType);
  headers.set('Cache-Control', 'private, max-age=3600');
  headers.set('Content-Disposition', `inline; filename="${resolved.filename.replace(/"/g, '')}"`);
  const copy = new Uint8Array(resolved.content.byteLength);
  copy.set(resolved.content);
  return new Response(copy, { headers });
}

export async function attachmentsPayload(env: Env, templateId: string, locale: Locale) {
  const items = await listTemplateAttachments(env, templateId, locale);
  return {
    templateId,
    attachments: publicAttachmentList(items),
  };
}
