/**
 * The work grid's NFT collections. Other tiles keep the single-image lightbox.
 * Chia Friends, Trashformers, and BatGAN.
 */

export type CollectionPiece = {
  name: string;
  src: string;
};

export type CollectionManifest = {
  title: string;
  items: CollectionPiece[];
};
export const COLLECTION_IDS = ["chia-friends", "trashformers", "batgan"] as const;

export type CollectionId = (typeof COLLECTION_IDS)[number];

const MANIFESTS: Record<CollectionId, string> = {
  "chia-friends": "/collections/chia-friends.json",
  trashformers: "/collections/trashformers.json",
  batgan: "/collections/batgan.json",
};

const cache = new Map<CollectionId, Promise<CollectionManifest>>();

export function collectionForGallery(id: string | undefined): CollectionId | null {
  switch (id) {
    case "chia-friends":
    case "trashformers":
    case "batgan":
      return id;
    default:
      return null;
  }
}

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

export function loadCollection(id: CollectionId): Promise<CollectionManifest> {
  const existing = cache.get(id);
  if (existing) {
    return existing;
  }

  const pending = fetch(MANIFESTS[id])
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Collection failed to load.");
      }
      return parseManifest(await response.json());
    })
    .catch((error: unknown) => {
      if (cache.get(id) === pending) {
        cache.delete(id);
      }
      throw error;
    });

  cache.set(id, pending);
  return pending;
}

function parseManifest(value: unknown): CollectionManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error("Collection failed to load.");
  }
  const record = value as {
    title?: unknown;
    items?: unknown;
  };
  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new Error("Collection failed to load.");
  }

  const items = record.items.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const piece = item as { name?: unknown; src?: unknown };
    if (typeof piece.src !== "string" || !piece.src.startsWith("https://")) {
      return [];
    }
    const name = typeof piece.name === "string" && piece.name.trim()
      ? piece.name.trim()
      : "Untitled";
    return [{ name, src: piece.src }];
  });

  if (items.length === 0) {
    throw new Error("Collection failed to load.");
  }

  return {
    title: typeof record.title === "string" ? record.title : "Collection",
    items,
  };
}
