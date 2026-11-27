"use client";

import { useLayoutEffect, useState } from "react";

import type { PresentationProject } from "@/components/board/presentations/types";
import { projectIntroFrom, type ProjectIntro } from "@/lib/project-intro";

export function CaseStudyIntro({ project }: { project: PresentationProject }) {
  const intro = projectIntroFrom(project);
  if (!intro) {
    return null;
  }

  return <CaseStudyIntroBody intro={intro} />;
}

function CaseStudyIntroBody({ intro }: { intro: ProjectIntro }) {
  const facts = [
    intro.problem ? { label: "Problem", text: intro.problem } : null,
    intro.role ? { label: "Role", text: intro.role } : null,
    intro.outcome ? { label: "Outcome", text: intro.outcome } : null,
  ].filter((fact): fact is { label: string; text: string } => fact !== null);

  return (
    <div className="case-intro">
      {intro.summary ? <p className="case-intro-summary">{intro.summary}</p> : null}
      {facts.length > 0 ? (
        <dl className="case-intro-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {intro.metrics && intro.metrics.length > 0 ? (
        <ul className="case-intro-metrics">
          {intro.metrics.map((metric) => (
            <li key={metric}>{metric}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function useCaseIntroOffset(active: boolean, node: HTMLElement | null) {
  const [measured, setMeasured] = useState(0);

  useLayoutEffect(() => {
    if (!active || !node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize[0]?.blockSize;
      const next = Math.ceil(box ?? node.getBoundingClientRect().height);
      setMeasured((current) => (current === next ? current : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, node]);

  return active ? measured : 0;
}
