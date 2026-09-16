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
    <article className="space-y-4">
      {entry.media ? (
        <EntryMediaFigure media={entry.media} priority={priorityMedia} />
      ) : null}
      <h3 className="font-heading text-[1.45rem] leading-snug text-ink sm:text-[1.6rem]">
        {entry.title}
      </h3>
      <p className="text-[1.05rem] leading-7 text-quiet">{entry.summary}</p>
      {entry.tags && entry.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <li key={tag}>
              <Badge
                variant="outline"
                className="paper-label h-auto rounded-[2px] border-label-edge px-2 py-0.5 text-[11px] font-normal tracking-[0.04em] text-quiet"
              >
                {tag}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function Feed({ groups }: { groups: DayGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-quiet">
        Nothing published yet. Add a JSON file under{" "}
        <code className="font-stamp text-sm">content/entries</code> to start
        the log.
      </p>
    );
  }

  return (
    <div className="space-y-16">
      {groups.map((group, groupIndex) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2
            id={`day-${group.date}`}
            className="font-stamp mb-7 text-sm tracking-[0.14em] text-quiet"
          >
            {formatDayHeading(group.date)}
          </h2>
          <div className="space-y-12">
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
