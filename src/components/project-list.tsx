import Link from "next/link";
import type { ProjectItem } from "@/lib/projects";

export function ProjectList({
  items,
  heading = "Projects",
}: {
  items: ProjectItem[];
  heading?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="project-list" aria-labelledby="projects-heading">
      <h2 id="projects-heading" className="work-section-title">
        {heading}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <ProjectRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectRow({ item }: { item: ProjectItem }) {
  const body = (
    <>
      <span className="project-name">{item.title}</span>
      {item.line ? <span className="project-line">{item.line}</span> : null}
    </>
  );

  if (!item.href) {
    return <p className="project-row">{body}</p>;
  }

  if (item.href.startsWith("/")) {
    return (
      <Link className="project-row" href={item.href}>
        {body}
      </Link>
    );
  }

  return (
    <a className="project-row" href={item.href} rel="noreferrer" target="_blank">
      {body}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
