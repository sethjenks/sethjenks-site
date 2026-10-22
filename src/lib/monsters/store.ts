import type { MonsterDrawing, MonsterTraits } from "./types";

export type MonsterSummon = {
  token: number;
  drawing: MonsterDrawing;
  traits: MonsterTraits;
  reduced: boolean;
  shapeIds: string[];
};

type Listener = () => void;

let summon: MonsterSummon | null = null;
let alive = false;
let token = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMonster(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isMonsterAlive(): boolean {
  return alive;
}

export function getSummon(): MonsterSummon | null {
  return summon;
}

export function placeSummon(input: {
  drawing: MonsterDrawing;
  traits: MonsterTraits;
  reduced: boolean;
}): boolean {
  if (alive) {
    return false;
  }
  token += 1;
  alive = true;
  summon = {
    token,
    drawing: input.drawing,
    traits: input.traits,
    reduced: input.reduced,
    shapeIds: input.drawing.shapeIds,
  };
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("monster:summon"));
  }
  return true;
}

export function releaseMonster() {
  alive = false;
  summon = null;
  emit();
}
