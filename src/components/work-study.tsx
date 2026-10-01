import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { WorkRows } from "@/components/work-rows";
import {
  groupWorkBands,
  heroAlt,
  isDenseDesktopStill,
  isPhoneStill,
  type WorkItem,
} from "@/lib/work";
import { normalizeTag } from "@/lib/entries";

type WorkStudyProps = {
  item: WorkItem;
  related: WorkItem[];
  next: WorkItem | undefined;
};

export function WorkStudy({ item, related, next }: WorkStudyProps) {
  const alt = heroAlt(item);
  const phone = isPhoneStill(item);
  const narrow = item.width < 1280;
  const dense = isDenseDesktopStill(item);
  const extraTags = (item.tags ?? []).filter(
    (tag) => normalizeTag(tag) !== item.role.toLowerCase(),
  );

  return (
    <article className="work-study">
      <header className="work-study-intro">
        <nav className="work-study-crumb" aria-label="Breadcrumb">
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
        <h1 className="work-study-title">{item.title}</h1>
        <p className="work-study-lede">{item.summary}</p>
        <dl className="case-meta">
          <div>
            <dt>Year</dt>
            <dd>{item.year}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{item.role}</dd>
          </div>
        </dl>
      </header>

      <figure
        className={
          narrow || phone ? "work-hero work-hero-panel" : "work-hero"
        }
        data-dense={dense ? "" : undefined}
      >
        <Image
          src={item.src}
          alt={alt}
          width={item.width}
          height={item.height}
          priority
          sizes={
            dense
              ? `(max-width: 767px) min(720px, ${item.width}px), ${Math.min(item.width, 1280)}px`
              : narrow
                ? `${item.width}px`
                : `(min-width: 1280px) ${Math.min(item.width, 1280)}px, 100vw`
          }
          className="work-hero-image"
          style={{ "--still-w": `${item.width}px` } as CSSProperties}
        />
      </figure>

      <div className="work-study-sections">
        {item.sections.map((section) => (
          <section key={section.heading} className="work-study-section">
            <h2 className="work-study-heading">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="work-study-copy">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        {extraTags.length > 0 ? (
          <ul className="work-study-tags">
            {extraTags.map((tag) => (
              <li key={tag}>{normalizeTag(tag)}</li>
            ))}
          </ul>
        ) : null}
        {next ? (
          <nav className="next-case" aria-label="Next case">
            <Link href={`/work/${next.id}`}>
              <span className="next-case-label">Next case</span>
              <span className="next-case-title">{next.title}</span>
            </Link>
          </nav>
        ) : null}
      </div>

      {related.length > 0 ? (
        <aside className="work-study-related" aria-label="More work">
          <WorkRows
            id="more-work"
            heading="More work"
            bands={groupWorkBands(related)}
          />
        </aside>
      ) : null}
    </article>
  );
}
