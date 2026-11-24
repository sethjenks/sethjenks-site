import { desktopPresentation, type DesktopFrameInput } from "@/components/board/presentations/desktop";
import { iconPresentation, type IconCollectionInput } from "@/components/board/presentations/icon";
import { phonePresentation, type PhoneScreenInput } from "@/components/board/presentations/phone";
import type { PresentationKind, PresentationProject, PresentationSpec } from "@/components/board/presentations/types";
import {
  widgetOrientationFor,
  widgetPresentation,
  type WidgetInput,
  type WidgetOrientation,
} from "@/components/board/presentations/widget";

export type PresentationMedia = {
  frames?: readonly DesktopFrameInput[];
  screens?: readonly PhoneScreenInput[];
  widget?: WidgetInput;
  icon?: IconCollectionInput;
};

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
  media?: PresentationMedia,
): PresentationSpec {
  const named = project ?? STUDIES[kind].project;

  switch (kind) {
    case "phone":
      return phonePresentation(named, media?.screens);
    case "desktop":
      return desktopPresentation(named, media?.frames);
    case "widget":
      if (media?.widget) {
        return widgetPresentation(widgetOrientationFor(media.widget.frame), named, media.widget);
      }
      return project ? { ...WIDGET_STUDIES.landscape, project } : STUDIES.widget;
    case "icon":
      return media?.icon ? iconPresentation(named, media.icon) : project ? { ...iconPresentation(), project } : STUDIES.icon;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
