import { desktopPresentation } from "@/components/board/presentations/desktop";
import { iconPresentation } from "@/components/board/presentations/icon";
import { phonePresentation } from "@/components/board/presentations/phone";
import type { PresentationKind, PresentationProject, PresentationSpec } from "@/components/board/presentations/types";
import { widgetPresentation, type WidgetOrientation } from "@/components/board/presentations/widget";

export const WIDGET_STUDIES: Record<WidgetOrientation, PresentationSpec> = {
  landscape: widgetPresentation("landscape"),
  portrait: widgetPresentation("portrait"),
};

export const STUDIES: Record<PresentationKind, PresentationSpec> = {
  phone: phonePresentation(),
  desktop: desktopPresentation(),
  widget: WIDGET_STUDIES.landscape,
  icon: iconPresentation(),
};

export function presentationFor(
  kind: PresentationKind,
  project?: PresentationProject,
): PresentationSpec {
  switch (kind) {
    case "phone":
      return project ? phonePresentation(project) : STUDIES.phone;
    case "desktop":
      return project ? { ...desktopPresentation(), project } : STUDIES.desktop;
    case "widget":
      return project ? { ...WIDGET_STUDIES.landscape, project } : STUDIES.widget;
    case "icon":
      return project ? { ...iconPresentation(), project } : STUDIES.icon;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
