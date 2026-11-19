import Image from "next/image";
import Link from "next/link";

import { BoardJelly } from "@/components/board-jelly";
import { BoardPortrait } from "@/components/board-portrait";
import { BoardMasonry } from "@/components/home-masonry";
import type { HomeBoard as HomeBoardData } from "@/lib/home";
import type { ProjectItem } from "@/lib/projects";

type HomeBoardProps = {
  board: HomeBoardData;
  name: string;
  headline: string;
  bio: string;
};

export function HomeBoard({ board, name, headline, bio }: HomeBoardProps) {
  return (
    <main className="home-board">
      <BoardJelly />
      <aside className="board-sidebar">
        <p className="board-name">{name}</p>
        <BoardPortrait src={board.portrait} />
        <div className="board-about">
          <p className="board-headline">{headline}</p>
          {bio ? <p className="board-bio">{bio}</p> : null}
        </div>
        <BoardProjects projects={board.projects} />
      </aside>
      <div className="home-board-main">
        <BoardMasonry columns={board.columns} />
        <div className="board-jelly-foot" aria-hidden="true" />
      </div>
    </main>
  );
}

function BoardProjects({ projects }: { projects: ProjectItem[] }) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="board-projects" aria-labelledby="board-projects">
      <h2 id="board-projects" className="board-kicker">
        Projects
      </h2>
      <ul className="board-project-list">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectLink project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectLink({ project }: { project: ProjectItem }) {
  const body = (
    <>
      {project.icon ? (
        <Image
          className="board-project-icon"
          src={project.icon}
          alt=""
          width={24}
          height={24}
        />
      ) : (
        <span className="board-project-icon" aria-hidden="true">
          {project.title.slice(0, 1)}
        </span>
      )}
      <span className="board-project-name">{project.title}</span>
    </>
  );

  if (!project.href) {
    return <div className="board-project">{body}</div>;
  }

  if (/^https?:\/\//.test(project.href)) {
    return (
      <a className="board-project" href={project.href} rel="noreferrer" target="_blank">
        {body}
        <span className="sr-only">
          {project.line ? `. ${project.line}` : ""} (opens in a new tab)
        </span>
      </a>
    );
  }

  return (
    <Link className="board-project" href={project.href}>
      {body}
      {project.line ? <span className="sr-only">. {project.line}</span> : null}
    </Link>
  );
}
