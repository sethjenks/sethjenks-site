"use client";

import { useLayoutEffect } from "react";

export function BoardRailMetrics() {
  useLayoutEffect(() => {
    const board = document.querySelector(".home-board");
    if (!(board instanceof HTMLElement)) {
      return;
    }

    const measure = () => {
      const sidebar = board.querySelector(".board-sidebar");
      const name = board.querySelector(".board-name");
      const about = board.querySelector(".board-about");
      const filters = board.querySelector(".board-filters");
      const projects = board.querySelector(".board-projects");
      if (
        !(sidebar instanceof HTMLElement) ||
        !(name instanceof HTMLElement) ||
        !(about instanceof HTMLElement) ||
        !(filters instanceof HTMLElement)
      ) {
        return;
      }

      const nameHeight = name.scrollHeight;
      const aboutHeight = about.scrollHeight;
      const projectsHeight = projects instanceof HTMLElement ? projects.scrollHeight : 0;
      if (nameHeight > 0) board.style.setProperty("--name-h", `${nameHeight}px`);
      if (aboutHeight > 0) board.style.setProperty("--about-h", `${aboutHeight}px`);
      if (projectsHeight > 0) board.style.setProperty("--projects-h", `${projectsHeight}px`);

      const boardStyles = getComputedStyle(board);
      const readLength = (styles: CSSStyleDeclaration, name: string, fallback: number) => {
        const value = Number.parseFloat(styles.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      const portrait = readLength(boardStyles, "--portrait-dock", 64);
      const buttons = [...board.querySelectorAll(".board-rail-filter")];
      let hug = portrait;
      for (const button of buttons) {
        if (!(button instanceof HTMLElement)) continue;
        hug = Math.max(hug, button.offsetWidth);
      }
      board.style.setProperty("--rail-hug", `${Math.ceil(hug)}px`);
    };

    const syncRailFilters = () => {
      const buttons = [...board.querySelectorAll(".board-rail-filter")];
      for (const button of buttons) {
        if (!(button instanceof HTMLButtonElement)) continue;
        const opacity = Number.parseFloat(getComputedStyle(button).opacity) || 0;
        const ready = opacity > 0.85;
        button.inert = !ready;
        button.style.pointerEvents = ready ? "auto" : "none";
      }
    };

    measure();
    syncRailFilters();
    document.fonts.ready.then(measure).catch(() => undefined);
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncRailFilters);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
