// Tokens e snapping partilhados pelo HTML de email e pelo RTE.

export const EMAIL_FONT = 'Arial,Helvetica,sans-serif';
export const EMAIL_WIDTH = 720;
export const EMAIL_SIZE_SMALL = 13;
export const EMAIL_SIZE_BODY = 16;
export const EMAIL_SIZE_TITLE = 20;
export const EMAIL_SIZES = [EMAIL_SIZE_SMALL, EMAIL_SIZE_BODY, EMAIL_SIZE_TITLE] as const;

export const EMAIL_COLOR_BRAND = '#8a2831';
export const EMAIL_COLOR_TEXT = '#3b2a2a';
export const EMAIL_COLOR_MUTED = '#8a7a74';
export const EMAIL_COLOR_ON_BRAND = '#fbf5ef';

export const EMAIL_PALETTE = [EMAIL_COLOR_BRAND, EMAIL_COLOR_TEXT, EMAIL_COLOR_MUTED] as const;
const KEEP_COLORS = [...EMAIL_PALETTE, EMAIL_COLOR_ON_BRAND];

const SECTION_TITLE = `font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px;font-weight:700;color:${EMAIL_COLOR_BRAND};margin:24px 0 8px`;
const SECTION_TITLE_LARGE = `font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_TITLE}px;font-weight:700;color:${EMAIL_COLOR_BRAND};margin:24px 0 8px`;

export const EMAIL_STYLE = {
  font: EMAIL_FONT,
  body: `font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px;line-height:1.6;color:${EMAIL_COLOR_TEXT}`,
  p: `font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px;line-height:1.6;color:${EMAIL_COLOR_TEXT};margin:0 0 12px`,
  h2: SECTION_TITLE,
  h3: SECTION_TITLE,
  hTitle: SECTION_TITLE_LARGE,
  priceCell: `font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px;line-height:1.6;color:${EMAIL_COLOR_TEXT};padding:4px 0;border:0`,
  button: `display:inline-block;background:${EMAIL_COLOR_BRAND};color:${EMAIL_COLOR_ON_BRAND};text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px`,
  buttonOutline: `display:inline-block;background:transparent;color:${EMAIL_COLOR_BRAND};text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;border:1.5px solid ${EMAIL_COLOR_BRAND};font-family:${EMAIL_FONT};font-size:${EMAIL_SIZE_BODY}px`,
} as const;

export function snapFontSize(px: number): number {
  let best = EMAIL_SIZE_BODY;
  let dist = Infinity;
  for (const size of EMAIL_SIZES) {
    const d = Math.abs(px - size);
    if (d < dist) {
      dist = d;
      best = size;
    }
  }
  return best;
}

export function parseCssColor(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
    }
    return `#${h}`.toLowerCase();
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }
  return null;
}

export function snapColor(value: string): string {
  const hex = parseCssColor(value);
  if (!hex) return value.trim();
  if (KEEP_COLORS.includes(hex as typeof KEEP_COLORS[number])) return hex;
  let best = EMAIL_COLOR_TEXT;
  let dist = Infinity;
  for (const color of EMAIL_PALETTE) {
    const d = colorDistance(hex, color);
    if (d < dist) {
      dist = d;
      best = color;
    }
  }
  return best;
}

export function snapFontSizeValue(value: string): string {
  const px = parseFontSizePx(value);
  if (px == null) return value.trim();
  return `${snapFontSize(px)}px`;
}

function parseFontSizePx(value: string): number | null {
  const raw = value.trim().toLowerCase();
  const px = raw.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  const named: Record<string, number> = {
    'xx-small': 13,
    'x-small': 13,
    small: 13,
    medium: 16,
    large: 20,
    'x-large': 20,
    'xx-large': 20,
    'xxx-large': 20,
  };
  if (raw in named) return named[raw];
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function colorDistance(a: string, b: string): number {
  const ar = hexRgb(a);
  const br = hexRgb(b);
  if (!ar || !br) return Infinity;
  const dr = ar[0] - br[0];
  const dg = ar[1] - br[1];
  const db = ar[2] - br[2];
  return dr * dr + dg * dg + db * db;
}

function hexRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
