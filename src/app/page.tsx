import { Feed } from "@/components/feed";
import { HomePlayfield } from "@/components/home-playfield";
import { LogoRows } from "@/components/logo-rows";
import { PeopleList } from "@/components/people-list";
import { ProjectList } from "@/components/project-list";
import { WorkRows } from "@/components/work-rows";
import { getEntryDayGroups } from "@/lib/entries";
import { getLogoItems, groupLogoBands } from "@/lib/logos";
import { getPeople } from "@/lib/people";
import { getProjectItems } from "@/lib/projects";
import { INTRO } from "@/lib/intro";
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
      <HomePlayfield
        name={INTRO.name}
        role={INTRO.role}
        paragraphs={INTRO.paragraphs}
        links={INTRO.links}
      />
      <WorkRows id="work" heading="Work" bands={groupWorkBands(work)} />
      <LogoRows id="logos" heading="Brands" bands={groupLogoBands(logos)} />
      <ProjectList items={projects} />
      <PeopleList items={people} />
      <main id="journal" className="log-main">
        <Feed groups={groups} />
      </main>
    </div>
  );
}
