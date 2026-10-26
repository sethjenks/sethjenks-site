import { HomePlayfield } from "@/components/home-playfield";
import { LogoRows } from "@/components/logo-rows";
import { MessageBoardSlot } from "@/components/message-board-slot";
import { ProjectList } from "@/components/project-list";
import { Testimonials } from "@/components/testimonials";
import { WorkMasonry } from "@/components/work-masonry";
import { WorkRows } from "@/components/work-rows";
import { getGalleryItems } from "@/lib/gallery";
import { getLogoItems, sortLogoItems } from "@/lib/logos";
import { getProjectItems } from "@/lib/projects";
import { getTestimonials } from "@/lib/testimonials";
import { INTRO } from "@/lib/intro";
import { getWorkItems, sortWorkForDisplay } from "@/lib/work";

export default async function Home() {
  const [work, logos, projects, gallery, testimonials] = await Promise.all([
    getWorkItems(),
    getLogoItems(),
    getProjectItems(),
    getGalleryItems(),
    getTestimonials(),
  ]);

  return (
    <main className="home-page flex min-w-0 flex-1 flex-col">
      <HomePlayfield
        name={INTRO.name}
        role={INTRO.role}
        paragraphs={INTRO.paragraphs}
        links={INTRO.links}
      />
      <WorkRows id="work" heading="Work" items={sortWorkForDisplay(work)} />
      <LogoRows id="logos" heading="Brands" items={sortLogoItems(logos)} />
      <WorkMasonry tiles={gallery} />
      <Testimonials items={testimonials} />
      <ProjectList items={projects} />
      <MessageBoardSlot />
    </main>
  );
}
