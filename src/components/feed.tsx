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
    <article className="space-y-5">
      {entry.media ? (
        <EntryMediaFigure media={entry.media} priority={priorityMedia} />
      ) : null}
      <div className="max-w-xl space-y-3">
        <h3 className="font-heading text-3xl leading-[1.15] tracking-tight text-foreground sm:text-4xl">
          {entry.title}
        </h3>
        <p className="text-base leading-7 text-foreground/80 sm:text-lg sm:leading-8">
          {entry.summary}
        </p>
        {entry.tags && entry.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1">
            {entry.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">{tag}</Badge>
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
      <p className="text-muted-foreground">
        Nothing published yet. Add a JSON file under{" "}
        <code className="font-mono text-sm">content/entries</code> to start the
        log.
      </p>
    );
  }

  return (
    <div className="space-y-20 sm:space-y-24">
      {groups.map((group, groupIndex) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2
            id={`day-${group.date}`}
            className="mb-6 font-sans text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
          >
            {formatDayHeading(group.date)}
          </h2>
          <div className="space-y-16">
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
