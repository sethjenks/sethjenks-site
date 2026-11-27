import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { heroAlt, isPhoneStill, sortWorkForDisplay, type WorkBlock, type WorkFrame, type WorkItem, type WorkPlate } from "@/lib/work";

type WorkStudyProps = {
  item: WorkItem;
  related: WorkItem[];
};

export function WorkStudy({ item, related }: WorkStudyProps) {
  const blocks = item.blocks ?? fallbackBlocks(item);
  const more = nextWorks(item, related);
  const opened = item.plates !== undefined && item.plates.length > 0;

  return (
    <main className={opened ? "study study-opened" : "study"}>
      {opened ? <StudyMosaic item={item} /> : <StudyBar item={item} />}
      {opened ? null : (
      <header className="study-intro">
        <h1 className="study-title">{item.title}</h1>
        <div className="study-meta">
          <p className="study-role">{item.role}</p>
        </div>
      </header>
      )}

      {opened ? null : <StudyScreens blocks={blocks} />}
      <div className={opened ? "study-rest" : undefined}>
      {more.length > 0 ? (
        <aside className="study-related" aria-label="More work">
          <h2>More work</h2>
          <div className="study-related-row">
            {more.map((entry) => (
              <Link
                key={entry.id}
                href={`/work/${entry.id}`}
                aria-label={`${entry.title}, ${entry.role}`}
              >
                <span
                  className="study-related-frame"
                  data-canvas={isPhoneStill(entry) ? "phone" : undefined}
                >
                  <Image
                    src={entry.src}
                    alt={entry.alt ?? entry.title}
                    width={entry.width}
                    height={entry.height}
                    sizes="(max-width: 900px) 46vw, 318px"
                    className="study-related-image"
                  />
                </span>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
      </div>
    </main>
  );
}

function StudyBar({
  item,
  overlay = false,
}: {
  item: WorkItem;
  overlay?: boolean;
}) {
  const title = item.title.replace(/^Chia\s+/, "");
  const tags = item.tags ?? [];

  return (
    <div className={overlay ? "mosaic-chip" : "study-bar"}>
      <div className="mosaic-chip-bar">
        <span className="mosaic-chip-title">{title}</span>
        <span className="mosaic-chip-year">{item.year}</span>
        {tags.length > 0 ? (
          <span className="mosaic-chip-tags">
            {tags.map((tag, index) => (
              <Fragment key={tag}>
                {index > 0 ? <span aria-hidden="true" /> : null}
                <span>{tag}</span>
              </Fragment>
            ))}
          </span>
        ) : null}
        <Link className="mosaic-close" href="/" aria-label="Close">
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={16}
            strokeWidth={1.5}
            color="currentColor"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}

function StudyMosaic({ item }: { item: WorkItem }) {
  const plates = item.plates ?? [];
  const heading = item.sections[0]?.heading ?? item.title;
  const headline = /[.!?]$/.test(heading) ? heading : `${heading}.`;
  const meta = [item.tags?.[0], item.year].filter((part) => part !== undefined).join(", ");

  return (
    <div className="study-mosaic">
      <StudyBar item={item} overlay />
      <div className="study-scroll">
        <section className="mosaic-statement">
          <h1>{headline}</h1>
          <div className="mosaic-statement-copy">
            <p className="mosaic-summary">{item.summary}</p>
            {meta ? <p className="mosaic-meta">{meta}</p> : null}
          </div>
        </section>
        {plates.map((plate) => (
          <MosaicPlate key={`${plate.label}-${plate.src}`} plate={plate} />
        ))}
      </div>
    </div>
  );
}

function MosaicPlate({ plate }: { plate: WorkPlate }) {
  return (
    <figure className="study-scroll-plate">
      <Image
        src={plate.src}
        alt={plate.alt}
        width={plate.width}
        height={plate.height}
        sizes="(max-width: 720px) 100vw, 1280px"
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption className="mosaic-plate-label">{plate.label}</figcaption>
    </figure>
  );
}

function StudyScreens({ blocks }: { blocks: WorkBlock[] }) {
  const frames = blocks.filter(
    (block): block is Extract<WorkBlock, { type: "bleed" | "frame" }> =>
      block.type === "bleed" || block.type === "frame",
  );

  if (frames.length === 0) {
    return null;
  }

  return (
    <div className="study-screens">
      {frames.map((block) => (
        <StudyFigure
          key={block.frame.src}
          frame={block.frame}
          narrow={block.type === "frame" ? block.narrow : false}
        />
      ))}
    </div>
  );
}

function StudyFigure({
  frame,
  bleed = false,
  narrow = false,
}: {
  frame: WorkFrame;
  bleed?: boolean;
  narrow?: boolean;
}) {
  const className = bleed
    ? "study-bleed"
    : narrow
      ? "study-frame study-frame-narrow"
      : "study-frame";

  return (
    <figure className={className}>
      <div className="study-still">
        <Image
          src={frame.src}
          alt={frame.alt}
          width={frame.width}
          height={frame.height}
          sizes={
            narrow
              ? "(max-width: 767px) 100vw, 720px"
              : bleed
                ? "100vw"
                : "(max-width: 1400px) 100vw, 1344px"
          }
          className="study-image"
        />
      </div>
    </figure>
  );
}

function nextWorks(item: WorkItem, related: WorkItem[]): WorkItem[] {
  const ordered = sortWorkForDisplay([item, ...related]);
  const index = ordered.findIndex((entry) => entry.id === item.id);

  if (index === -1 || ordered.length < 2) {
    return [];
  }

  const count = Math.min(4, ordered.length - 1);
  return Array.from({ length: count }, (_, offset) => {
    return ordered[(index + offset + 1) % ordered.length];
  });
}

function fallbackBlocks(item: WorkItem): WorkBlock[] {
  const frame: WorkFrame = {
    src: item.src,
    width: item.width,
    height: item.height,
    alt: heroAlt(item),
  };
  const ratio = item.width / item.height;
  const hero: WorkBlock =
    isPhoneStill(item) || ratio < 1.2
      ? { type: "frame", frame, narrow: isPhoneStill(item) || ratio < 0.9 }
      : { type: "bleed", frame };

  return [hero];
}
