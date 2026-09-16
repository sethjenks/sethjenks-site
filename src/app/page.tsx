import { Feed } from "@/components/feed";
import { KeyButton } from "@/components/key-button";
import { getEntryDayGroups } from "@/lib/entries";

export default async function Home() {
  const groups = await getEntryDayGroups();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col px-6 py-16 sm:px-8 sm:py-24">
        <header className="glass-panel px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-pixel text-[10px] leading-none tracking-[0.22em] text-aluminum">
                SJ
              </p>
              <h1 className="mt-3 text-[1.75rem] leading-none tracking-tight text-ink sm:text-3xl">
                Seth Jenks
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-quiet sm:text-[0.95rem] sm:leading-7">
                A public daily log of curated agentic work — notes from Arcana,
                Philo, and the rest of the week. The interface is designed in
                code. Paper is only for optional media exports. Dated in
                America/Denver.
              </p>
            </div>
            <KeyButton href="#log">Log</KeyButton>
          </div>
        </header>
        <main id="log" className="flex-1 scroll-mt-8 pt-16 sm:pt-20">
          <Feed groups={groups} />
        </main>
        <footer className="mt-20 border-t border-aluminum-dim/60 pt-6">
          <p className="font-pixel text-[10px] tracking-[0.18em] text-aluminum-dim">
            DNS
          </p>
          <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-aluminum-dim uppercase">
            sethjenks.com planned · deferred
          </p>
        </footer>
      </div>
    </div>
  );
}
