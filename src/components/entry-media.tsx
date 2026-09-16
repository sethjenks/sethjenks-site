import Image from "next/image";
import type { EntryMedia, MediaType } from "@/lib/entries";

function mediaKind(media: EntryMedia): MediaType {
  return media.type ?? "image";
}

export function EntryMediaFigure({
  media,
  priority = false,
}: {
  media: EntryMedia;
  priority?: boolean;
}) {
  const kind = mediaKind(media);
  const alt = media.alt ?? "";
  const unoptimized = media.src.endsWith(".svg");

  switch (kind) {
    case "image":
      return (
        <figure className="photo-print">
          <div className="relative aspect-video w-full overflow-hidden rounded-[2px] bg-[#efe6d6]">
            <Image
              src={media.src}
              alt={alt}
              fill
              unoptimized={unoptimized}
              priority={priority}
              sizes="(min-width: 672px) 42rem, 100vw"
              className="object-cover"
            />
          </div>
        </figure>
      );
    case "video":
      return (
        <figure className="photo-print">
          <video
            src={media.src}
            controls
            playsInline
            preload="metadata"
            aria-label={alt || undefined}
            className="aspect-video w-full rounded-[2px] object-cover"
          />
        </figure>
      );
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled media type: ${_exhaustive}`);
    }
  }
}
