import type { CardMedia } from "@/components/board/card-media";

/** The resting / primary face on a phone or desktop card. */
export type KeyObject =
  | { type: "image"; src: string; position?: string; fit?: "cover" | "contain" }
  | {
      type: "video";
      src: string;
      poster?: string;
      play?: "auto" | "hover";
      fit?: "cover" | "contain";
    }
  | { type: "embed"; src: string; title: string };

export function keyObjectMedia(object: KeyObject): CardMedia {
  switch (object.type) {
    case "image":
      return {
        layers: [
          {
            kind: "image",
            src: object.src,
            position: object.position ?? "center top",
            fit: object.fit,
          },
        ],
      };
    case "video":
      return {
        layers: [
          ...(object.poster
            ? [{ kind: "image" as const, src: object.poster, position: "center", fit: object.fit }]
            : []),
          {
            kind: "video",
            src: object.src,
            poster: object.poster,
            playMode: object.play ?? "auto",
            fit: object.fit,
          },
        ],
      };
    case "embed":
      return {
        layers: [{ kind: "embed", src: object.src, title: object.title }],
      };
    default: {
      const unreachable: never = object;
      return unreachable;
    }
  }
}

export function keyObjectHasEmbed(object: KeyObject | undefined): boolean {
  return object?.type === "embed";
}
