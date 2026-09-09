// Sanitização de HTML de emails inbound para o admin (allowlist simples).

import { EMAIL_FONT, EMAIL_STYLE, EMAIL_WIDTH, snapColor, snapFontSizeValue } from './email-style';

const ALLOWED_TAGS = new Set([
  'a', 'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img', 'hr', 'pre', 'code',
]);

const TABLE_ATTRS = ['role', 'cellpadding', 'cellspacing', 'border', 'valign', 'bgcolor'] as const;
const STYLE_TAGS = new Set(['p', 'h2', 'h3', 'span', 'a', 'strong', 'b', 'li', 'td', 'th']);
const SNAP_SIZE_TAGS = new Set(['p', 'h2', 'h3', 'span', 'a', 'strong', 'b', 'li']);
const HOLE_RE_SRC = '%%MIANAHOLE(\\d+)%%';

export function stripEditorLocks(html: string): string {
  return (html || '').replace(/\scontenteditable(?:="[^"]*")?/gi, '');
}

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
    const style = pickAttr(attrs, 'style');
    if (style && !/expression|javascript:/i.test(style)) {
      safe += ` style="${escapeHtml(style)}"`;
    }
    const align = pickAttr(attrs, 'align');
    if (align) safe += ` align="${escapeHtml(align)}"`;
    const width = pickAttr(attrs, 'width');
    if (width) safe += ` width="${escapeHtml(width)}"`;
    const height = pickAttr(attrs, 'height');
    if (height) safe += ` height="${escapeHtml(height)}"`;
    const dataBlock = pickAttr(attrs, 'data-miana-block');
    if (dataBlock) safe += ` data-miana-block="${escapeHtml(dataBlock)}"`;
    const editable = pickAttr(attrs, 'contenteditable');
    if (editable) safe += ` contenteditable="${escapeHtml(editable)}"`;
    if (name === 'table' || name === 'td' || name === 'th' || name === 'tr') {
      for (const attr of TABLE_ATTRS) {
        const val = pickAttr(attrs, attr);
        if (val) safe += ` ${attr}="${escapeHtml(val)}"`;
      }
    }
    if (name === 'a') {
      const href = pickAttr(attrs, 'href');
      if (href && /^(https?:|mailto:|#)/i.test(href) && !/^javascript:/i.test(href)) {
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

/** Uniformiza fonte, 3 tamanhos, paleta e parágrafos. Não altera o texto nem {{placeholders}}. */
export function normalizeEmailBodyHtml(html: string): string {
  if (!html) return '';
  const holes: string[] = [];
  const stash = (chunk: string) => {
    holes.push(chunk);
    return `%%MIANAHOLE${holes.length - 1}%%`;
  };

  let out = html.replace(/\{\{[a-z0-9_]+\}\}/gi, stash);
  out = out.replace(/<!--miana-block-start[\s\S]*?<!--miana-block-end(?::[a-z_]+)?-->/g, stash);

  for (let i = 0; i < 8; i++) {
    const next = convertFontTags(out);
    if (next === out) break;
    out = next;
  }
  out = convertParagraphDivs(out);
  out = out.replace(/max-width:\s*560px/gi, `max-width:${EMAIL_WIDTH}px`);
  out = out.replace(/<h2\b/gi, '<h3').replace(/<\/h2>/gi, '</h3>');
  out = unwrapParagraphHeadings(out);
  out = normalizeOpeningTags(out);
  out = collapseEmptyParagraphs(out);

  for (let i = holes.length - 1; i >= 0; i--) {
    out = out.split(`%%MIANAHOLE${i}%%`).join(holes[i]);
  }
  return out;
}

function convertFontTags(html: string): string {
  return html.replace(/<font\b([^>]*)>((?:(?!<\/?font\b)[\s\S])*)<\/font>/gi, (_, attrs: string, inner: string) => {
    const decls = parseStyle(pickAttr(attrs, 'style') || '');
    const color = pickAttr(attrs, 'color');
    if (color) decls.color = snapColor(color);
    const size = pickAttr(attrs, 'size');
    if (size) decls['font-size'] = htmlFontSize(size);
    decls['font-family'] = EMAIL_FONT;
    return `<span style="${serializeStyle(decls)}">${inner}</span>`;
  });
}

function htmlFontSize(size: string): string {
  const n = Number(size);
  if (n <= 2) return '13px';
  if (n <= 4) return '16px';
  return '20px';
}

function convertParagraphDivs(html: string): string {
  return html.replace(/<div\b([^>]*)>([\s\S]*?)<\/div>/gi, (full, attrs: string, inner: string) => {
    if (/data-miana-block/i.test(attrs)) return full;
    if (/\bclass\s*=\s*["'][^"']*\bgmail_quote\b/i.test(attrs)) return full;
    if (/<(table|div|h[1-4]|ul|ol|p|blockquote)\b/i.test(inner)) return full;
    return `<p${attrs}>${inner}</p>`;
  });
}

function unwrapParagraphHeadings(html: string): string {
  return html.replace(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi, (full, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    const greeting = /^(al[oô]|olá|hello|hi)(\s|,|$)/i.test(text);
    if (!greeting && text.length <= 48) return full;
    return `<p${attrs}>${inner}</p>`;
  });
}

function normalizeOpeningTags(html: string): string {
  return html.replace(/<(p|h2|h3|span|a|strong|b|li|td|th)\b([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (!STYLE_TAGS.has(name)) return full;
    const style = pickAttr(attrs, 'style') || '';
    const decls = parseStyle(style);
    const next = applyTagDefaults(name, decls);
    const serialized = serializeStyle(next);
    if (serialized === style.trim()) return full;
    const rest = stripAttr(attrs, 'style').trim();
    const styleAttr = serialized ? ` style="${serialized}"` : '';
    return `<${name}${rest ? ` ${rest}` : ''}${styleAttr}>`;
  });
}

function applyTagDefaults(tag: string, decls: Record<string, string>): Record<string, string> {
  const out = { ...decls };
  const styled = Object.keys(decls).length > 0;
  if (tag === 'p' && !styled) return parseStyle(EMAIL_STYLE.p);
  if (tag === 'h2' || tag === 'h3') return parseStyle(EMAIL_STYLE.h3);
  if (SNAP_SIZE_TAGS.has(tag) && out['font-size']) {
    out['font-size'] = snapFontSizeValue(out['font-size']);
  }
  if (out.color) out.color = snapColor(out.color);
  if (tag === 'td' || tag === 'th') {
    if (!out['font-family'] && out['font-size'] !== '0' && out['font-size'] !== '0px') {
      out['font-family'] = EMAIL_FONT;
    }
    return out;
  }
  if (styled && !out['font-family']) out['font-family'] = EMAIL_FONT;
  if (tag === 'p' && !hasMargin(out)) out.margin = '0 0 12px';
  return out;
}

function hasMargin(decls: Record<string, string>): boolean {
  return !!(decls.margin || decls['margin-top'] || decls['margin-bottom'] || decls['margin-block']);
}

function collapseEmptyParagraphs(html: string): string {
  const empty = `<p\\b[^>]*>(?:\\s|<br\\s*/?>|&nbsp;)*<\\/p>`;
  const hole = HOLE_RE_SRC;
  return html.replace(new RegExp(`(?:${empty}\\s*){2,}`, 'gi'), (m, offset, full) => {
    const before = full.slice(Math.max(0, offset - 24), offset);
    const after = full.slice(offset + m.length, offset + m.length + 24);
    if (new RegExp(hole).test(before) || new RegExp(hole).test(after)) return m;
    const first = m.match(/<p\b[^>]*>[\s\S]*?<\/p>/i);
    return first ? first[0] : m;
  });
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key && val) out[key] = val;
  }
  return out;
}

function serializeStyle(decls: Record<string, string>): string {
  return Object.entries(decls).map(([key, val]) => `${key}:${val}`).join(';');
}

function stripAttr(attrs: string, name: string): string {
  return attrs.replace(new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'), '');
}

export function htmlToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const QUOTE_MARKERS = [
  /<div[^>]*class="[^"]*\bgmail_quote\b[^"]*"/i,
  /<blockquote\b/i,
  /<div[^>]*id="[^"]*divRplyFwdMsg[^"]*"/i,
];

const WROTE_LINE = /(?:<br\s*\/?>|<\/div>|<\/p>)\s*(?:On\s[\s\S]{0,160}?wrote:|Em\s[\s\S]{0,160}?escreveu:)/i;

/** Separa o texto novo de um reply do histórico citado (Gmail, Apple Mail, Outlook). */
export function splitQuotedReply(html: string | null | undefined): { main: string; quoted: string } {
  const raw = html || '';
  if (!raw.trim()) return { main: '', quoted: '' };

  let idx = -1;
  for (const re of QUOTE_MARKERS) {
    const match = raw.match(re);
    if (match && match.index != null && (idx < 0 || match.index < idx)) idx = match.index;
  }
  const wrote = raw.search(WROTE_LINE);
  if (wrote >= 0 && (idx < 0 || wrote < idx)) idx = wrote;

  if (idx <= 0) return { main: raw, quoted: '' };
  const main = raw.slice(0, idx).trim();
  const quoted = raw.slice(idx).trim();
  if (!main) return { main: raw, quoted: '' };
  return { main, quoted };
}
