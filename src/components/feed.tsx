import { EntryMediaFigure } from "@/components/entry-media";
import { formatDayHeading, type DayGroup, type Entry } from "@/lib/entries";

function EntryArticle({
  entry,
  priorityMedia,
}: {
  entry: Entry;
  priorityMedia: boolean;
}) {
  return (
    <article className="py-1">
      <div className="space-y-4">
        {entry.media ? (
          <EntryMediaFigure media={entry.media} priority={priorityMedia} />
        ) : null}
        <h3 className="text-xl leading-snug tracking-tight text-ink sm:text-[1.35rem]">
          {entry.title}
        </h3>
        <p className="max-w-[65ch] text-sm leading-7 text-quiet sm:text-[0.95rem]">
          {entry.summary}
        </p>
        {entry.tags && entry.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {entry.tags.map((tag) => (
              <li
                key={tag}
                className="font-mono text-[11px] tracking-[0.08em] text-quiet"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export function Feed({ groups }: { groups: DayGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-sm leading-7 text-quiet">
        Nothing published yet. Add a JSON file under{" "}
        <code className="font-mono text-ink">content/entries</code> to start
        the log.
      </p>
    );
  }

  return (
    <div className="space-y-24">
      {groups.map((group, groupIndex) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2
            id={`day-${group.date}`}
            className={`mb-10 text-[11px] tracking-[0.16em] ${
              groupIndex === 0 ? "text-ink" : "text-quiet"
            }`}
          >
            <span className="font-pixel mr-3 tracking-[0.18em]">DAY</span>
            <span className="font-mono">{formatDayHeading(group.date)}</span>
          </h2>
          <div className="space-y-16">
            {group.entries.map((entry, entryIndex) => (
              <EntryArticle
                key={entry.id}
                entry={entry}
                priorityMedia={
                  groupIndex === 0 &&
                  entryIndex ===
                    group.entries.findIndex((item) => item.media)
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
