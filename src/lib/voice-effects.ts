export const VOICE_EFFECTS = [
  { id: "shine", name: "Shine", kind: "callout", ms: 1450 },
  { id: "glow", name: "Glow", kind: "callout", ms: 1500 },
  { id: "pulse", name: "Pulse", kind: "callout", ms: 1300 },
  { id: "ripple", name: "Ripple", kind: "callout", ms: 1500 },
  { id: "ink", name: "Ink", kind: "callout", ms: 1350 },
  { id: "blood", name: "Blood", kind: "callout", ms: 1350 },
  { id: "marker", name: "Marker", kind: "callout", ms: 1450 },
  { id: "ember", name: "Ember", kind: "callout", ms: 1400 },
  { id: "vaporize", name: "Vaporize", kind: "exit", ms: 1500 },
  { id: "smoke", name: "Smoke", kind: "exit", ms: 1500 },
] as const satisfies readonly {
  id: string;
  name: string;
  kind: "callout" | "exit";
  ms: number;
}[];

export type VoiceEffect = (typeof VOICE_EFFECTS)[number];
export type VoiceEffectId = VoiceEffect["id"];
export type VoiceEffectKind = VoiceEffect["kind"];

const EFFECT_IDS = new Set<string>(VOICE_EFFECTS.map((effect) => effect.id));

export function isVoiceEffectId(value: unknown): value is VoiceEffectId {
  return typeof value === "string" && EFFECT_IDS.has(value);
}

export function voiceEffectById(id: VoiceEffectId): VoiceEffect {
  const effect = VOICE_EFFECTS.find((item) => item.id === id);
  if (!effect) {
    throw new Error(`Unknown voice effect: ${id}`);
  }
  return effect;
}
