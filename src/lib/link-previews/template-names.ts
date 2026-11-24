import type { TemplateUses } from "./types";

export const TEMPLATE_NAMES = ["plate", "poster", "inset"] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export const DEFAULT_TEMPLATE: TemplateName = "plate";

export const TEMPLATE_USES: Record<TemplateName, TemplateUses> = {
  plate: { theme: true, image: true, color: false },
  poster: { theme: false, image: false, color: true },
  inset: { theme: true, image: true, color: false },
};

export function isTemplateName(name: string): name is TemplateName {
  return (TEMPLATE_NAMES as readonly string[]).includes(name);
}

export function templateUses(name: string): TemplateUses {
  if (isTemplateName(name)) return TEMPLATE_USES[name];
  return TEMPLATE_USES[DEFAULT_TEMPLATE];
}
