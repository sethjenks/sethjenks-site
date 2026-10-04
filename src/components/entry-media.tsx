import Image from "next/image";
import type { EntryMedia, MediaType } from "@/lib/entries";

import { EntryPlateFigure } from "@/components/entry-plate";

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
        <figure className="aluminum-frame overflow-hidden">
          <div className="relative aspect-[2/1] w-full">
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
        <figure className="aluminum-frame overflow-hidden">
          <video
            src={media.src}
            controls
            playsInline
            preload="metadata"
            aria-label={alt || undefined}
            className="aspect-[2/1] w-full object-cover"
          />
        </figure>
      );
    case "plate":
      return <EntryPlateFigure media={media} priority={priority} />;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled media type: ${_exhaustive}`);
    }
  }
}
