// Diagnostic photos in R2. HEIC is stored as-is; the admin page converts it
// in the browser (Chrome cannot display HEIC in <img>).

import { R2_FOLDER } from './constants';

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTOS = 3;

const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'heif',
  'hevc',
  'hevx',
  'heim',
  'heis',
]);

export function isSafePhotoKey(key: string): boolean {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return false;
  }
  if (!decoded || decoded.includes('..') || decoded.includes('\\')) return false;
  return decoded.startsWith(`${R2_FOLDER}/`);
}

export function photoAdminUrl(key: string): string {
  return `/api/admin/photo?key=${encodeURIComponent(key)}`;
}

function brandAt(bytes: Uint8Array, offset: number): string {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function isJpegBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function isHeicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (brandAt(bytes, 4) !== 'ftyp') return false;

  const brands: string[] = [brandAt(bytes, 8)];
  for (let i = 16; i + 4 <= bytes.length && i < 80; i += 4) {
    brands.push(brandAt(bytes, i));
  }
  if (brands.includes('avif') || brands.includes('avis')) return false;
  return brands.some((b) => HEIC_BRANDS.has(b));
}

export function sniffImageType(bytes: Uint8Array, fallback = 'application/octet-stream'): string {
  if (isJpegBytes(bytes)) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 12 && brandAt(bytes, 0) === 'RIFF' && brandAt(bytes, 8) === 'WEBP') {
    return 'image/webp';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (isHeicBytes(bytes)) return 'image/heic';
  return fallback;
}

function safeExt(name: string, contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  if (contentType === 'image/heic') return 'heic';
  const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
  return /^[a-z0-9]{2,4}$/.test(ext) ? ext : 'jpg';
}

export type StoredPhoto = {
  key: string;
  body: ArrayBuffer;
  contentType: string;
};

export async function prepareStoredPhoto(
  file: File,
  index: number,
  token: string,
): Promise<StoredPhoto> {
  const bytes = await file.arrayBuffer();
  const contentType = sniffImageType(new Uint8Array(bytes), file.type || 'application/octet-stream');
  return {
    key: `${R2_FOLDER}/${token}/photo-${index}.${safeExt(file.name, contentType)}`,
    body: bytes,
    contentType,
  };
}

export function isUploadedPhoto(value: FormDataEntryValue): value is File {
  if (typeof File !== 'undefined' && value instanceof File) return value.size > 0;
  if (typeof value !== 'object' || value === null) return false;
  const blob = value as Blob;
  return typeof blob.arrayBuffer === 'function' && blob.size > 0;
}
