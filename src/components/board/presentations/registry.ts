import {
  desktopPresentation,
  type DesktopFrameInput,
  type DesktopOptions,
} from "@/components/board/presentations/desktop";
import {
  iconPresentation,
  type IconCollectionInput,
  type IconSetInput,
} from "@/components/board/presentations/icon";
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
  /** Desktop open layout — 1 = stack (default), 3 = masonry columns. */
  columns?: number;
  /** masonry (default), a centered image/text split, or a full-width banner over a row. */
  layout?: DesktopOptions["layout"];
  /** Desktop closed shell size override (e.g. tall frame for a portrait fill card). */
  closed?: DesktopOptions["closed"];
  screens?: readonly PhoneScreenInput[];
  widget?: WidgetInput;
  icon?: IconCollectionInput;
  iconSet?: IconSetInput;
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
      return desktopPresentation(named, media?.frames, {
        columns: media?.columns,
        closed: media?.closed,
        layout: media?.layout,
      });
    case "widget":
      if (media?.widget) {
        return widgetPresentation(widgetOrientationFor(media.widget.frame), named, media.widget);
      }
      return project ? { ...WIDGET_STUDIES.landscape, project } : STUDIES.widget;
    case "icon":
      if (media?.icon) {
        return iconPresentation(named, media.icon);
      }
      if (media?.iconSet) {
        return iconPresentation(named, media.iconSet);
      }
      return project ? { ...iconPresentation(), project } : STUDIES.icon;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
