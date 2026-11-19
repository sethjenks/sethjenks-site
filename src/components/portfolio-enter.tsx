"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

const WINDOW_RADIUS = 16;
const ENTER_EASE = "power3.inOut";
const ENTER_DURATION = 0.42;
const EXIT_TITLE_EASE = "power3.in";
const EXIT_TITLE_DURATION = 0.36;
const RETURN_KEY = "portfolio-return-key";

let openedFromKey = "";

type Flight = {
  href: string;
  frame: HTMLDivElement;
  media: HTMLImageElement | null;
  shield: HTMLDivElement;
  board: HTMLElement | null;
  card: HTMLElement;
  timeline: gsap.core.Timeline;
  arrived: boolean;
  covered: boolean;
  revealed: boolean;
};

type ExitFlight = {
  href: string;
  origin: string;
  returnKey: string;
  frame: HTMLDivElement;
  shield: HTMLDivElement;
  card: HTMLElement | null;
  collapsing: boolean;
};

const PortfolioEnterContext = createContext<(event: MouseEvent<HTMLAnchorElement>, href: string) => void>(
  () => {},
);

export function usePortfolioEnter() {
  return useContext(PortfolioEnterContext);
}

export function PortfolioEnter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const flightRef = useRef<Flight | null>(null);
  const exitRef = useRef<ExitFlight | null>(null);

  useEffect(() => {
    const flight = flightRef.current;
    if (!flight || pathname !== flight.href) {
      return;
    }
    flight.arrived = true;
    if (flight.covered) {
      revealFlight(flight, flightRef);
    }
  }, [pathname]);

  useEffect(() => {
    const exit = exitRef.current;
    if (!exit || exit.collapsing || pathname !== exitPathname(exit.href)) {
      return;
    }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || exitRef.current !== exit) {
          return;
        }
        exit.collapsing = true;
        collapseExit(exit, exitRef);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    function onClick(event: globalThis.MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a.mosaic-close") : null;
      if (!(link instanceof HTMLAnchorElement) || !isPlainClick(event)) {
        return;
      }
      if (flightRef.current || exitRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const href = link.getAttribute("href") || "/";
      beginExit(link, () => router.push(href), exitRef);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    return () => {
      const flight = flightRef.current;
      if (flight) {
        flight.timeline.kill();
        clearFlight(flight);
        flightRef.current = null;
      }
      const exit = exitRef.current;
      if (exit) {
        clearExit(exit);
        exitRef.current = null;
      }
    };
  }, []);

  function enter(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (shouldLeaveToBrowser(event) || flightRef.current || exitRef.current) {
      return;
    }

    const card = event.currentTarget;
    rememberOpenedCard(card);
    const rect = card.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }

    event.preventDefault();

    const board = card.closest(".home-board");
    const still = visibleStill(card);
    const frame = document.createElement("div");
    frame.className = "portfolio-window";
    frame.style.background = still?.background ?? "#fafafa";

    let media: HTMLImageElement | null = null;
    if (still?.src && still.image) {
      const painted = paintedImageRect(still.image, rect);
      media = document.createElement("img");
      media.className = "portfolio-still";
      media.alt = "";
      media.src = still.src;
      media.style.left = `${painted.left}px`;
      media.style.top = `${painted.top}px`;
      media.style.width = `${painted.width}px`;
      media.style.height = `${painted.height}px`;
      frame.append(media);
    }

    const project = document.createElement("iframe");
    project.className = "portfolio-project";
    project.title = "";
    project.tabIndex = -1;
    project.src = href;
    project.addEventListener("load", () => {
      gsap.to(project, { opacity: 1, duration: 0.16, ease: "power2.out" });
    });
    frame.append(project);

    const shield = document.createElement("div");
    shield.className = "portfolio-shield";
    document.body.append(shield, frame);

    const top = Math.max(0, rect.top);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    const left = Math.max(0, rect.left);
    gsap.set(frame, {
      clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${WINDOW_RADIUS}px)`,
    });

    card.style.visibility = "hidden";

    const flight: Flight = {
      href,
      frame,
      media,
      shield,
      board: board instanceof HTMLElement ? board : null,
      card,
      timeline: gsap.timeline(),
      arrived: false,
      covered: false,
      revealed: false,
    };
    flightRef.current = flight;

    const timeline = gsap.timeline({
      onComplete() {
        flight.covered = true;
        if (flight.arrived) {
          revealFlight(flight, flightRef);
        }
      },
    });
    flight.timeline = timeline;
    timeline.to(
      frame,
      {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        duration: ENTER_DURATION,
        ease: ENTER_EASE,
      },
      0,
    );
    timeline.call(() => router.push(href), [], ENTER_DURATION * 0.72);
  }

  return <PortfolioEnterContext.Provider value={enter}>{children}</PortfolioEnterContext.Provider>;
}

function shouldLeaveToBrowser(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function visibleStill(card: HTMLElement) {
  const background = card.querySelector(".board-tile-bg");
  const foreground = card.querySelector(".board-tile-fg");
  const foregroundOpacity = foreground ? Number(getComputedStyle(foreground).opacity) : 0;
  const layer = foregroundOpacity > 0.5 && foreground ? foreground : background;
  const image = layer?.querySelector("img");
  const paint = layer ? getComputedStyle(layer).backgroundColor : "#fafafa";

  if (!(image instanceof HTMLImageElement) || image.currentSrc.length === 0) {
    return { src: "", image: null, background: paint };
  }

  return { src: image.currentSrc, image, background: paint };
}

function paintedImageRect(image: HTMLImageElement, container: DOMRect) {
  const naturalW = image.naturalWidth || container.width;
  const naturalH = image.naturalHeight || container.height;
  const fit = getComputedStyle(image).objectFit;
  const [posX, posY] = objectPositionAxes(getComputedStyle(image).objectPosition);
  const scale =
    fit === "contain"
      ? Math.min(container.width / naturalW, container.height / naturalH)
      : Math.max(container.width / naturalW, container.height / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;

  return {
    left: container.left + (container.width - width) * posX,
    top: container.top + (container.height - height) * posY,
    width,
    height,
  };
}

function objectPositionAxes(position: string): [number, number] {
  const parts = position.trim().split(/\s+/);
  return [objectPositionAxis(parts[0] ?? "50%"), objectPositionAxis(parts[1] ?? parts[0] ?? "50%")];
}

function objectPositionAxis(value: string) {
  if (value === "left" || value === "top") {
    return 0;
  }
  if (value === "right" || value === "bottom") {
    return 1;
  }
  if (value === "center") {
    return 0.5;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed / 100 : 0.5;
}

function revealFlight(flight: Flight, flightRef: { current: Flight | null }) {
  if (flight.revealed) {
    return;
  }
  flight.revealed = true;
  gsap.to(flight.frame, {
    opacity: 0,
    duration: 0.36,
    ease: "power2.out",
    onComplete() {
      clearFlight(flight);
      if (flightRef.current === flight) {
        flightRef.current = null;
      }
    },
  });
}

function clearFlight(flight: Flight) {
  flight.frame.remove();
  flight.shield.remove();
  flight.card.style.visibility = "";
  if (flight.board) {
    gsap.set(flight.board, { clearProps: "transform,opacity,transformOrigin" });
  }
}

function rememberOpenedCard(card: HTMLElement) {
  openedFromKey = card.dataset.portfolioKey ?? "";
  try {
    sessionStorage.setItem(RETURN_KEY, openedFromKey);
  } catch {
    // The in-memory key still covers this visit.
  }
}

function openedCardKey() {
  if (openedFromKey) {
    return openedFromKey;
  }
  try {
    return sessionStorage.getItem(RETURN_KEY) ?? "";
  } catch {
    return "";
  }
}

function isPlainClick(event: globalThis.MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function exitPathname(href: string) {
  return new URL(href, window.location.origin).pathname;
}

function beginExit(
  link: HTMLAnchorElement,
  navigate: () => void,
  exitRef: { current: ExitFlight | null },
) {
  const study = link.closest(".study");
  if (study instanceof HTMLElement) {
    study.style.pointerEvents = "none";
  }
  const bar = study?.querySelector(".mosaic-chip-bar");
  const launch = () => holdAndReturn(link, navigate, exitRef);

  if (!(bar instanceof HTMLElement)) {
    launch();
    return;
  }

  const distance = bar.getBoundingClientRect().bottom + 16;
  gsap.to(bar, {
    y: -distance,
    duration: EXIT_TITLE_DURATION,
    ease: EXIT_TITLE_EASE,
    onComplete: launch,
  });
}

function holdAndReturn(
  link: HTMLAnchorElement,
  navigate: () => void,
  exitRef: { current: ExitFlight | null },
) {
  const study = document.querySelector("main.study");
  const frame = document.createElement("div");
  frame.className = "portfolio-window";
  frame.style.background = study ? getComputedStyle(study).backgroundColor : "#fafafa";
  gsap.set(frame, { clipPath: "inset(0px 0px 0px 0px round 0px)" });

  if (study) {
    const holder = document.createElement("div");
    holder.style.transform = `translateY(${-window.scrollY}px)`;
    holder.append(study.cloneNode(true));
    frame.append(holder);
  }

  const shield = document.createElement("div");
  shield.className = "portfolio-shield";
  document.body.append(shield, frame);

  const exit: ExitFlight = {
    href: link.getAttribute("href") || "/",
    origin: window.location.pathname,
    returnKey: openedCardKey(),
    frame,
    shield,
    card: null,
    collapsing: false,
  };
  exitRef.current = exit;
  navigate();
}

function collapseExit(exit: ExitFlight, exitRef: { current: ExitFlight | null }, attempt = 0) {
  const card = findReturnCard(exit);
  if (!card && attempt < 8) {
    requestAnimationFrame(() => collapseExit(exit, exitRef, attempt + 1));
    return;
  }

  if (!card) {
    gsap.to(exit.frame, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.out",
      onComplete() {
        finishExit(exit, exitRef);
      },
    });
    return;
  }

  exit.card = card;
  card.style.visibility = "hidden";
  const rect = card.getBoundingClientRect();
  const top = Math.max(0, rect.top);
  const right = Math.max(0, window.innerWidth - rect.right);
  const bottom = Math.max(0, window.innerHeight - rect.bottom);
  const left = Math.max(0, rect.left);

  gsap.to(exit.frame, {
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${WINDOW_RADIUS}px)`,
    duration: ENTER_DURATION,
    ease: ENTER_EASE,
    onComplete() {
      card.style.visibility = "";
      gsap.to(exit.frame, {
        opacity: 0,
        duration: 0.18,
        ease: "power2.out",
        onComplete() {
          finishExit(exit, exitRef);
        },
      });
    },
  });
}

function findReturnCard(exit: ExitFlight) {
  if (exit.returnKey) {
    const keyed = document.querySelector(`[data-portfolio-key="${CSS.escape(exit.returnKey)}"]`);
    if (keyed instanceof HTMLAnchorElement && keyed.getAttribute("href") === exit.origin) {
      return keyed;
    }
  }
  const matched = document.querySelector(`a.board-card[href="${CSS.escape(exit.origin)}"]`);
  return matched instanceof HTMLElement ? matched : null;
}

function finishExit(exit: ExitFlight, exitRef: { current: ExitFlight | null }) {
  clearExit(exit);
  if (exitRef.current === exit) {
    exitRef.current = null;
  }
}

function clearExit(exit: ExitFlight) {
  exit.frame.remove();
  exit.shield.remove();
  if (exit.card) {
    exit.card.style.visibility = "";
  }
}
