/**
 * Gallery ids that open the collection lens. Kept separate so the home
 * page can recognize those tiles without loading the viewer.
 */

export const COLLECTION_IDS = ["chia-friends", "trashformers", "batgan", "intermission-illustrations"] as const;

export type CollectionId = (typeof COLLECTION_IDS)[number];

export function collectionForGallery(id: string | undefined): CollectionId | null {
  switch (id) {
    case "chia-friends":
    case "trashformers":
    case "batgan":
    case "intermission-illustrations":
      return id;
    default:
      return null;
  }
}
