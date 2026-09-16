import { Feed } from "@/components/feed";
import { getEntryDayGroups } from "@/lib/entries";

export default async function Home() {
  const groups = await getEntryDayGroups();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col px-6 py-16 sm:px-8 sm:py-24">
        <header>
          <h1 className="font-heading text-[2rem] leading-none tracking-tight text-ink sm:text-[2.35rem]">
            Seth Jenks
          </h1>
          <p className="mt-5 max-w-md text-[1.05rem] leading-7 text-quiet">
            A public daily log of curated agentic work — notes from Arcana,
            Philo, and the rest of the week. The interface is designed in code.
            Paper is only for optional media exports. Dated in America/Denver.
          </p>
        </header>
        <main className="flex-1 pt-16 sm:pt-20">
          <Feed groups={groups} />
        </main>
        <footer className="mt-20 border-t border-label-edge pt-6">
          <p className="font-stamp text-xs tracking-[0.08em] text-quiet">
            sethjenks.com planned · DNS deferred
          </p>
        </footer>
      </div>
    </div>
  );
}
