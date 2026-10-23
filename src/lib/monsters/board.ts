import type { MonsterDrawing } from "./types";

export type BoardMode = "pen" | "select";

export type BoardSelection = {
  draws: number;
  other: number;
  total: number;
};

export type BoardHandle = {
  getSelection: () => BoardSelection;
  extract: () => MonsterDrawing | null;
};

const EMPTY: BoardSelection = { draws: 0, other: 0, total: 0 };

let mode: BoardMode = "pen";
let handle: BoardHandle | null = null;
let offlineNote: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeBoard(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBoardMode(): BoardMode {
  return mode;
}

export function setBoardMode(next: BoardMode) {
  if (mode === next) {
    return;
  }
  mode = next;
  emit();
}

export function publishBoard(next: BoardHandle | null) {
  handle = next;
  emit();
}

export function notifyBoard() {
  emit();
}

export function getBoard(): BoardHandle | null {
  return handle;
}

export function hasBoard(): boolean {
  return handle !== null;
}

export function getSelectionSnapshot(): BoardSelection {
  return handle?.getSelection() ?? EMPTY;
}

export function reportOffline(message: string) {
  if (offlineNote === message) {
    return;
  }
  offlineNote = message;
  emit();
}

export function getOfflineNote(): string | null {
  return offlineNote;
}
