// Ingestão de emails inbound (Cloudflare Email Workers + parse local).

import PostalMime, { type Address } from 'postal-mime';
import type { Env } from './lib';
import { ingestParsedInbound, type InboundParsed } from './conversation';
import { extractAllAddresses } from './email-match';
import { sanitizeEmailHtml } from './email-sanitize';

const MAX_ATTACH = 8;

function mailboxAddress(addr: Address | undefined): string {
  if (!addr) return '';
  if ('address' in addr && addr.address) return addr.address;
  return '';
}

function flattenAddresses(list: Address[] | undefined): string[] {
  const out: string[] = [];
  for (const a of list || []) {
    if ('address' in a && a.address) out.push(a.address);
    if ('group' in a && a.group) {
      for (const g of a.group) {
        if (g.address) out.push(g.address);
      }
    }
  }
  return out;
}

function asBytes(content: unknown): Uint8Array | null {
  if (!content) return null;
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (typeof content === 'string') {
    try {
      const bin = atob(content);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch {
      return new TextEncoder().encode(content);
    }
  }
  return null;
}

export async function parseRawEmail(raw: ArrayBuffer | Uint8Array): Promise<InboundParsed> {
  const parser = new PostalMime();
  const parsed = await parser.parse(raw);
  const toList = [
    ...flattenAddresses(parsed.to),
    ...flattenAddresses(parsed.cc),
    ...extractAllAddresses(parsed.deliveredTo),
  ];

  const attachments: InboundParsed['attachments'] = [];
  for (const att of parsed.attachments || []) {
    if (attachments.length >= MAX_ATTACH) break;
    const bytes = asBytes(att.content);
    if (!bytes || bytes.byteLength === 0) continue;
    attachments.push({
      filename: att.filename || 'anexo',
      contentType: att.mimeType || 'application/octet-stream',
      content: bytes,
    });
  }

  return {
    from: mailboxAddress(parsed.from),
    to: toList.map((s) => s.toLowerCase()),
    subject: parsed.subject || '',
    html: sanitizeEmailHtml(parsed.html || ''),
    text: parsed.text || '',
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    attachments,
  };
}

export async function handleIncomingEmail(
  message: ForwardableEmailMessage,
  env: Env,
): Promise<void> {
  try {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await parseRawEmail(raw);
    if (!parsed.to.length) {
      parsed.to = extractAllAddresses(message.to);
    }
    if (!parsed.from) parsed.from = message.from;
    const result = await ingestParsedInbound(env, parsed);
    if (!result.stored) {
      console.log(`[email-inbound] not stored: ${result.reason}`);
    }
  } catch (err) {
    console.error('[email-inbound] parse/store error:', err);
  }

  const forwardTo = env.EMAIL_FORWARD_TO;
  if (forwardTo) {
    try {
      await message.forward(forwardTo);
    } catch (err) {
      console.error('[email-inbound] forward error:', err);
    }
  }
}
