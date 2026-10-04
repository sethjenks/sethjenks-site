export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function plateRows(
  width: number,
  height: number,
  columns: number,
): number {
  return Math.max(1, Math.round((columns * height * 0.55) / width));
}

export function cellHash(seed: number, column: number, row: number): number {
  let hash = (seed ^ (column * 374761393) ^ (row * 668265263)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function encodeTones(tones: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < tones.length; index += chunk) {
    binary += String.fromCharCode(
      ...tones.subarray(index, Math.min(tones.length, index + chunk)),
    );
  }
  return btoa(binary);
}

export function decodeTones(encoded: string, expectedLength: number): Uint8Array {
  const binary = atob(encoded);
  const tones = new Uint8Array(expectedLength);
  const length = Math.min(binary.length, expectedLength);
  for (let index = 0; index < length; index += 1) {
    tones[index] = binary.charCodeAt(index);
  }
  return tones;
}

export function unit(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 1);
}
