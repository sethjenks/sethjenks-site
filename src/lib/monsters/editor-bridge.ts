import type { Editor } from "tldraw";

type Listener = () => void;

let editor: Editor | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function publishEditor(next: Editor | null) {
  if (editor === next) {
    return;
  }
  editor = next;
  emit();
}

export function getEditor(): Editor | null {
  return editor;
}

export function subscribeEditor(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
