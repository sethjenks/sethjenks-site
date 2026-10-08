type SizedStill = {
  width: number;
  height: number;
};

/** Portrait phone UI, about 9:16 or taller. These stay whole on a canvas. */
export function isMobileScreen(item: SizedStill): boolean {
  return item.width > 0 && item.height / item.width >= 1.75;
}

export function yearSpan(years: readonly string[]): string {
  const parsed = years
    .map((year) => {
      const match = year.match(/\d{4}/);
      return match ? Number(match[0]) : Number.NaN;
    })
    .filter((year) => Number.isFinite(year));

  if (parsed.length === 0) {
    return "";
  }

  const newest = Math.max(...parsed);
  const oldest = Math.min(...parsed);
  return oldest === newest ? String(newest) : `${oldest}–${newest}`;
}
