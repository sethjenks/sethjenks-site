import { Badge } from "@/components/ui/badge";
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
    <article className="rounded-sm px-1 py-3 transition-colors duration-150 hover:bg-glass motion-reduce:transition-none sm:px-2">
      <div className="space-y-4">
        {entry.media ? (
          <EntryMediaFigure media={entry.media} priority={priorityMedia} />
        ) : null}
        <h3 className="text-xl leading-snug tracking-tight text-ink sm:text-[1.35rem]">
          {entry.title}
        </h3>
        <p className="text-sm leading-6 text-quiet sm:text-[0.95rem] sm:leading-7">
          {entry.summary}
        </p>
        {entry.tags && entry.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <li key={tag}>
                <Badge
                  variant="outline"
                  className="h-auto rounded-sm border-glass-border bg-glass px-2 py-0.5 font-mono text-[10px] font-normal tracking-[0.14em] text-aluminum uppercase"
                >
                  {tag}
                </Badge>
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
      <p className="text-sm text-quiet">
        Nothing published yet. Add a JSON file under{" "}
        <code className="font-mono text-aluminum">content/entries</code> to
        start the log.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => (
        <section
          key={group.date}
          aria-labelledby={`day-${group.date}`}
          className="glass-panel px-4 py-5 sm:px-5 sm:py-6"
        >
          <h2
            id={`day-${group.date}`}
            className="mb-5 font-mono text-[11px] tracking-[0.18em] text-aluminum-dim"
          >
            {formatDayHeading(group.date)}
          </h2>
          <div className="space-y-8">
            {group.entries.map((entry, entryIndex) => (
              <EntryArticle
                key={entry.id}
                entry={entry}
                priorityMedia={groupIndex === 0 && entryIndex === 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
