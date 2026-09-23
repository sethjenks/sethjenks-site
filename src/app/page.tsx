import { Feed } from "@/components/feed";
import { KeyButton } from "@/components/key-button";
import { WorkCarousel } from "@/components/work-carousel";
import { getEntryDayGroups } from "@/lib/entries";
import { getWorkItems } from "@/lib/work";

export default async function Home() {
  const [groups, work] = await Promise.all([
    getEntryDayGroups(),
    getWorkItems(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[42rem] px-6 pt-20 sm:px-8 sm:pt-28">
        <header className="flex items-start justify-between gap-8">
          <div>
            <h1 className="text-[1.75rem] leading-none tracking-tight text-ink sm:text-3xl">
              Seth Jenks
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-quiet sm:text-[0.95rem] sm:leading-7">
              A public daily log of curated agentic work — notes from Arcana,
              Philo, and the rest of the week. The interface is designed in
              code. Paper is only for optional media exports. Dated in
              America/Denver.
            </p>
          </div>
          <KeyButton href="#log">Log</KeyButton>
        </header>
      </div>
      <WorkCarousel id="work" items={work} />
      <div className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col px-6 pb-20 sm:px-8 sm:pb-28">
        <main id="log" className="flex-1 scroll-mt-8 pt-20 sm:pt-28">
          <Feed groups={groups} />
        </main>
        <footer className="mt-28 border-t border-hairline pt-8">
          <p className="font-mono text-[11px] tracking-[0.08em] text-quiet">
            sethjenks.com planned · DNS deferred
          </p>
        </footer>
      </div>
    </div>
  );
}
