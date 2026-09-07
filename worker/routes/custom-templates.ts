// API admin: criar e apagar templates extra nas Settings.

import { inArray } from 'drizzle-orm';
import { json, type Env } from '../lib';
import { createDb } from '../db';
import { settings as settingsTable } from '../db/schema';
import { loadSettingsMap } from '../pricing';
import {
  EMAIL_CUSTOM_REGISTRY_KEY,
  MAX_CUSTOM_TEMPLATES,
  customAttachmentSettingKeys,
  customCopySettingKeys,
  isBuiltinTemplateId,
  isCustomEmailFlow,
  isCustomTemplateId,
  newCustomTemplateId,
  parseCustomRegistry,
  sanitizeCustomLabel,
  serializeCustomRegistry,
} from '../email-copy';
import { deleteAllTemplateAttachments } from '../template-attachments';

async function upsertSetting(env: Env, key: string, value: string, now: number): Promise<void> {
  const db = createDb(env);
  await db.insert(settingsTable).values({ key, value, updatedAt: now }).onConflictDoUpdate({
    target: settingsTable.key,
    set: { value, updatedAt: now },
  });
}

export async function handleCreateCustomTemplate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { flow?: string; label?: string };
  const flow = String(body.flow || '');
  const label = sanitizeCustomLabel(String(body.label || ''));
  if (!isCustomEmailFlow(flow)) return json({ error: 'Flow inválido.' }, 400);
  if (!label) return json({ error: 'Indica o nome do template.' }, 400);

  const map = await loadSettingsMap(env);
  const registry = parseCustomRegistry(map[EMAIL_CUSTOM_REGISTRY_KEY]);
  if (registry.length >= MAX_CUSTOM_TEMPLATES) {
    return json({ error: `Máximo de ${MAX_CUSTOM_TEMPLATES} templates extra.` }, 400);
  }

  let id = newCustomTemplateId();
  while (registry.some((entry) => entry.id === id) || isBuiltinTemplateId(id)) {
    id = newCustomTemplateId();
  }

  const now = Date.now();
  await upsertSetting(env, EMAIL_CUSTOM_REGISTRY_KEY, serializeCustomRegistry([...registry, { id, flow, label }]), now);
  for (const key of customCopySettingKeys(id)) {
    await upsertSetting(env, key, '', now);
  }
  for (const key of customAttachmentSettingKeys(id)) {
    await upsertSetting(env, key, '[]', now);
  }
  return json({ success: true, template: { id, flow, label } });
}

export async function handleDeleteCustomTemplate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { id?: string };
  const id = String(body.id || '');
  if (!isCustomTemplateId(id)) return json({ error: 'Template inválido.' }, 400);

  const map = await loadSettingsMap(env);
  const registry = parseCustomRegistry(map[EMAIL_CUSTOM_REGISTRY_KEY]);
  if (!registry.some((entry) => entry.id === id)) {
    return json({ error: 'Template não encontrado.' }, 404);
  }

  const now = Date.now();
  await upsertSetting(
    env,
    EMAIL_CUSTOM_REGISTRY_KEY,
    serializeCustomRegistry(registry.filter((entry) => entry.id !== id)),
    now,
  );
  const keys = [...customCopySettingKeys(id), ...customAttachmentSettingKeys(id)];
  const db = createDb(env);
  await db.delete(settingsTable).where(inArray(settingsTable.key, keys));
  await deleteAllTemplateAttachments(env, id);
  return json({ success: true });
}
