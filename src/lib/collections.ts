/**
 * NFT collection manifests. Trashformers and BatGAN are one JSON file.
 * Chia Friends is an index plus chunks so the first open does not parse
 * the full list. Keep chunk layout in sync with scripts/fetch-nft-manifests.mjs.
 */

import { type CollectionId } from "@/lib/collection-ids";

export type { CollectionId } from "@/lib/collection-ids";
export { collectionForGallery } from "@/lib/collection-ids";

export type CollectionPiece = {
  name: string;
  src: string;
};

export type CollectionCatalog = {
  title: string;
  count: number;
  piece: (index: number) => CollectionPiece | undefined;
  ensure: (index: number) => void;
  /** Resolves once the centered piece's chunk is available, or has failed. */
  heroReady: Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

const PREFETCH_TTL_MS = 15_000;
const CHIA_INDEX = "/collections/chia-friends/index.json";

type Slot = {
  retained: number;
  timer: number;
  controller: AbortController;
  promise: Promise<CollectionCatalog>;
};

const slots = new Map<CollectionId, Slot>();

export function collectionIsPixelated(id: CollectionId): boolean {
  switch (id) {
    case "chia-friends":
      return true;
    case "trashformers":
    case "batgan":
      return false;
    default: {
      const unknown: never = id;
      return unknown;
    }
  }
}

/** Start the manifest fetch on hover or focus. Drop it if the tile is never opened. */
export function prefetchCollection(id: CollectionId): void {
  const slot = start(id);
  if (slot.retained > 0) {
    return;
  }
  armTtl(slot, id);
}

/** Hold the manifest while the viewer is open. */
export function openCollection(id: CollectionId): {
  catalog: Promise<CollectionCatalog>;
  release: () => void;
} {
  const slot = start(id);
  slot.retained += 1;
  window.clearTimeout(slot.timer);
  return {
    catalog: slot.promise,
    release: () => {
      slot.retained -= 1;
      if (slot.retained <= 0) {
        armTtl(slot, id);
      }
    },
  };
}

function start(id: CollectionId): Slot {
  const existing = slots.get(id);
  if (existing) {
    return existing;
  }

  const controller = new AbortController();
  const slot: Slot = {
    retained: 0,
    timer: 0,
    controller,
    promise: loadCatalog(id, controller.signal).catch((error: unknown) => {
      if (slots.get(id) === slot) {
        slots.delete(id);
      }
      throw error;
    }),
  };
  slots.set(id, slot);
  return slot;
}

function armTtl(slot: Slot, id: CollectionId) {
  window.clearTimeout(slot.timer);
  slot.timer = window.setTimeout(() => {
    if (slot.retained > 0) {
      return;
    }
    slot.controller.abort();
    if (slots.get(id) === slot) {
      slots.delete(id);
    }
  }, PREFETCH_TTL_MS);
}

async function loadCatalog(
  id: CollectionId,
  signal: AbortSignal,
): Promise<CollectionCatalog> {
  switch (id) {
    case "chia-friends":
      return loadChunked(signal);
    case "trashformers":
      return loadSingle("/collections/trashformers.json", signal);
    case "batgan":
      return loadSingle("/collections/batgan.json", signal);
    default: {
      const unknown: never = id;
      return unknown;
    }
  }
}

async function loadSingle(url: string, signal: AbortSignal): Promise<CollectionCatalog> {
  const manifest = parseManifest(await fetchJson(url, signal));
  const items = manifest.items;
  return {
    title: manifest.title,
    count: items.length,
    piece: (index) => items[index],
    ensure: () => {},
    heroReady: Promise.resolve(),
    subscribe: () => () => {},
  };
}

async function loadChunked(signal: AbortSignal): Promise<CollectionCatalog> {
  const index = parseIndex(await fetchJson(CHIA_INDEX, signal));
  const chunkCount = Math.ceil(index.count / index.chunkSize);
  const loaded: Array<CollectionPiece[] | undefined> = [];
  const inflight = new Map<number, Promise<void>>();
  const failed = new Set<number>();
  const listeners = new Set<() => void>();

  const emit = () => {
    if (signal.aborted) {
      return;
    }
    for (const listener of listeners) {
      listener();
    }
  };

  const loadChunk = (chunk: number): Promise<void> => {
    if (chunk < 0 || chunk >= chunkCount || failed.has(chunk)) {
      return Promise.resolve();
    }
    if (loaded[chunk]) {
      return Promise.resolve();
    }
    const existing = inflight.get(chunk);
    if (existing) {
      return existing;
    }

    const expected = Math.min(index.chunkSize, index.count - chunk * index.chunkSize);
    const pending = fetchJson(`/collections/chia-friends/${chunk}.json`, signal)
      .then((value) => {
        if (signal.aborted) {
          return;
        }
        const pieces = parseChunk(value, expected);
        loaded[chunk] = pieces;
        emit();
      })
      .catch((error: unknown) => {
        inflight.delete(chunk);
        if (!signal.aborted) {
          failed.add(chunk);
        }
        throw error;
      });
    inflight.set(chunk, pending);
    return pending;
  };

  const heroChunk = Math.floor(centerIndex(index.count) / index.chunkSize);
  const heroReady = loadChunk(heroChunk).then(
    () => undefined,
    () => undefined,
  );

  return {
    title: index.title,
    count: index.count,
    piece: (itemIndex) => {
      if (itemIndex < 0 || itemIndex >= index.count) {
        return undefined;
      }
      const chunk = Math.floor(itemIndex / index.chunkSize);
      const offset = itemIndex - chunk * index.chunkSize;
      return loaded[chunk]?.[offset];
    },
    ensure: (itemIndex) => {
      if (itemIndex < 0 || itemIndex >= index.count) {
        return;
      }
      void loadChunk(Math.floor(itemIndex / index.chunkSize)).catch(() => undefined);
    },
    heroReady,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Same center cell as heroIndex in collection-lens-math. */
function centerIndex(count: number): number {
  if (count <= 1) {
    return 0;
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const row = Math.floor((rows - 1) / 2);
  const col = Math.floor((cols - 1) / 2);
  return Math.min(count - 1, row * cols + col);
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Collection failed to load.");
  }
  return response.json();
}

function parseManifest(value: unknown): { title: string; items: CollectionPiece[] } {
  if (typeof value !== "object" || value === null) {
    throw new Error("Collection failed to load.");
  }
  const record = value as { title?: unknown; items?: unknown };
  const items = parsePieces(record.items);
  if (items.length === 0) {
    throw new Error("Collection failed to load.");
  }
  return {
    title: typeof record.title === "string" ? record.title : "Collection",
    items,
  };
}

function parseIndex(value: unknown): { title: string; count: number; chunkSize: number } {
  if (typeof value !== "object" || value === null) {
    throw new Error("Collection failed to load.");
  }
  const record = value as { title?: unknown; count?: unknown; chunkSize?: unknown };
  if (!Number.isInteger(record.count) || (record.count as number) < 1) {
    throw new Error("Collection failed to load.");
  }
  if (!Number.isInteger(record.chunkSize) || (record.chunkSize as number) < 1) {
    throw new Error("Collection failed to load.");
  }
  return {
    title: typeof record.title === "string" ? record.title : "Chia Friends",
    count: record.count as number,
    chunkSize: record.chunkSize as number,
  };
}

function parseChunk(value: unknown, expected: number): CollectionPiece[] {
  const pieces = parsePieces(value);
  if (pieces.length !== expected) {
    throw new Error("Collection failed to load.");
  }
  return pieces;
}

function parsePieces(value: unknown): CollectionPiece[] {
  if (!Array.isArray(value)) {
    throw new Error("Collection failed to load.");
  }
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const piece = item as { name?: unknown; src?: unknown };
    if (typeof piece.src !== "string" || !piece.src.startsWith("https://")) {
      return [];
    }
    const name = typeof piece.name === "string" && piece.name.trim() ? piece.name.trim() : "Untitled";
    return [{ name, src: piece.src }];
  });
}
