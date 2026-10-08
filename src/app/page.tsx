import { Feed } from "@/components/feed";
import { HomePlayfield } from "@/components/home-playfield";
import { LogoRows } from "@/components/logo-rows";
import { ProjectList } from "@/components/project-list";
import { WorkRows } from "@/components/work-rows";
import { getEntryDayGroups } from "@/lib/entries";
import { getLogoItems, sortLogoItems } from "@/lib/logos";
import { getProjectItems } from "@/lib/projects";
import { INTRO } from "@/lib/intro";
import { getWorkItems, sortWorkForDisplay } from "@/lib/work";

export default async function Home() {
  const [groups, work, logos, projects] = await Promise.all([
    getEntryDayGroups(),
    getWorkItems(),
    getLogoItems(),
    getProjectItems(),
  ]);

  return (
    <div className="home-page flex min-w-0 flex-1 flex-col">
      <HomePlayfield
        name={INTRO.name}
        role={INTRO.role}
        paragraphs={INTRO.paragraphs}
        links={INTRO.links}
      />
      <WorkRows id="work" heading="Work" items={sortWorkForDisplay(work)} />
      <LogoRows id="logos" heading="Brands" items={sortLogoItems(logos)} />
      <ProjectList items={projects} />
      <main id="journal" className="log-main">
        <Feed groups={groups} />
      </main>
    </div>
  );
}
