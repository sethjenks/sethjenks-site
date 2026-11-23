import type { PresentationKind } from "@/components/board/presentations/types";

/**
 * How a card opens below 720px, or with a coarse pointer.
 * Add a pattern here only when ExpandLoop handles it. The switch is exhaustive.
 */
export const MOBILE_PATTERNS = ["pager"] as const;

export type MobilePattern = (typeof MOBILE_PATTERNS)[number];

export type MobileExperience = {
  pattern: MobilePattern;
  /** What a phone does with this card. */
  summary: string;
  /** Rules the open surface keeps. Shared chrome is repeated so a kind can be read alone. */
  rules: readonly string[];
};

const CARD_CHROME = [
  "The open surface uses the card field #ededed and the card ink #111.",
  "Close with the card collapse control. The tap area is at least 44px and sits inside the top safe area.",
  "The position counter uses the card chip. Captions use the card's type sizes.",
  "Opening pushes one history entry. Back closes the surface and stays on the page.",
  "prefers-reduced-motion skips the fade. The surface does not animate width or height.",
  "A fine pointer at 720px or wider keeps that card's desktop stage.",
] as const;

/**
 * Every presentation kind has a mobile experience.
 * Adding a kind to PRESENTATION_KINDS without an entry here fails the typecheck.
 */
export const MOBILE_EXPERIENCES = {
  phone: {
    pattern: "pager",
    summary: "One phone screen per view. Swipe sideways. The next and previous screens peek.",
    rules: [
      ...CARD_CHROME,
      "The frame keeps the board phone radius and the phone screen aspect, 390 by 852.",
      "The current screen and its neighbors load. The rest stay lazy.",
    ],
  },
  desktop: {
    pattern: "pager",
    summary: "One workspace frame per view, at that frame's own aspect, on the same card field.",
    rules: [
      ...CARD_CHROME,
      "Each frame uses its own aspect. A wide window stays wide. It is not forced into a phone ratio.",
      "The current frame and its neighbors load. The rest stay lazy.",
    ],
  },
  widget: {
    pattern: "pager",
    summary: "One widget per view, at the widget's landscape or portrait aspect.",
    rules: [
      ...CARD_CHROME,
      "A widget with no screenshot is the card surface at that aspect, with its caption underneath.",
    ],
  },
  icon: {
    pattern: "pager",
    summary: "One app icon per view, large enough to read the mark, with its caption underneath.",
    rules: [
      ...CARD_CHROME,
      "The grid opens as the pager. Lens and dock stay on the fine-pointer stage.",
    ],
  },
} as const satisfies Record<PresentationKind, MobileExperience>;

export function mobileExperience(kind: PresentationKind): MobileExperience {
  return MOBILE_EXPERIENCES[kind];
}
