import { Feed } from "@/components/feed";
import { getEntryDayGroups } from "@/lib/entries";

export default async function Home() {
  const groups = await getEntryDayGroups();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto w-full max-w-4xl px-6 py-14 sm:px-8 sm:py-20">
          <p className="font-sans text-xs tracking-[0.22em] text-muted-foreground uppercase">
            Denver · Visual log
          </p>
          <h1 className="font-heading mt-4 text-5xl leading-none tracking-tight text-foreground sm:text-7xl">
            Seth Jenks
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
            A chronological record of what I am looking at — work, studio, and
            the rest of the week. Dated in America/Denver.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <Feed groups={groups} />
      </main>
      <footer className="mt-auto border-t border-border/60">
        <p className="mx-auto w-full max-w-4xl px-6 py-8 font-sans text-sm leading-6 text-muted-foreground sm:px-8">
          sethjenks.com is the intended production domain. DNS is deferred for
          this milestone.
        </p>
      </footer>
    </div>
  );
}
