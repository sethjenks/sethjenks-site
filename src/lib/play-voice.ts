export const VOICE_PHRASES = [
  "I'll never be good enough",
  "I'm a crappy designer.",
] as const;

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function voicePhraseAt(index: number): string {
  const count = VOICE_PHRASES.length;
  const wrapped = ((index % count) + count) % count;
  return VOICE_PHRASES[wrapped] ?? VOICE_PHRASES[0];
}

export function scrambleText(from: string, to: string, t: number): string {
  const progress = Math.min(1, Math.max(0, t));
  if (progress <= 0) {
    return from;
  }
  if (progress >= 1) {
    return to;
  }

  const length = Math.round(from.length + (to.length - from.length) * progress);
  const lockUntil = Math.floor(progress * to.length);
  const step = Math.floor(progress * 30);
  let out = "";

  for (let index = 0; index < length; index += 1) {
    const target = to[index];
    if (target != null && index < lockUntil) {
      out += target;
      continue;
    }
    if (target != null && !isLetter(target)) {
      out += target;
      continue;
    }
    if (target == null) {
      const source = from[index];
      if (source != null && !isLetter(source)) {
        out += source;
        continue;
      }
    }

    const upper =
      target != null && target === target.toUpperCase() && target !== target.toLowerCase();
    const glyphs = upper ? UPPER : LOWER;
    const pick = Math.abs((index + 1) * 17 + step * 13) % glyphs.length;
    out += glyphs[pick] ?? glyphs[0];
  }

  return out;
}

function isLetter(char: string) {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}
