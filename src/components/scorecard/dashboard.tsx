import type { CSSProperties } from "react";
import { ScorecardShell } from "./shell";

const SCORES = [
  {
    label: "Overall Security Score",
    value: "78",
    width: "78%",
    delta: "+5% this month",
    tone: "up",
    fill: "linear-gradient(90deg, #6d28d9 0%, #d8b4fe 100%)",
  },
  {
    label: "Compliance Score",
    value: "85",
    width: "85%",
    delta: "+2% this month",
    tone: "up",
    fill: "#34d399",
  },
  {
    label: "Risk Score",
    value: "42",
    width: "42%",
    delta: "-8% this month",
    tone: "down",
    fill: "#f87171",
  },
] as const;

const ISSUES = [
  {
    title: "Top New Issues",
    rows: [
      { name: "SSL Certificate Expiring Soon", meta: "api.example.com", level: "high", label: "High" },
      { name: "Open Port on Production Server", meta: "prod-db-01", level: "critical", label: "Critical" },
    ],
  },
  {
    title: "Uncategorized Issues",
    rows: [
      { name: "Unusual Network Traffic", meta: "firewall-01", level: "medium", label: "Medium" },
      { name: "New Subdomain Discovered", meta: "test.example.com", level: "low", label: "Low" },
    ],
  },
] as const;

export function Dashboard() {
  return (
    <ScorecardShell section="Self-monitoring" current="Home dashboard" rail="home">
      <header>
        <h1 className="sc-title">Dashboard</h1>
        <p className="sc-subtitle">Welcome back! Here&apos;s your security overview</p>
      </header>
      <section className="sc-scores" aria-label="Scores">
        {SCORES.map((score) => (
          <article key={score.label} className="sc-score">
            <div className="sc-score-label">{score.label}</div>
            <div className="sc-score-value">
              <strong>{score.value}</strong>
              <span className="sc-score-of">/ 100</span>
            </div>
            <div className="sc-track">
              <span
                style={{ "--bar": score.width, "--fill": score.fill } as CSSProperties}
              />
            </div>
            <p className="sc-delta" data-tone={score.tone}>
              {score.delta}
            </p>
          </article>
        ))}
      </section>
      <section className="sc-panel" aria-label="Getting started">
        <div className="sc-panel-head">
          <strong>Getting Started</strong>
          <span>0 / 4 completed</span>
        </div>
        <div className="sc-check">
          Claim Your Organization
          <button className="sc-start" type="button">
            Start
          </button>
        </div>
        <div className="sc-check">
          Complete Digital Footprint Assessment
          <button className="sc-start" type="button">
            Start
          </button>
        </div>
      </section>
      <section className="sc-split" aria-label="Findings">
        {ISSUES.map((group) => (
          <article key={group.title} className="sc-card">
            <h2>{group.title}</h2>
            {group.rows.map((row) => (
              <div key={row.name} className="sc-issue">
                <div>
                  <strong>{row.name}</strong>
                  <span className="sc-issue-meta">{row.meta}</span>
                </div>
                <span className="sc-severity" data-level={row.level}>
                  {row.label}
                </span>
              </div>
            ))}
          </article>
        ))}
      </section>
    </ScorecardShell>
  );
}
