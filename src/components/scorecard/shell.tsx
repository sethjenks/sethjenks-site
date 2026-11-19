import type { ReactNode } from "react";
import {
  GovernanceIcon,
  HomeIcon,
  MoreIcon,
  ReportsIcon,
  SavedIcon,
  SettingsIcon,
  ToolsIcon,
} from "./icons";

const RAIL = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "reports", label: "Reports", icon: ReportsIcon },
  { id: "tools", label: "Tools", icon: ToolsIcon },
  { id: "governance", label: "Governance", icon: GovernanceIcon },
  { id: "saved", label: "Saved", icon: SavedIcon },
  { id: "more", label: "More", icon: MoreIcon },
] as const;

export type RailId = (typeof RAIL)[number]["id"];

export function ScorecardShell({
  section,
  current,
  rail,
  children,
}: {
  section: string;
  current: string;
  rail: RailId;
  children: ReactNode;
}) {
  return (
    <div className="sc">
      <aside className="sc-rail" aria-label="Workspaces">
        <div className="sc-mark" />
        <nav className="sc-rail-nav">
          {RAIL.map((item) => {
            const ItemIcon = item.icon;
            return (
              <a
                key={item.id}
                className="sc-rail-item"
                href="#top"
                aria-current={item.id === rail ? "page" : undefined}
              >
                <span className="sc-rail-icon">
                  <ItemIcon />
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <a className="sc-rail-item" href="#top" aria-label="Settings">
          <span className="sc-rail-icon">
            <SettingsIcon />
          </span>
        </a>
      </aside>
      <nav className="sc-side" aria-label="Section">
        <div className="sc-section">{section}</div>
        <div className="sc-group">
          <span>Dashboards</span>
          <span className="sc-chevron" aria-hidden="true">
            ⌃
          </span>
        </div>
        <a className="sc-nav-item" href="#top" aria-current="page">
          {current}
        </a>
        <div className="sc-group" data-collapsed="">
          <span>My Organization</span>
          <span className="sc-chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
      </nav>
      <div className="sc-main">
        <header className="sc-top">
          <div className="sc-search">
            Search
            <span className="sc-kbd">⌘K</span>
          </div>
          <div className="sc-account">
            <span className="sc-avatar">A</span>
            Alice Williamson
          </div>
        </header>
        <div className="sc-content">{children}</div>
      </div>
    </div>
  );
}
