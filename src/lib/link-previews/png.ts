const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 24) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return (
    bytes[12] === 73 && bytes[13] === 72 && bytes[14] === 68 && bytes[15] === 82
  );
}

export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isPng(bytes)) return null;
  const width =
    ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height =
    ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
  if (width < 1 || height < 1) return null;
  return { width, height };
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return riff === "RIFF" && webp === "WEBP";
}

export function imageKind(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (isPng(bytes)) return "png";
  if (isJpeg(bytes)) return "jpg";
  if (isWebp(bytes)) return "webp";
  return null;
}
