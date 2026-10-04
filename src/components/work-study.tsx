import Image from "next/image";
import Link from "next/link";
import { heroAlt, isPhoneStill, sortWorkForDisplay, type WorkBlock, type WorkFrame, type WorkItem } from "@/lib/work";
import { normalizeTag } from "@/lib/entries";

type WorkStudyProps = {
  item: WorkItem;
  related: WorkItem[];
};

export function WorkStudy({ item, related }: WorkStudyProps) {
  const blocks = item.blocks ?? fallbackBlocks(item);
  const extraTags = (item.tags ?? []).filter(
    (tag) => normalizeTag(tag) !== item.role.toLowerCase(),
  );
  const more = nextWorks(item, related);

  return (
    <article className="study">
      <header className="study-intro">
        <h1 className="study-title">{item.title}</h1>
        <div className="study-meta">
          <nav className="study-crumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/#work">Work</Link>
              </li>
              <li aria-current="page">{item.title}</li>
            </ol>
          </nav>
          <p className="study-role">{item.role}</p>
        </div>
        <p className="study-lede">{item.summary}</p>
      </header>

      {blocks.map((block, index) => (
        <StudyBlock key={blockKey(block, index)} block={block} />
      ))}

      {extraTags.length > 0 ? (
        <ul className="study-tags">
          {extraTags.map((tag) => (
            <li key={tag}>{normalizeTag(tag)}</li>
          ))}
        </ul>
      ) : null}

      {more.length > 0 ? (
        <aside className="study-related" aria-label="More work">
          <h2>More work</h2>
          <div className="study-related-row">
            {more.map((entry) => (
              <Link key={entry.id} href={`/work/${entry.id}`}>
                <span
                  className="study-related-frame"
                  data-canvas={isPhoneStill(entry) ? "phone" : undefined}
                >
                  <Image
                    src={entry.src}
                    alt=""
                    width={entry.width}
                    height={entry.height}
                    sizes="(max-width: 900px) 46vw, 318px"
                    className="study-related-image"
                  />
                </span>
                <span className="study-related-title">{entry.title}</span>
                <span className="study-related-role">{entry.role}</span>
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}

function StudyBlock({ block }: { block: WorkBlock }) {
  switch (block.type) {
    case "statement":
      return (
        <section className="study-statement">
          <p className="study-kicker">{block.label}</p>
          <p>{block.text}</p>
        </section>
      );
    case "essay":
      return (
        <section className="study-essay">
          <h2>{block.heading}</h2>
          {block.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {block.list ? (
            <ul>
              {block.list.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </section>
      );
    case "bleed":
      return <StudyFigure frame={block.frame} bleed />;
    case "frame":
      return <StudyFigure frame={block.frame} narrow={block.narrow} />;
    case "facts":
      return (
        <dl className="study-facts">
          {block.items.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      );
    default: {
      const unknownBlock: never = block;
      return unknownBlock;
    }
  }
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
      {frame.caption ? <figcaption>{frame.caption}</figcaption> : null}
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

  return [
    hero,
    ...item.sections.map(
      (section): WorkBlock => ({
        type: "essay",
        heading: section.heading,
        body: section.body,
      }),
    ),
    {
      type: "facts",
      items: [
        { label: "Year", lines: [item.year] },
        { label: "Type", lines: [item.role] },
      ],
    },
  ];
}

function blockKey(block: WorkBlock, index: number): string {
  switch (block.type) {
    case "statement":
      return `statement-${block.label}`;
    case "essay":
      return `essay-${block.heading}`;
    case "bleed":
    case "frame":
      return `${block.type}-${block.frame.src}`;
    case "facts":
      return `facts-${index}`;
    default: {
      const unknownBlock: never = block;
      return unknownBlock;
    }
  }
}
