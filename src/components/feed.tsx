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
}: {
  entry: Entry;
  priorityMedia: boolean;
}) {
  return (
    <article id={entry.id} className="log-entry">
      <div className="log-entry-stack">
        {entry.media ? (
          <EntryMediaFigure media={entry.media} priority={priorityMedia} />
        ) : null}
        <h3 className="log-title">
          <Link href={`/log/${entry.date}#${entry.id}`}>{entry.title}</Link>
        </h3>
        <p className="log-summary">{entry.summary}</p>
        {entry.tags && entry.tags.length > 0 ? (
          <ul className="log-tags">
            {entry.tags.map((tag) => {
              const label = normalizeTag(tag);
              return (
                <li key={label}>
                  <Link href={`/log?tag=${encodeURIComponent(label)}`}>{label}</Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export function Feed({
  groups,
  empty = "No notes in the log yet.",
}: {
  groups: DayGroup[];
  empty?: string;
}) {
  if (groups.length === 0) {
    return <p className="log-summary">{empty}</p>;
  }

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
            <h2 id={`day-${group.date}`} className="day-stamp">
              <Link href={`/log/${group.date}`} className="day-link">
                <time
                  dateTime={group.date}
                  className={groupIndex === 0 ? "is-newest" : undefined}
                >
                  {formatDayHeading(group.date)}
                </time>
              </Link>
            </h2>
          </div>
          <div className="day-entries">
            {group.entries.map((entry, entryIndex) => (
              <EntryArticle
                key={entry.id}
                entry={entry}
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
