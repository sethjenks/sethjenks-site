import type { SyntheticEvent } from "react";

const HOVER_GROW = 2.8;
const REST_GROW = 1;
const HOVER_AMOUNT = 0.5;
const EASE_MS = 400;

export type MasonryFlexOptions = {
  tileSelector: string;
  columnSelector: string;
  /** When set, hover grow only runs if this media query matches. */
  wideQuery?: string;
  hoverGrow?: number;
  restGrow?: number;
  hoverAmount?: number;
  easeMs?: number;
};

export type MasonryFlex = {
  grow: (event: SyntheticEvent<HTMLElement>) => void;
  release: (masonry: HTMLElement | null, animate: boolean) => void;
  dispose: () => void;
};

export function createMasonryFlex(options: MasonryFlexOptions): MasonryFlex {
  const tileSelector = options.tileSelector;
  const columnSelector = options.columnSelector;
  const wideQuery = options.wideQuery;
  const hoverGrow = options.hoverGrow ?? HOVER_GROW;
  const restGrow = options.restGrow ?? REST_GROW;
  const hoverAmount = options.hoverAmount ?? HOVER_AMOUNT;
  const easeMs = options.easeMs ?? EASE_MS;

  let pendingTile: HTMLElement | null = null;
  let generation = 0;
  let releaseTimer = 0;

  const columnNodes = (masonry: HTMLElement) => [
    ...masonry.querySelectorAll<HTMLElement>(`:scope > ${columnSelector}`),
  ];

  const tilesIn = (column: HTMLElement) => [
    ...column.querySelectorAll<HTMLElement>(`:scope > ${tileSelector}`),
  ];

  const applyGrowth = (
    masonry: HTMLElement,
    columns: HTMLElement[],
    columnIndex: number,
    tile: HTMLElement,
  ) => {
    masonry.dataset.grow = String(columnIndex);

    columns.forEach((col, index) => {
      for (const child of tilesIn(col)) {
        if (index !== columnIndex) {
          child.style.flexGrow = child.dataset.restGrow ?? String(restGrow);
          continue;
        }
        const rest = Number(child.dataset.restGrow ?? restGrow);
        const target = child === tile ? hoverGrow : restGrow;
        child.style.flexGrow = String(rest + (target - rest) * hoverAmount);
      }
    });
  };

  const clearLock = (masonry: HTMLElement) => {
    delete masonry.dataset.flexing;
    delete masonry.dataset.grow;

    for (const col of masonry.querySelectorAll<HTMLElement>(columnSelector)) {
      col.style.height = "";
    }

    for (const tile of masonry.querySelectorAll<HTMLElement>(tileSelector)) {
      tile.style.flexGrow = "";
      delete tile.dataset.restGrow;
    }
  };

  const grow = (event: SyntheticEvent<HTMLElement>) => {
    const masonry = event.currentTarget;
    if (!(event.target instanceof Element)) {
      return;
    }

    const tile = event.target.closest(tileSelector);
    if (!(tile instanceof HTMLElement) || !masonry.contains(tile)) {
      return;
    }

    window.clearTimeout(releaseTimer);

    const column = tile.parentElement;
    if (!(column instanceof HTMLElement)) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = wideQuery === undefined || window.matchMedia(wideQuery).matches;
    if (!wide || reduced) {
      return;
    }

    const columns = columnNodes(masonry);
    const columnIndex = columns.indexOf(column);
    if (columnIndex < 0) {
      return;
    }

    if (masonry.dataset.flexing !== "live" && masonry.dataset.flexing !== "lock") {
      for (const col of columns) {
        col.style.height = `${col.getBoundingClientRect().height}px`;
        for (const child of tilesIn(col)) {
          const weight = String(Math.max(child.getBoundingClientRect().height, 1) / 100);
          child.dataset.restGrow = weight;
          child.style.flexGrow = weight;
        }
      }
      const nextGeneration = ++generation;
      masonry.dataset.flexing = "lock";
      pendingTile = tile;
      requestAnimationFrame(() => {
        if (nextGeneration !== generation || masonry.dataset.flexing !== "lock") {
          return;
        }
        masonry.dataset.flexing = "live";
        requestAnimationFrame(() => {
          if (nextGeneration !== generation || masonry.dataset.flexing !== "live") {
            return;
          }
          const target = pendingTile ?? tile;
          pendingTile = null;
          if (!target.isConnected) {
            return;
          }
          const nextColumn = target.parentElement;
          const nextIndex =
            nextColumn instanceof HTMLElement ? columns.indexOf(nextColumn) : columnIndex;
          applyGrowth(masonry, columns, nextIndex < 0 ? columnIndex : nextIndex, target);
        });
      });
      return;
    }

    if (masonry.dataset.flexing === "lock") {
      pendingTile = tile;
      return;
    }

    applyGrowth(masonry, columns, columnIndex, tile);
  };

  const release = (masonry: HTMLElement | null, animate: boolean) => {
    window.clearTimeout(releaseTimer);
    if (!masonry) {
      return;
    }

    generation += 1;
    pendingTile = null;
    delete masonry.dataset.grow;

    const easeBack =
      animate &&
      masonry.dataset.flexing === "live" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!easeBack) {
      clearLock(masonry);
      return;
    }

    for (const tile of masonry.querySelectorAll<HTMLElement>(tileSelector)) {
      tile.style.flexGrow = tile.dataset.restGrow ?? String(restGrow);
    }

    const nextGeneration = generation;
    releaseTimer = window.setTimeout(() => {
      if (nextGeneration !== generation) {
        return;
      }
      clearLock(masonry);
    }, easeMs + 50);
  };

  const dispose = () => {
    generation += 1;
    pendingTile = null;
    window.clearTimeout(releaseTimer);
  };

  return { grow, release, dispose };
}
