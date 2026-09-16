import { Feed } from "@/components/feed";
import { getEntryDayGroups } from "@/lib/entries";

export default async function Home() {
  const groups = await getEntryDayGroups();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
          <p className="text-sm tracking-wide text-muted-foreground">
            Denver
          </p>
          <h1 className="font-heading mt-2 text-4xl tracking-tight text-foreground sm:text-5xl">
            Seth Jenks
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-foreground/80 sm:text-lg">
            A chronological feed of notes from work and life. Short, curated,
            and dated in America/Denver.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-8 sm:py-16">
        <Feed groups={groups} />
      </main>
      <footer className="mt-auto border-t border-border/70">
        <p className="mx-auto w-full max-w-2xl px-6 py-8 text-sm leading-6 text-muted-foreground sm:px-8">
          sethjenks.com is the intended production domain. DNS is deferred for
          this milestone.
        </p>
      </footer>
    </div>
  );
}
