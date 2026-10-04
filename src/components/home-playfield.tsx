"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  applyHeaderPlay,
  applySoftBodyHome,
  compactHeaderPlay,
  COMPACT_HEADER_PX,
  headerPlayForHeight,
  headerStageCanvas,
  HOME_EASE_IN,
  HOME_ENTER_SHIFT,
  HOME_RETURN_MS,
  pinSoftBodyRest,
  PLAY_HOME_MS,
  snapshotSoftBody,
  syncSoftBody,
} from "@/lib/header-play";
import {
  applyPlayHome,
  beginPlayHome,
  cancelPlayHome,
  createPlayBody,
  finishPlayHome,
  playTransform,
  stepPlayfield,
  syncPlayRest,
  type BustCollider,
  type PlayBody,
  type PlayBounds,
  type PlayRest,
} from "@/lib/playfield-physics";
import { scrambleText, voicePhraseAt } from "@/lib/play-voice";

const IDLE_MS = PLAY_HOME_MS;
const VOICE_HOLD_MS = 2000;
const VOICE_SCRAMBLE_S = 0.9;
const SCRAMBLE_EASE = [0.32, 0.72, 0, 1] as const;
const TEXT_MS = 0.38;
const TEXT_STAGGER_S = 0.09;
const HEAD_DELAY_S = TEXT_MS + TEXT_STAGGER_S + 0.08;
const HEAD_S = 1.15;
const ENTER_EASE = [0.32, 0.72, 0, 1] as const;

const introList = {
  hide: {},
  show: {
    transition: { staggerChildren: TEXT_STAGGER_S },
  },
};

const introPiece = {
  hide: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: TEXT_MS, ease: ENTER_EASE },
  },
};

type VoiceFlyer = {
  node: HTMLElement;
  body: PlayBody;
  fromX: number;
  fromY: number;
  fromRotate: number;
  toX: number;
  toY: number;
  fade: boolean;
};

type VoiceFlight = {
  phrase: string;
  line: HTMLElement;
  visual: HTMLElement;
  measure: HTMLElement;
  flyers: VoiceFlyer[];
};

type VoicePhase = "flight" | "hold" | "scramble";

type VoiceRun = {
  generation: number;
  flight: VoiceFlight;
  phase: VoicePhase;
  holdTimer: number;
  scramble: { stop: () => void } | null;
};

type HomePlayfieldProps = {
  role: string;
  intro: string;
};

export function HomePlayfield({ role, intro }: HomePlayfieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<PlayBody[]>([]);
  const nodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const lastMotionRef = useRef(0);
  const homingRef = useRef(false);
  const prevBustRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const reducedRef = useRef(false);
  const enteredRef = useRef(false);
  const headEnterRef = useRef<{ stop: () => void } | null>(null);
  const homeAnimRef = useRef<{ stop: () => void } | null>(null);
  const homeFromHeadRef = useRef<Float64Array | null>(null);
  const homeTRef = useRef(0);
  const voiceRef = useRef<VoiceRun | null>(null);
  const voiceActiveRef = useRef(false);
  const voiceGenRef = useRef(0);
  const phraseIndexRef = useRef(0);
  const roleRef = useRef(role);
  const prefersReduced = useReducedMotion() === true;
  roleRef.current = role;

  useLayoutEffect(() => {
    const reduced = prefersReduced;
    reducedRef.current = reduced;
    if (reduced) {
      window.__headerEnterShift = 0;
      window.__headerEntering = false;
      enteredRef.current = true;
      return;
    }

    window.__headerEnterShift = HOME_ENTER_SHIFT;
    window.__headerEntering = true;

    const root = rootRef.current;
    if (!root) {
      return;
    }

    let lastHeight = 0;
    const applyHeight = () => {
      const work = document.getElementById("work");
      const end = work ?? root.querySelector(".playfield-end");
      if (!end) {
        return 0;
      }

      const gap = work ? 8 : 0;
      const height = Math.max(
        COMPACT_HEADER_PX,
        Math.round(end.getBoundingClientRect().top + window.scrollY - gap),
      );
      const role = root.querySelector(".role-line");
      const textTop = role?.getBoundingClientRect().top ?? COMPACT_HEADER_PX + 32;
      const play = headerPlayForHeight(height, window.innerWidth, textTop);
      applyHeaderPlay(play);
      syncSoftBody(play);

      document.documentElement.dataset.playfield = "home";
      document.documentElement.style.setProperty("--playfield-height", `${height}px`);
      if (height !== lastHeight) {
        lastHeight = height;
        window.dispatchEvent(new Event("resize"));
      }
      return height;
    };

    applyHeight();

    const page = document.querySelector(".home-page");
    const work = document.getElementById("work");
    const observer = new ResizeObserver(() => {
      applyHeight();
      if (enteredRef.current && !voiceActiveRef.current) {
        collectBodies(root, bodiesRef.current, nodesRef.current);
      }
    });
    observer.observe(root);
    if (page) {
      observer.observe(page);
    }
    if (work) {
      observer.observe(work);
    }

    const onResize = () => {
      applyHeight();
      if (enteredRef.current && !voiceActiveRef.current) {
        collectBodies(root, bodiesRef.current, nodesRef.current);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.__headerEnterShift = 0;
      window.__headerEntering = false;
      const compact = compactHeaderPlay();
      applyHeaderPlay(compact);
      syncSoftBody(compact);
      delete document.documentElement.dataset.playfield;
      document.documentElement.style.removeProperty("--playfield-height");
      nodesRef.current.forEach((node) => {
        node.style.transform = "";
        delete node.dataset.loose;
      });
    };
  }, [prefersReduced]);

  useEffect(() => {
    if (reducedRef.current) {
      enteredRef.current = true;
      const root = rootRef.current;
      if (root) {
        collectBodies(root, bodiesRef.current, nodesRef.current);
      }
      return;
    }

    window.__headerEnterShift = HOME_ENTER_SHIFT;
    window.__headerEntering = true;
    const finishEnter = () => {
      window.__headerEnterShift = 0;
      window.__headerEntering = false;
      enteredRef.current = true;
      headEnterRef.current = null;
      const startSpin = (tries = 0) => {
        if (armedRef.current) {
          return;
        }
        if (window.__headerSoftBody) {
          window.__headerSoftBody.spinStart = performance.now();
          return;
        }
        if (tries < 60) {
          requestAnimationFrame(() => startSpin(tries + 1));
        }
      };
      startSpin();
      const root = rootRef.current;
      if (root) {
        collectBodies(root, bodiesRef.current, nodesRef.current);
      }
    };
    const headEnter = animate(HOME_ENTER_SHIFT, 0, {
      type: "spring",
      duration: HEAD_S,
      bounce: 0.24,
      delay: HEAD_DELAY_S,
      onUpdate(value) {
        if (armedRef.current) {
          headEnter.stop();
          finishEnter();
          return;
        }

        window.__headerEnterShift = value;
      },
      onComplete: finishEnter,
    });
    headEnterRef.current = headEnter;

    let frame = 0;
    let last = performance.now();
    let homeToken = 0;
    const button = document.querySelector<HTMLElement>("[data-play-button]");
    const drag = { active: false, id: 0, x: 0, y: 0, lastX: 0, lastY: 0 };
    let wasGrabbing = false;

    const bodiesForHome = () =>
      voiceRef.current?.phase === "flight"
        ? bodiesRef.current.filter((body) => !isRoleBody(body))
        : bodiesRef.current;

    const clearVoice = () => {
      const run = voiceRef.current;
      if (!run && !voiceActiveRef.current) {
        return;
      }

      voiceGenRef.current += 1;
      if (run) {
        window.clearTimeout(run.holdTimer);
        run.scramble?.stop();
      }
      voiceRef.current = null;
      voiceActiveRef.current = false;
      const root = rootRef.current;
      if (!root) {
        return;
      }

      releaseRoleVoice(root, roleRef.current);
      collectBodies(root, bodiesRef.current, nodesRef.current);
    };

    const stopHome = (cancelVoice = true) => {
      homeToken += 1;
      homeAnimRef.current?.stop();
      homeAnimRef.current = null;
      homeFromHeadRef.current = null;
      homeTRef.current = 0;
      homingRef.current = false;
      window.__headerHoming = false;
      window.__headerHomeT = 0;
      window.__headerHomeFrom = null;
      cancelPlayHome(bodiesRef.current);
      if (cancelVoice) {
        clearVoice();
      }
      if (window.__headerSoftBody) {
        window.__headerSoftBody.homeAt = 0;
        window.__headerSoftBody.homeFrom = null;
      }
    };

    const startScramble = (generation: number) => {
      const run = voiceRef.current;
      if (!run || run.generation !== generation) {
        return;
      }

      const copy = document.createElement("span");
      copy.className = "play-voice-copy";
      copy.textContent = run.flight.phrase;
      run.flight.measure.replaceChildren(copy);
      run.phase = "scramble";
      run.scramble = animate(0, 1, {
        duration: VOICE_SCRAMBLE_S,
        ease: SCRAMBLE_EASE,
        onUpdate(value) {
          copy.textContent = scrambleText(run.flight.phrase, roleRef.current, value);
        },
        onComplete() {
          if (voiceGenRef.current !== generation || !voiceRef.current) {
            return;
          }
          voiceRef.current.scramble = null;
          copy.textContent = roleRef.current;
          clearVoice();
        },
      });
    };

    const startHome = () => {
      if (homingRef.current || voiceActiveRef.current) {
        return;
      }

      const root = rootRef.current;
      const roleLoose = bodiesRef.current.some((body) => isRoleBody(body) && body.loose);
      if (roleLoose && root) {
        const flight = beginRoleVoice(
          root,
          voicePhraseAt(phraseIndexRef.current),
          bodiesRef.current,
          nodesRef.current,
        );
        if (flight) {
          phraseIndexRef.current += 1;
          const generation = voiceGenRef.current + 1;
          voiceGenRef.current = generation;
          voiceActiveRef.current = true;
          voiceRef.current = {
            generation,
            flight,
            phase: "flight",
            holdTimer: 0,
            scramble: null,
          };
        }
      }

      const token = ++homeToken;
      const generation = voiceRef.current?.generation ?? 0;
      const body = window.__headerSoftBody;
      homingRef.current = true;
      window.__headerHoming = true;
      homeTRef.current = 0;
      window.__headerHomeT = 0;
      beginPlayHome(bodiesRef.current);
      homeFromHeadRef.current = body ? snapshotSoftBody(body) : null;
      window.__headerHomeFrom = homeFromHeadRef.current;
      if (body) {
        body.homeAt = 0;
        body.spinStart = 0;
      }
      const homeAnim = animate(0, 1, {
        duration: HOME_RETURN_MS / 1000,
        ease: HOME_EASE_IN,
        onUpdate(value) {
          if (token !== homeToken) {
            return;
          }
          homeTRef.current = value;
          window.__headerHomeT = value;
          applyPlayHome(bodiesForHome(), value);
          const run = voiceRef.current;
          if (run?.generation === generation && run.phase === "flight") {
            paintVoiceFlight(run.flight, value);
          }
          if (body && homeFromHeadRef.current) {
            applySoftBodyHome(body, homeFromHeadRef.current, value);
          }
        },
        onComplete() {
          if (token !== homeToken) {
            return;
          }
          homeTRef.current = 1;
          const run = voiceRef.current;
          const voiced = run?.generation === generation && run.phase === "flight";
          finishPlayHome(voiced ? bodiesForHome() : bodiesRef.current);
          if (body) {
            pinSoftBodyRest(body);
            body.spinStart = performance.now();
            body.homeAt = 0;
            body.homeFrom = null;
          }
          homeFromHeadRef.current = null;
          homeAnimRef.current = null;
          homingRef.current = false;
          window.__headerHoming = false;
          window.__headerHomeT = 0;
          window.__headerHomeFrom = null;
          if (!voiced || !run) {
            return;
          }

          parkRoleLine(run, bodiesRef.current, nodesRef.current);
          run.phase = "hold";
          run.holdTimer = window.setTimeout(() => {
            startScramble(generation);
          }, VOICE_HOLD_MS);
        },
      });
      homeAnimRef.current = homeAnim;
    };

    const onButtonDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const body = bodiesRef.current.find((item) => item.kind === "button");
      if (!body) {
        return;
      }

      drag.active = true;
      drag.id = event.pointerId;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };

    const onButtonMove = (event: PointerEvent) => {
      if (!drag.active || event.pointerId !== drag.id) {
        return;
      }

      const body = bodiesRef.current.find((item) => item.kind === "button");
      const header = document.querySelector(".site-header-bar");
      if (!body || !header) {
        return;
      }

      const origin = header.getBoundingClientRect();
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8 && !body.loose) {
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        return;
      }

      body.loose = true;
      body.x = event.clientX - origin.left - body.rest.w / 2;
      body.y = event.clientY - origin.top - body.rest.h / 2;
      body.vx = (event.clientX - drag.lastX) * 45;
      body.vy = (event.clientY - drag.lastY) * 45;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      lastMotionRef.current = performance.now();
      stopHome();
      if (window.__headerSoftBody) {
        window.__headerSoftBody.homeAt = 0;
      }
    };

    const onButtonUp = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) {
        return;
      }

      drag.active = false;
      lastMotionRef.current = performance.now();
    };

    button?.addEventListener("pointerdown", onButtonDown);
    window.addEventListener("pointermove", onButtonMove);
    window.addEventListener("pointerup", onButtonUp);
    window.addEventListener("pointercancel", onButtonUp);

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (window.__headerPlay) {
        syncSoftBody(window.__headerPlay);
      }
      if (!enteredRef.current) {
        pinSoftBodyRest(window.__headerSoftBody);
      }
      const root = rootRef.current;
      if (
        root &&
        enteredRef.current &&
        !voiceActiveRef.current &&
        bodiesRef.current.length === 0
      ) {
        collectBodies(root, bodiesRef.current, nodesRef.current);
      }

      const header = document.querySelector(".site-header-bar");
      if (!header) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const headerRect = header.getBoundingClientRect();
      const bounds: PlayBounds = {
        x: 0,
        y: 0,
        w: headerRect.width,
        h: headerRect.height,
      };
      const bust = readBust(headerRect);
      if (bust) {
        prevBustRef.current = { x: bust.x, y: bust.y };
      }
      if (bust?.grabbing) {
        armedRef.current = true;
      }
      const liveBust = bust && armedRef.current ? bust : null;

      if (bust?.grabbing) {
        lastMotionRef.current = now;
        stopHome();
      } else if (wasGrabbing) {
        lastMotionRef.current = now;
        stopHome();
      }
      wasGrabbing = Boolean(bust?.grabbing);

      const idleFor = now - lastMotionRef.current;
      const anyLoose = bodiesRef.current.some((body) => body.loose);
      if (
        !homingRef.current &&
        !voiceActiveRef.current &&
        anyLoose &&
        lastMotionRef.current > 0 &&
        idleFor >= IDLE_MS
      ) {
        startHome();
      }

      const { struck } = stepPlayfield(
        bodiesRef.current,
        dt,
        bounds,
        drag.active ? null : liveBust,
        homingRef.current,
      );

      if (struck) {
        lastMotionRef.current = now;
        stopHome(voiceRef.current?.phase === "flight");
      }

      if (homingRef.current) {
        applyPlayHome(bodiesForHome(), homeTRef.current);
        const body = window.__headerSoftBody;
        if (body && homeFromHeadRef.current) {
          applySoftBodyHome(body, homeFromHeadRef.current, homeTRef.current);
        }
      } else if (window.__headerSoftBody && !bust?.grabbing) {
        if (lastMotionRef.current === 0) {
          window.__headerSoftBody.homeAt = 0;
        } else {
          window.__headerSoftBody.homeAt = lastMotionRef.current + IDLE_MS;
        }
      }

      paintBodies(bodiesRef.current, nodesRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      headEnter.stop();
      headEnterRef.current = null;
      stopHome();
      cancelAnimationFrame(frame);
      window.__headerEnterShift = 0;
      window.__headerEntering = false;
      window.__headerHoming = false;
      armedRef.current = false;
      button?.removeEventListener("pointerdown", onButtonDown);
      window.removeEventListener("pointermove", onButtonMove);
      window.removeEventListener("pointerup", onButtonUp);
      window.removeEventListener("pointercancel", onButtonUp);
    };
  }, []);

  return (
    <div ref={rootRef} className="home-playfield">
      <motion.div
        className="mx-auto w-full max-w-[42rem] px-6 pt-8 sm:px-8 sm:pt-10 home-intro"
        variants={introList}
        initial={prefersReduced ? "show" : "hide"}
        animate="show"
      >
        <PlayLine className="role-line" text={role} lineId="role" />
        <PlayLine className="intro-copy" text={intro} lineId="intro" />
      </motion.div>
      <div className="playfield-end" aria-hidden="true" />
    </div>
  );
}

function PlayLine({
  className,
  text,
  lineId,
}: {
  className: string;
  text: string;
  lineId: string;
}) {
  return (
    <motion.p className={className} variants={introPiece}>
      <span className="play-a11y">{text}</span>
      <span aria-hidden="true">
        {splitPlayTokens(text).map((token, index) => {
          if (token.kind === "space") {
            return (
              <span key={`${lineId}-s${index}`} className="play-space">
                {"\u00A0"}
              </span>
            );
          }

          return (
            <span
              key={`${lineId}-w${index}`}
              className="play-word"
              data-play-word={`${lineId}-${index}`}
            >
              {token.value}
            </span>
          );
        })}
      </span>
    </motion.p>
  );
}

type PlayToken = { kind: "space"; value: string } | { kind: "word"; value: string };

function splitPlayTokens(text: string): PlayToken[] {
  const tokens: PlayToken[] = [];
  for (const part of text.split(/(\s+)/)) {
    if (!part) {
      continue;
    }

    if (/^\s+$/.test(part)) {
      tokens.push({ kind: "space", value: part });
      continue;
    }

    tokens.push({ kind: "word", value: part });
  }

  return tokens;
}

function isRoleBody(body: PlayBody) {
  return body.id.startsWith("role-");
}

function fixedAnchor(node: HTMLElement) {
  let current = node.parentElement;
  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const anchored =
      style.transform !== "none" ||
      style.filter !== "none" ||
      style.perspective !== "none" ||
      style.willChange.split(",").some((part) => part.trim() === "transform");
    if (anchored) {
      const rect = current.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }
    current = current.parentElement;
  }

  return { left: 0, top: 0 };
}

function clearFlyerStyle(node: HTMLElement) {
  node.style.position = "";
  node.style.left = "";
  node.style.top = "";
  node.style.margin = "";
  node.style.transform = "";
  node.style.opacity = "";
  delete node.dataset.voiceFly;
}

function beginRoleVoice(
  root: HTMLElement,
  phrase: string,
  bodies: PlayBody[],
  nodes: Map<string, HTMLElement>,
): VoiceFlight | null {
  const line = root.querySelector<HTMLElement>(".role-line");
  const visual = line?.querySelector<HTMLElement>("[aria-hidden='true']");
  const header = document.querySelector(".site-header-bar");
  if (!line || !visual || !header) {
    return null;
  }

  const roleBodies = bodies
    .filter((body) => isRoleBody(body))
    .sort((a, b) => Number(a.id.slice(5)) - Number(b.id.slice(5)));
  if (roleBodies.length === 0) {
    return null;
  }

  const origin = header.getBoundingClientRect();
  const flyers: VoiceFlyer[] = [];
  line.style.minHeight = `${Math.ceil(line.getBoundingClientRect().height)}px`;

  for (const body of roleBodies) {
    const node = nodes.get(body.id);
    if (!node || !visual.contains(node)) {
      continue;
    }

    const anchor = fixedAnchor(node);
    const viewportLeft = origin.left + body.rest.x;
    const viewportTop = origin.top + body.rest.y;
    node.dataset.voiceFly = "";
    node.style.position = "fixed";
    node.style.left = `${viewportLeft - anchor.left}px`;
    node.style.top = `${viewportTop - anchor.top}px`;
    node.style.margin = "0";
    node.style.transform = `translate(${body.x - body.rest.x}px, ${body.y - body.rest.y}px) rotate(${body.rotate}deg)`;
    body.vx = 0;
    body.vy = 0;
    body.vr = 0;
    flyers.push({
      node,
      body,
      fromX: body.x - body.rest.x,
      fromY: body.y - body.rest.y,
      fromRotate: body.rotate,
      toX: 0,
      toY: 0,
      fade: false,
    });
  }

  if (flyers.length === 0) {
    line.style.minHeight = "";
    return null;
  }

  visual.querySelectorAll<HTMLElement>(":scope > .play-space").forEach((space) => {
    space.style.display = "none";
  });

  const measure = document.createElement("span");
  measure.className = "play-voice-measure";
  for (const part of phrase.split(/(\s+)/)) {
    if (!part) {
      continue;
    }

    const span = document.createElement("span");
    if (/^\s+$/.test(part)) {
      span.className = "play-space";
      span.textContent = "\u00A0";
    } else {
      span.className = "play-word";
      span.textContent = part;
    }
    measure.appendChild(span);
  }
  visual.appendChild(measure);

  const slots = [...measure.querySelectorAll<HTMLElement>(".play-word")];
  if (slots.length === 0) {
    measure.remove();
    for (const flyer of flyers) {
      clearFlyerStyle(flyer.node);
    }
    visual.querySelectorAll<HTMLElement>(":scope > .play-space").forEach((space) => {
      space.style.display = "";
    });
    line.style.minHeight = "";
    return null;
  }

  const phraseBox = measure.getBoundingClientRect();
  flyers.forEach((flyer, index) => {
    const baseLeft = origin.left + flyer.body.rest.x;
    const baseTop = origin.top + flyer.body.rest.y;
    const slot = slots[index];
    if (slot) {
      const rect = slot.getBoundingClientRect();
      flyer.toX = rect.left - baseLeft;
      flyer.toY = rect.top - baseTop;
      flyer.node.textContent = slot.textContent;
      return;
    }

    flyer.fade = true;
    flyer.toX = phraseBox.left + phraseBox.width / 2 - flyer.node.offsetWidth / 2 - baseLeft;
    flyer.toY = phraseBox.top + phraseBox.height / 2 - flyer.node.offsetHeight / 2 - baseTop;
  });

  return { phrase, line, visual, measure, flyers };
}

function paintVoiceFlight(flight: VoiceFlight, t: number) {
  const eased = Math.min(1, Math.max(0, t));
  for (const flyer of flight.flyers) {
    const x = flyer.fromX + (flyer.toX - flyer.fromX) * eased;
    const y = flyer.fromY + (flyer.toY - flyer.fromY) * eased;
    const rot = flyer.fromRotate * (1 - eased);
    flyer.node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
    flyer.node.style.opacity = flyer.fade ? (1 - eased).toFixed(3) : "1";
    flyer.body.x = flyer.body.rest.x + x;
    flyer.body.y = flyer.body.rest.y + y;
    flyer.body.rotate = rot;
    flyer.body.vx = 0;
    flyer.body.vy = 0;
    flyer.body.vr = 0;
  }
}

function parkRoleLine(run: VoiceRun, bodies: PlayBody[], nodes: Map<string, HTMLElement>) {
  for (const flyer of run.flight.flyers) {
    clearFlyerStyle(flyer.node);
    flyer.node.style.display = "none";
  }
  run.flight.measure.dataset.shown = "";
  for (let index = bodies.length - 1; index >= 0; index -= 1) {
    const body = bodies[index];
    if (!body || !isRoleBody(body)) {
      continue;
    }
    nodes.delete(body.id);
    bodies.splice(index, 1);
  }
}

function releaseRoleVoice(root: HTMLElement, text: string) {
  const line = root.querySelector<HTMLElement>(".role-line");
  const visual = line?.querySelector<HTMLElement>("[aria-hidden='true']");
  if (!line || !visual) {
    return;
  }

  visual.querySelector(".play-voice-measure")?.remove();
  const tokens = splitPlayTokens(text);
  visual.querySelectorAll<HTMLElement>("[data-play-word]").forEach((node) => {
    const index = Number(node.dataset.playWord?.slice(5));
    const token = tokens[index];
    if (token?.kind === "word") {
      node.textContent = token.value;
    }
    clearFlyerStyle(node);
    node.style.display = "";
  });
  visual.querySelectorAll<HTMLElement>(":scope > .play-space").forEach((space) => {
    space.style.display = "";
  });
  line.style.minHeight = "";
}

function collectBodies(
  root: HTMLElement,
  bodies: PlayBody[],
  nodes: Map<string, HTMLElement>,
) {
  const header = document.querySelector(".site-header-bar");
  if (!header) {
    return;
  }

  const origin = header.getBoundingClientRect();
  const next = new Map<string, PlayRest>();
  const nextNodes = new Map<string, HTMLElement>();

  root.querySelectorAll<HTMLElement>("[data-play-word]").forEach((node) => {
    const id = node.dataset.playWord;
    if (!id) {
      return;
    }

    next.set(id, restFromNode(node, origin));
    nextNodes.set(id, node);
  });

  const button = document.querySelector<HTMLElement>("[data-play-button]");
  if (button) {
    next.set("journal", restFromNode(button, origin));
    nextNodes.set("journal", button);
  }

  const seen = new Set<string>();
  for (const [id, rest] of next) {
    seen.add(id);
    const existing = bodies.find((body) => body.id === id);
    if (existing) {
      syncPlayRest(existing, rest);
      continue;
    }

    const letters = nextNodes.get(id)?.textContent?.replace(/\s/g, "").length ?? 1;
    bodies.push(
      createPlayBody(
        id,
        id === "journal" ? "button" : "glyph",
        rest,
        id === "journal" ? 8 : 1 + Math.min(12, letters) * 0.22,
      ),
    );
  }

  for (let index = bodies.length - 1; index >= 0; index -= 1) {
    if (!seen.has(bodies[index].id)) {
      bodies.splice(index, 1);
    }
  }

  nodes.clear();
  nextNodes.forEach((node, id) => {
    nodes.set(id, node);
  });
}

function restFromNode(node: HTMLElement, origin: DOMRect): PlayRest {
  const previous = node.style.transform;
  node.style.transform = "none";
  const rect = node.getBoundingClientRect();
  node.style.transform = previous;
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    w: rect.width,
    h: rect.height,
  };
}

function readBust(origin: DOMRect): BustCollider | null {
  const handle = window.__headerSoftHandle;
  const camera = handle?.ctx?.camera;
  const canvas = headerStageCanvas(handle);
  if (!handle?.ctx?.scene || !camera || !canvas) {
    return null;
  }

  let matter: { center?: { x: number; y: number; z: number }; grabbing?: boolean } | undefined;
  handle.ctx.scene.traverse((object) => {
    if (object.userData?.softMatter) {
      matter = object.userData.softMatter;
    }
  });

  const center = matter?.center;
  if (!center) {
    return null;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const projected = projectWorld(camera, center, canvasRect);
  if (!projected) {
    return null;
  }

  const edgeX = projectWorld(camera, { x: center.x + 1.2, y: center.y, z: center.z }, canvasRect);
  const edgeY = projectWorld(camera, { x: center.x, y: center.y + 1.2, z: center.z }, canvasRect);
  const rx = edgeX ? Math.max(18, Math.abs(edgeX.x - projected.x)) : 28;
  const ry = edgeY ? Math.max(18, Math.abs(edgeY.y - projected.y)) : 28;

  return {
    x: projected.x - origin.left,
    y: projected.y - origin.top,
    rx,
    ry,
    grabbing: Boolean(matter?.grabbing || handle.ctx.pointer?.down),
  };
}

function projectWorld(
  camera: NonNullable<NonNullable<typeof window.__headerSoftHandle>["ctx"]>["camera"],
  point: { x: number; y: number; z: number },
  canvas: DOMRect,
) {
  if (!camera) {
    return null;
  }

  const vector = camera.position.clone().set(point.x, point.y, point.z).project(camera);
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    return null;
  }

  return {
    x: (vector.x * 0.5 + 0.5) * canvas.width + canvas.left,
    y: (-vector.y * 0.5 + 0.5) * canvas.height + canvas.top,
  };
}

function paintBodies(bodies: PlayBody[], nodes: Map<string, HTMLElement>) {
  for (const body of bodies) {
    const node = nodes.get(body.id);
    if (!node || node.dataset.voiceFly != null) {
      continue;
    }

    node.style.transform = playTransform(body);
    if (body.loose) {
      node.dataset.loose = "";
    } else {
      delete node.dataset.loose;
    }
  }
}
