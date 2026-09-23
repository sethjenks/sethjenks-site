import Image from "next/image";
import Link from "next/link";
import { KeyButton } from "@/components/key-button";
import { WorkCarousel } from "@/components/work-carousel";
import type { WorkItem } from "@/lib/work";

type WorkStudyProps = {
  item: WorkItem;
  related: WorkItem[];
};

export function WorkStudy({ item, related }: WorkStudyProps) {
  return (
    <div className="work-study">
      <header className="work-study-bar">
        <p className="font-mono text-[11px] tracking-[0.14em] text-quiet">
          <Link href="/" className="text-quiet">
            Seth Jenks
          </Link>
        </p>
        <KeyButton href="/#log">Log</KeyButton>
      </header>

      <main>
        <div className="work-study-intro">
          <div className="work-study-crumb">
            <p className="font-mono text-[11px] tracking-[0.14em] text-quiet">
              <Link href="/" className="text-quiet">
                Home
              </Link>
              {" / "}
              <Link href="/#work" className="text-quiet">
                Work
              </Link>
              {" / "}
              {item.title}
            </p>
            <p className="font-mono text-[11px] tracking-[0.14em] text-quiet">
              #{item.role}
            </p>
          </div>
          <h1 className="work-study-title">{item.title}</h1>
          <p className="work-study-lede">{item.summary}</p>
        </div>

        <figure className="work-study-frame aluminum-frame">
          <Image
            src={item.src}
            alt={item.title}
            width={item.width}
            height={item.height}
            priority
            sizes="(min-width: 1280px) 80rem, 100vw"
            className="work-study-frame-image"
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
          {item.tags && item.tags.length > 0 ? (
            <ul className="work-study-tags">
              {item.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          <p className="work-study-meta">
            {item.year} · {item.role}
          </p>
        </div>
      </main>

      {related.length > 0 ? (
        <aside className="work-study-related">
          <WorkCarousel items={related} heading="More work" />
        </aside>
      ) : null}

      <footer className="work-study-footer">
        <p className="font-mono text-[11px] tracking-[0.08em] text-quiet">
          <Link href="/" className="text-quiet">
            Back to the log
          </Link>
        </p>
      </footer>
    </div>
  );
}
