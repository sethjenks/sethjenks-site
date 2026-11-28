/**
 * Case study copy for a project dialog.
 *
 * CONTENT-TODO: These fields stay empty until Seth writes them. The intro
 * block renders nothing while they are blank. Add an `intro` object on the
 * work or gallery item:
 *
 * { "summary": "...", "problem": "...", "role": "...", "outcome": "...", "metrics": ["..."] }
 *
 * Product projects that still need that copy:
 * - chia-signer (Chia Signer) in content/work.json
 * - chia-wallet (Chia Wallet) in content/work.json
 * - intermission-iron (Intermission Health) in content/gallery.json
 * - study-icons (Realistic Button in Paper) in content/gallery.json
 *
 * Any other work or gallery item can use the same object.
 */
export type ProjectIntro = {
  summary?: string;
  problem?: string;
  role?: string;
  outcome?: string;
  metrics?: readonly string[];
};

type IntroSource = {
  summary?: string;
  problem?: string;
  role?: string;
  outcome?: string;
  metrics?: readonly string[];
};

export function introFields(intro: ProjectIntro | undefined): ProjectIntro {
  return projectIntroFrom(intro) ?? {};
}

export function hasProjectIntro(project: IntroSource): boolean {
  return projectIntroFrom(project) !== null;
}

export function projectIntroFrom(project: IntroSource | undefined): ProjectIntro | null {
  if (!project) {
    return null;
  }

  const summary = cleanLine(project.summary);
  const problem = cleanLine(project.problem);
  const role = cleanLine(project.role);
  const outcome = cleanLine(project.outcome);
  const metrics = (project.metrics ?? []).map((metric) => metric.trim()).filter((metric) => metric.length > 0);

  if (!summary && !problem && !role && !outcome && metrics.length === 0) {
    return null;
  }

  return {
    ...(summary ? { summary } : {}),
    ...(problem ? { problem } : {}),
    ...(role ? { role } : {}),
    ...(outcome ? { outcome } : {}),
    ...(metrics.length > 0 ? { metrics } : {}),
  };
}

/**
 * Parse an optional `intro` field.
 * `undefined` means absent or empty. `null` means the value is present and invalid.
 */
export function readProjectIntro(value: unknown): ProjectIntro | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return null;
  }

  const summary = optionalLine(value.summary);
  const problem = optionalLine(value.problem);
  const role = optionalLine(value.role);
  const outcome = optionalLine(value.outcome);
  const metrics = optionalMetrics(value.metrics);

  if (summary === null || problem === null || role === null || outcome === null || metrics === null) {
    return null;
  }

  return projectIntroFrom({
    summary,
    problem,
    role,
    outcome,
    metrics,
  }) ?? undefined;
}

function optionalLine(value: unknown): string | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  return cleanLine(value);
}

function optionalMetrics(value: unknown): string[] | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const metrics: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }
    const line = item.trim();
    if (line.length > 0) {
      metrics.push(line);
    }
  }

  return metrics;
}

function cleanLine(value: string | undefined): string | undefined {
  const line = value?.trim();
  return line ? line : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
