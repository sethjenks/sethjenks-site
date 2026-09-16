import { Badge } from "@/components/ui/badge";
import {
  formatDayHeading,
  type DayGroup,
  type Entry,
} from "@/lib/entries";

function EntryArticle({ entry }: { entry: Entry }) {
  return (
    <article className="space-y-3">
      <h3 className="font-heading text-xl leading-snug text-foreground sm:text-2xl">
        {entry.title}
      </h3>
      <p className="max-w-prose text-base leading-7 text-foreground/85 sm:text-lg sm:leading-8">
        {entry.summary}
      </p>
      {entry.tags && entry.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline">{tag}</Badge>
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
      <p className="text-muted-foreground">
        Nothing published yet. Add a JSON file under{" "}
        <code className="font-mono text-sm">content/entries</code> to start the
        feed.
      </p>
    );
  }

  return (
    <div className="space-y-14">
      {groups.map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2
            id={`day-${group.date}`}
            className="mb-6 text-sm font-medium tracking-wide text-muted-foreground uppercase"
          >
            {formatDayHeading(group.date)}
          </h2>
          <div className="space-y-10">
            {group.entries.map((entry) => (
              <EntryArticle key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
