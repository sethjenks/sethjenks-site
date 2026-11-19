import profileFile from "../../content/profile.json";

export type LeadershipFact = {
  value: string;
  label: string;
};

export type TimelineRole = {
  company: string;
  role: string;
  result: string;
  when?: string;
  href?: string;
};

export type Profile = {
  leadership: LeadershipFact[];
  timeline: TimelineRole[];
};

export const PROFILE = parseProfile(profileFile);

function parseProfile(value: unknown): Profile {
  if (!isRecord(value)) {
    throw new Error("content/profile.json must be an object.");
  }

  return {
    leadership: readFacts(value.leadership),
    timeline: readRoles(value.timeline),
  };
}

function readFacts(value: unknown): LeadershipFact[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("content/profile.json leadership must be a non-empty array.");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`content/profile.json leadership[${index}] must be an object.`);
    }

    return {
      value: readLine(item.value, `leadership[${index}].value`),
      label: readLine(item.label, `leadership[${index}].label`),
    };
  });
}

function readRoles(value: unknown): TimelineRole[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("content/profile.json timeline must be a non-empty array.");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`content/profile.json timeline[${index}] must be an object.`);
    }

    const when = item.when;
    if (when !== undefined && (typeof when !== "string" || when.trim().length === 0)) {
      throw new Error(`content/profile.json timeline[${index}].when must be a non-empty string.`);
    }

    const href = item.href;
    if (href !== undefined && (typeof href !== "string" || !/^https?:\/\//.test(href))) {
      throw new Error(`content/profile.json timeline[${index}].href must be an http(s) URL.`);
    }

    return {
      company: readLine(item.company, `timeline[${index}].company`),
      role: readLine(item.role, `timeline[${index}].role`),
      result: readLine(item.result, `timeline[${index}].result`),
      when: typeof when === "string" ? when.trim() : undefined,
      href,
    };
  });
}

function readLine(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`content/profile.json ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
