import { Feed } from "@/components/feed";
import { LogoRows } from "@/components/logo-rows";
import { PeopleList } from "@/components/people-list";
import { ProjectList } from "@/components/project-list";
import { WorkRows } from "@/components/work-rows";
import { getEntryDayGroups } from "@/lib/entries";
import { getLogoItems, groupLogoBands } from "@/lib/logos";
import { getPeople } from "@/lib/people";
import { getProjectItems } from "@/lib/projects";
import { INTRO_COPY, ROLE_LINE } from "@/lib/site";
import { getWorkItems, groupWorkBands } from "@/lib/work";

export default async function Home() {
  const [groups, work, logos, projects, people] = await Promise.all([
    getEntryDayGroups(),
    getWorkItems(),
    getLogoItems(),
    getProjectItems(),
    getPeople(),
  ]);

  return (
    <div className="home-page flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[42rem] px-6 pt-8 sm:px-8 sm:pt-10">
        <p className="role-line">{ROLE_LINE}</p>
        <p className="intro-copy">{INTRO_COPY}</p>
      </div>
      <WorkRows id="work" heading="Work" bands={groupWorkBands(work)} />
      <LogoRows id="logos" heading="Logos" bands={groupLogoBands(logos)} />
      <ProjectList items={projects} />
      <PeopleList items={people} />
      <main id="log" className="log-main">
        <Feed groups={groups} />
      </main>
    </div>
  );
}
