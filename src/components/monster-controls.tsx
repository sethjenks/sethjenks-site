"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getBoard,
  getBoardMode,
  getSelectionSnapshot,
  hasBoard,
  setBoardMode,
  subscribeBoard,
  type BoardSelection,
} from "@/lib/monsters/board";
import { isMonsterAlive, placeSummon, subscribeMonster } from "@/lib/monsters/store";
import { deriveTraits } from "@/lib/monsters/traits";

const EMPTY: BoardSelection = { draws: 0, other: 0, total: 0 };

function hintFor(
  selection: BoardSelection,
  mode: "pen" | "select",
  alive: boolean,
  ready: boolean,
  problem: string | null,
): string {
  if (problem) {
    return problem;
  }
  if (alive) {
    return "One creature is already on the page.";
  }
  if (!ready) {
    return "Connecting…";
  }
  if (selection.other > 0 && selection.draws === 0) {
    return "Select ink strokes, not text.";
  }
  if (selection.draws > 0) {
    return "These strokes can step off the wall.";
  }
  if (mode === "select") {
    return "Drag around the strokes you want.";
  }
  if (selection.total > 0) {
    return "Bring to life uses every stroke you drew. Select to choose some.";
  }
  return "Draw with the pen.";
}

export function MonsterControls({ note }: { note: string | null }) {
  const mode = useSyncExternalStore(subscribeBoard, getBoardMode, () => "pen" as const);
  const selection = useSyncExternalStore(subscribeBoard, getSelectionSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(subscribeBoard, hasBoard, () => false);
  const alive = useSyncExternalStore(subscribeMonster, isMonsterAlive, () => false);
  const [problem, setProblem] = useState<string | null>(null);

  const canSummon =
    ready && !alive && (selection.draws > 0 || (selection.other === 0 && selection.total > 0));

  function onSummon() {
    const board = getBoard();
    if (!board || isMonsterAlive()) {
      return;
    }
    try {
      const drawing = board.extract();
      if (!drawing) {
        setProblem("Draw a little more ink first.");
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const placed = placeSummon({
        drawing,
        traits: deriveTraits(drawing.strokes),
        reduced,
      });
      if (!placed) {
        setProblem("One creature is already on the page.");
        return;
      }
      setProblem(null);
    } catch {
      setProblem("Those strokes did not wake. Try another selection.");
    }
  }

  return (
    <div className="monster-bar">
      {note ? <p className="monster-note">{note}</p> : null}
      <p className="monster-hint" id="monster-hint">
        {hintFor(selection, mode, alive, ready, problem)}
      </p>
      <div className="monster-actions">
        <div className="monster-modes" role="group" aria-label="Drawing tool">
          <button
            type="button"
            className="monster-mode"
            aria-pressed={mode === "pen"}
            disabled={!ready}
            onClick={() => {
              setProblem(null);
              setBoardMode("pen");
            }}
          >
            Pen
          </button>
          <button
            type="button"
            className="monster-mode"
            aria-pressed={mode === "select"}
            disabled={!ready}
            onClick={() => {
              setProblem(null);
              setBoardMode("select");
            }}
          >
            Select
          </button>
        </div>
        <button
          type="button"
          className="monster-summon"
          disabled={!canSummon}
          aria-describedby="monster-hint"
          onClick={onSummon}
        >
          Bring to life
        </button>
      </div>
    </div>
  );
}
