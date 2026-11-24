/** Decimal megabytes, one decimal, two when under 0.1 MB. */
export function formatMegabytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb < 0.1) return `${mb.toFixed(2)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export const VIDEO_LIMIT = 8 * 1024 * 1024;
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const MESSAGES_LIMIT = 10_000_000;

export const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "M4V ",
  "mmp4",
  "MSNV",
  "dash",
]);

export function isMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (box !== "ftyp") return false;
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return MP4_BRANDS.has(brand);
}
