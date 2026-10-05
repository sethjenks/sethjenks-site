import voiceFile from "../../content/voice.json";

export type VoiceMessage = {
  text: string;
};

export type VoiceDeck = {
  next: () => VoiceMessage;
};

const HOLD_MIN_MS = 2000;
const HOLD_PER_WORD_MS = 280;
const HOLD_MAX_MS = 8000;

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const VOICE_MESSAGES = parseVoiceMessages(voiceFile);

export function voiceHoldMs(message: VoiceMessage): number {
  const words = countWords(message.text);
  return Math.min(HOLD_MAX_MS, Math.max(HOLD_MIN_MS, words * HOLD_PER_WORD_MS));
}

export function createVoiceDeck(messages: readonly VoiceMessage[]): VoiceDeck {
  let order: VoiceMessage[] = [];
  let cursor = 0;
  let last: VoiceMessage | null = null;

  const refill = () => {
    order = shuffle(messages);
    cursor = 0;
    const previous = last;
    const first = order[0];
    if (!previous || !first || order.length < 2 || !sameMessage(first, previous)) {
      return;
    }

    const swapAt = order.findIndex((item, index) => index > 0 && !sameMessage(item, previous));
    const swap = order[swapAt];
    if (!swap || swapAt <= 0) {
      return;
    }

    order[0] = swap;
    order[swapAt] = first;
  };

  return {
    next() {
      if (messages.length === 0) {
        throw new Error("content/voice.json has no messages.");
      }
      if (cursor >= order.length) {
        refill();
      }
      const message = order[cursor];
      if (!message) {
        throw new Error("content/voice.json has no messages.");
      }
      cursor += 1;
      last = message;
      return message;
    },
  };
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

function parseVoiceMessages(value: unknown): VoiceMessage[] {
  if (!Array.isArray(value)) {
    throw new Error("content/voice.json must be an array of messages.");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`content/voice.json[${index}] must be an object.`);
    }

    const { text } = item;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(`content/voice.json[${index}].text must be a non-empty string.`);
    }

    return { text: text.trim() };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function sameMessage(a: VoiceMessage, b: VoiceMessage): boolean {
  return a.text === b.text;
}

function shuffle(messages: readonly VoiceMessage[]): VoiceMessage[] {
  const next = [...messages];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const other = next[swap];
    if (!current || !other) {
      continue;
    }
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

function isLetter(char: string) {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}
