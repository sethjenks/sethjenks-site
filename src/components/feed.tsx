import Link from "next/link";
import { EntryMediaFigure } from "@/components/entry-media";
import {
  formatDayHeading,
  normalizeTag,
  type DayGroup,
  type Entry,
} from "@/lib/entries";

function dayOfMonth(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function EntryArticle({
  entry,
  priorityMedia,
  titleTag: Title,
}: {
  entry: Entry;
  priorityMedia: boolean;
  titleTag: "h2" | "h3";
}) {
  return (
    <article id={entry.id} className="log-entry">
      <div className="log-entry-stack">
        {entry.media ? (
          <EntryMediaFigure media={entry.media} priority={priorityMedia} />
        ) : null}
        <Title className="log-title">
          <Link href={`/journal/${entry.date}#${entry.id}`}>{entry.title}</Link>
        </Title>
        <p className="log-summary">{entry.summary}</p>
        {entry.tags && entry.tags.length > 0 ? (
          <ul className="log-tags">
            {entry.tags.map((tag) => {
              const label = normalizeTag(tag);
              return (
                <li key={label}>
                  <Link href={`/journal/tag/${encodeURIComponent(label)}`}>{label}</Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

const DEFAULT_EMPTY = {
  title: "No notes yet.",
  body: "Notes show up here as they’re written.",
};

export function Feed({
  groups,
  empty = DEFAULT_EMPTY,
  stamp = "h2",
}: {
  groups: DayGroup[];
  empty?: {
    title: string;
    body: string;
    action?: { href: string; label: string };
  };
  /** Day pages use h1 for the date so the outline does not start at h2. */
  stamp?: "h1" | "h2";
}) {
  if (groups.length === 0) {
    return (
      <div className="log-empty">
        <h2 className="log-empty-title">{empty.title}</h2>
        <p className="log-summary">{empty.body}</p>
        {empty.action ? (
          <Link className="log-empty-action" href={empty.action.href}>
            {empty.action.label}
          </Link>
        ) : null}
      </div>
    );
  }

  const Stamp = stamp === "h1" ? "h1" : "h2";

  return (
    <div className="log-days">
      {groups.map((group, groupIndex) => (
        <section
          key={group.date}
          className="day-group"
          aria-labelledby={`day-${group.date}`}
        >
          <div className="day-rail">
            <p className="day-kicker">Day</p>
            <p className="day-numeral" aria-hidden="true">
              {dayOfMonth(group.date)}
            </p>
            <Stamp id={`day-${group.date}`} className="day-stamp">
              <Link href={`/journal/${group.date}`} className="day-link">
                <time
                  dateTime={group.date}
                  className={groupIndex === 0 ? "is-newest" : undefined}
                >
                  {formatDayHeading(group.date)}
                </time>
              </Link>
            </Stamp>
          </div>
          <div className="day-entries">
            {group.entries.map((entry, entryIndex) => (
              <EntryArticle
                key={entry.id}
                entry={entry}
                titleTag={stamp === "h1" ? "h2" : "h3"}
                priorityMedia={
                  groupIndex === 0 &&
                  entryIndex === group.entries.findIndex((item) => item.media)
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
