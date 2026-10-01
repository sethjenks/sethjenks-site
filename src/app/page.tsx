import { Feed } from "@/components/feed";
import { WorkRows } from "@/components/work-rows";
import { getEntryDayGroups } from "@/lib/entries";
import { INTRO_COPY, ROLE_LINE } from "@/lib/site";
import { getWorkItems, groupWorkBands } from "@/lib/work";

export default async function Home() {
  const [groups, work] = await Promise.all([
    getEntryDayGroups(),
    getWorkItems(),
  ]);

  return (
    <div className="home-page flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[42rem] px-6 pt-8 sm:px-8 sm:pt-10">
        <p className="role-line">{ROLE_LINE}</p>
        <p className="intro-copy">{INTRO_COPY}</p>
      </div>
      <WorkRows id="work" heading="Work" bands={groupWorkBands(work)} />
      <main id="log" className="log-main">
        <Feed groups={groups} />
      </main>
    </div>
  );
}
