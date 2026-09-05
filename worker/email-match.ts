// Matching helpers for inbound email (pure - no Worker bindings).

export function extractEmailAddress(raw: string | undefined | null): string {
  if (!raw) return '';
  const angle = raw.match(/<([^>]+)>/);
  const addr = (angle ? angle[1] : raw).trim().toLowerCase();
  return addr;
}

export function extractAllAddresses(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return found.map((a) => a.toLowerCase());
}

/** hello+{uuidWithoutHyphens}@domain → uuid with hyphens. */
export function parsePlusConversationId(address: string): string | null {
  const addr = extractEmailAddress(address);
  const m = addr.match(/^[^@+]+\+([a-f0-9-]{32,36})@/i);
  if (!m) return null;
  const tag = m[1].replace(/-/g, '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(tag)) return null;
  return `${tag.slice(0, 8)}-${tag.slice(8, 12)}-${tag.slice(12, 16)}-${tag.slice(16, 20)}-${tag.slice(20)}`;
}

export function normalizeMessageId(id: string | undefined | null): string {
  if (!id) return '';
  return id.trim().replace(/^<|>$/g, '').toLowerCase();
}

export function splitReferences(header: string | undefined | null): string[] {
  if (!header) return [];
  return header
    .split(/\s+/)
    .map((p) => normalizeMessageId(p))
    .filter(Boolean);
}

export function isInternalFrom(from: string, ourFrom: string): boolean {
  const a = extractEmailAddress(from);
  const b = extractEmailAddress(ourFrom);
  if (!a || !b) return false;
  if (a === b) return true;
  const local = b.split('@')[0];
  const domain = b.split('@')[1];
  if (local && domain && a.startsWith(`${local}+`) && a.endsWith(`@${domain}`)) return true;
  return false;
}

export function isOwnerNotificationSubject(subject: string | undefined | null): boolean {
  if (!subject) return false;
  return subject.includes('🔔');
}
