// Sanitização de HTML de emails inbound para o admin (allowlist simples).

const ALLOWED_TAGS = new Set([
  'a', 'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img', 'hr', 'pre', 'code',
]);

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeEmailHtml(html: string | undefined | null): string {
  if (!html) return '';
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '');

  out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    const closing = full.startsWith('</');
    if (!ALLOWED_TAGS.has(name)) return '';
    if (closing) return `</${name}>`;
    if (name === 'br' || name === 'hr') return `<${name}>`;
    let safe = '';
    if (name === 'a') {
      const href = pickAttr(attrs, 'href');
      if (href && /^(https?:|mailto:)/i.test(href) && !/^javascript:/i.test(href)) {
        safe += ` href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`;
      }
    }
    if (name === 'img') {
      const src = pickAttr(attrs, 'src');
      const alt = pickAttr(attrs, 'alt') || '';
      if (src && /^https?:/i.test(src)) {
        safe += ` src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"`;
      } else {
        return '';
      }
    }
    return `<${name}${safe}>`;
  });

  return out;
}

function pickAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = attrs.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

export function htmlToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
