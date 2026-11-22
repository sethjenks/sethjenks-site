"use client";

import { CollapseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

export const CARD_OPEN_HEADER = 96;

export function CardOpenHeader({
  title,
  chips,
  href,
  onCollapse,
}: {
  title: string;
  chips: readonly string[];
  href?: string;
  onCollapse: () => void;
}) {
  return (
    <div className="card-open-header" data-card-header="" onClick={(event) => event.stopPropagation()}>
      <div className="card-open-header-lead">
        {href ? (
          <Link href={href} className="card-open-header-title">
            {title}
          </Link>
        ) : (
          <h2 className="card-open-header-title">{title}</h2>
        )}
        {chips.length > 0 ? (
          <div className="card-open-header-chips">
            {chips.map((chip) => (
              <span className="card-open-header-chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="card-open-header-collapse"
        aria-label="Collapse"
        onClick={(event) => {
          event.stopPropagation();
          onCollapse();
        }}
      >
        <HugeiconsIcon icon={CollapseIcon} size={24} strokeWidth={2} color="currentColor" />
      </button>
    </div>
  );
}
