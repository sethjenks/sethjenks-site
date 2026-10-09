type SizedStill = {
  width: number;
  height: number;
};

/** Portrait phone UI, about 9:16 or taller. These stay whole on a canvas. */
export function isMobileScreen(item: SizedStill): boolean {
  return item.width > 0 && item.height / item.width >= 1.75;
}
