"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Editor } from "tldraw";
import { getEditor, subscribeEditor } from "@/lib/monsters/editor-bridge";
import { extractDrawing } from "@/lib/monsters/extract";
import { isMonsterAlive, placeSummon, subscribeMonster } from "@/lib/monsters/store";
import { deriveTraits } from "@/lib/monsters/traits";

type SelectionState = {
  draws: number;
  other: number;
};

function readSelection(editor: Editor): SelectionState {
  let draws = 0;
  let other = 0;
  for (const id of editor.getSelectedShapeIds()) {
    const shape = editor.getShape(id);
    if (!shape) {
      continue;
    }
    if (shape.type === "draw") {
      draws += 1;
    } else {
      other += 1;
    }
  }
  return { draws, other };
}

function hintFor(selection: SelectionState, alive: boolean, problem: string | null): string {
  if (problem) {
    return problem;
  }
  if (alive) {
    return "One creature is already on the page.";
  }
  if (selection.draws > 0) {
    return "These strokes can step off the wall.";
  }
  if (selection.other > 0) {
    return "Select ink strokes, not text.";
  }
  return "Draw with the pen, then select the strokes.";
}

export function MonsterControls() {
  const editor = useSyncExternalStore(subscribeEditor, getEditor, () => null);
  const alive = useSyncExternalStore(subscribeMonster, isMonsterAlive, () => false);
  const [selection, setSelection] = useState<SelectionState>({ draws: 0, other: 0 });
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const update = () => {
      const next = readSelection(editor);
      setSelection((current) =>
        current.draws === next.draws && current.other === next.other ? current : next,
      );
      setProblem(null);
    };
    update();
    return editor.store.listen(update, { scope: "session" });
  }, [editor]);

  const canSummon = Boolean(editor) && !alive && selection.draws > 0;

  function onSummon() {
    if (!editor || isMonsterAlive()) {
      return;
    }
    try {
      const drawing = extractDrawing(editor);
      if (!drawing) {
        setProblem("Draw a little more ink first.");
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      placeSummon({
        drawing,
        traits: deriveTraits(drawing.strokes),
        reduced,
      });
    } catch {
      setProblem("Those strokes did not wake. Try another selection.");
    }
  }

  return (
    <div className="monster-bar">
      <p className="monster-hint" id="monster-hint">
        {hintFor(selection, alive, problem)}
      </p>
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
  );
}
