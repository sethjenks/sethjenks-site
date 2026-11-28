import type { CardMedia } from "@/components/board/card-media";
import type { PresentationTile } from "@/components/board/presentations/types";

export type TileFaceMedia = {
  src: string;
  width: number;
  height: number;
  label: string;
  description: string;
  contain?: boolean;
  video?: {
    src: string;
    poster?: string;
    play: "auto" | "hover";
  };
  /** App-icon / HTML mark — takes over the face instead of image/video. */
  embed?: {
    src: string;
    title: string;
  };
};

export function fittedTile(
  frame: { width: number; height: number },
  aspect: number,
  id: string,
  label: string,
  description: string,
): Pick<
  PresentationTile,
  | "id"
  | "x"
  | "y"
  | "width"
  | "height"
  | "radius"
  | "resting"
  | "ring"
  | "shiftX"
  | "shiftY"
  | "aspect"
  | "label"
  | "description"
> {
  const pad = 18;
  let width = frame.width - pad * 2;
  let height = width / aspect;
  const maxHeight = frame.height - pad * 2;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return {
    id,
    x: (frame.width - width) / 2,
    y: (frame.height - height) / 2,
    width,
    height,
    radius: 32,
    resting: true,
    ring: 0,
    shiftX: 0,
    shiftY: 0,
    aspect,
    label,
    description,
  };
}

export function faceMedia(face: TileFaceMedia): CardMedia {
  if (face.embed) {
    return { layers: [{ kind: "embed", src: face.embed.src, title: face.embed.title }] };
  }

  const fit = face.contain ? "contain" : "cover";
  if (!face.video) {
    return { layers: [{ kind: "image", src: face.src, alt: face.description, position: "center", fit }] };
  }

  return {
    layers: [
      { kind: "image", src: face.src, alt: face.description, position: "center", fit },
      {
        kind: "video",
        src: face.video.src,
        poster: face.video.poster ?? face.src,
        playMode: face.video.play,
        fit,
      },
    ],
  };
}
