"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  applyHeaderPlay,
  applySoftBodyHome,
  compactHeaderPlay,
  COMPACT_HEADER_PX,
  headerPlayForHeight,
  headScreenBounds,
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
import {
  createVoiceDeck,
  scrambleText,
  VOICE_MESSAGES,
  voiceHoldMs,
  type VoiceMessage,
} from "@/lib/play-voice";

const GRAB_HOME_MS = PLAY_HOME_MS;
const RELEASE_SETTLE_MS = 750;
const VOICE_SCRAMBLE_S = 0.9;
const SCRAMBLE_EASE = [0.32, 0.72, 0, 1] as const;
const GROUND_RISE_S = 1.1;
const GROUND_RISE_EASE = [0.86, 0, 0.07, 1] as const;
const TEXT_MS = 0.38;
const TEXT_STAGGER_S = 0.09;
const HEAD_DELAY_S = TEXT_MS + TEXT_STAGGER_S + 0.08;
const HEAD_S = 1.15;
const JOURNAL_ENTER_MS = 400;
const ENTER_FALLBACK_MS = 3200;

function releasePlayEnter() {
  delete document.documentElement.dataset.playEnter;
}

function revealStuckCopy(root: HTMLElement | null) {
  releasePlayEnter();
  root?.querySelectorAll<HTMLElement>(".intro-name, .role-line, .intro-copy").forEach((node) => {
    if (getComputedStyle(node).opacity === "0") {
      node.style.opacity = "1";
      node.style.transform = "none";
    }
  });
}
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
  nextText: string;
  swapped: boolean;
};

type VoiceFlight = {
  phrase: string;
  line: HTMLElement;
  visual: HTMLElement;
  measure: HTMLElement;
  flyers: VoiceFlyer[];
  fromHeight: number;
  toHeight: number;
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
  name: string;
  role: string;
  paragraphs: readonly string[];
  links: Readonly<Record<string, string>>;
};

export function HomePlayfield({ name, role, paragraphs, links }: HomePlayfieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<PlayBody[]>([]);
  const nodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const homingRef = useRef(false);
  const prevBustRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const reducedRef = useRef(false);
  const enteredRef = useRef(false);
  const journalSettledRef = useRef(false);
  const headEnterRef = useRef<{ stop: () => void } | null>(null);
  const homeAnimRef = useRef<{ stop: () => void } | null>(null);
  const homeFromHeadRef = useRef<Float64Array | null>(null);
  const homeTRef = useRef(0);
  const voiceRef = useRef<VoiceRun | null>(null);
  const voiceActiveRef = useRef(false);
  const voiceGenRef = useRef(0);
  const deckRef = useRef(createVoiceDeck(VOICE_MESSAGES));
  const roleRef = useRef(role);
  const prefersReduced = useReducedMotion() === true;
  roleRef.current = role;

  useLayoutEffect(() => {
    const reduced = prefersReduced;
    reducedRef.current = reduced;
    const button = document.querySelector<HTMLElement>("[data-play-button]");
    if (reduced) {
      releasePlayEnter();
      window.__headerEnterShift = 0;
      window.__headerEntering = false;
      enteredRef.current = true;
      journalSettledRef.current = true;
      if (button) {
        button.inert = false;
        delete button.dataset.journalIn;
        button.dataset.journalSettled = "";
      }
      return;
    }

    journalSettledRef.current = false;
    if (button) {
      button.inert = true;
      delete button.dataset.journalSettled;
      delete button.dataset.journalIn;
    }
    window.__headerEnterShift = HOME_ENTER_SHIFT;
    window.__headerEntering = true;

    const root = rootRef.current;
    if (!root) {
      releasePlayEnter();
      if (button) {
        button.inert = false;
      }
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
      const role = root.querySelector(".intro-name") ?? root.querySelector(".role-line");
      const textShift = window.innerHeight * 0.05;
      const roleTop = role?.getBoundingClientRect().top;
      const textTop =
        (roleTop == null ? COMPACT_HEADER_PX + 32 + textShift : roleTop + window.scrollY) -
        textShift;
      const play = headerPlayForHeight(height, window.innerWidth, textTop);
      applyHeaderPlay(play);
      syncSoftBody(play);
      alignJournalToHead(bodiesRef.current);

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
        collectBodies(root, bodiesRef.current, nodesRef.current, journalSettledRef.current);
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
        collectBodies(root, bodiesRef.current, nodesRef.current, journalSettledRef.current);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (button) {
        button.inert = false;
      }
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
      releasePlayEnter();
      enteredRef.current = true;
      journalSettledRef.current = true;
      const root = rootRef.current;
      if (root) {
        collectBodies(root, bodiesRef.current, nodesRef.current, true);
      }
      return;
    }

    window.__headerEnterShift = HOME_ENTER_SHIFT;
    window.__headerEntering = true;
    let cancelJournalEnter = () => {};
    const finishEnter = () => {
      if (enteredRef.current) {
        return;
      }

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
        collectBodies(root, bodiesRef.current, nodesRef.current, false);
      }
      revealJournal();
    };

    const revealJournal = () => {
      const journalButton = document.querySelector<HTMLElement>("[data-play-button]");
      let settled = false;
      let timer = 0;

      const settle = () => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        journalButton?.removeEventListener("animationend", onEnd);
        journalSettledRef.current = true;
        if (journalButton) {
          journalButton.inert = false;
          journalButton.dataset.journalSettled = "";
          delete journalButton.dataset.journalIn;
        }
        const liveRoot = rootRef.current;
        if (liveRoot) {
          collectBodies(liveRoot, bodiesRef.current, nodesRef.current, true);
        }
      };

      const onEnd = (event: AnimationEvent) => {
        if (event.animationName !== "journal-enter") {
          return;
        }
        settle();
      };

      cancelJournalEnter = () => {
        window.clearTimeout(timer);
        journalButton?.removeEventListener("animationend", onEnd);
      };

      releasePlayEnter();

      if (!journalButton) {
        settle();
        return;
      }

      journalButton.inert = false;
      journalButton.addEventListener("animationend", onEnd);
      journalButton.dataset.journalIn = "";
      timer = window.setTimeout(settle, JOURNAL_ENTER_MS + 120);
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
    const enterFallback = window.setTimeout(() => {
      if (!enteredRef.current) {
        headEnter.stop();
        finishEnter();
      }
      revealStuckCopy(rootRef.current);
    }, ENTER_FALLBACK_MS);

    let frame = 0;
    let last = performance.now();
    let homeToken = 0;
    let grabbedAt = 0;
    let settleAt = 0;
    const button = document.querySelector<HTMLElement>("[data-play-button]");
    const drag = { active: false, id: 0, x: 0, y: 0, lastX: 0, lastY: 0 };
    let wasGrabbing = false;

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
      collectBodies(root, bodiesRef.current, nodesRef.current, journalSettledRef.current);
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

    const riseFallenBodies = () => {
      const fallen = bodiesRef.current.filter((body) => body.loose);
      if (fallen.length === 0) {
        return;
      }
      if (reducedRef.current) {
        finishPlayHome(fallen);
        return;
      }

      const token = ++homeToken;
      homingRef.current = true;
      homeTRef.current = 0;
      beginPlayHome(fallen);
      const homeAnim = animate(0, 1, {
        duration: GROUND_RISE_S,
        ease: GROUND_RISE_EASE,
        onUpdate(value) {
          if (token !== homeToken) {
            return;
          }
          homeTRef.current = value;
          applyPlayHome(fallen, value);
        },
        onComplete() {
          if (token !== homeToken) {
            return;
          }
          finishPlayHome(fallen);
          homeAnimRef.current = null;
          homeTRef.current = 0;
          homingRef.current = false;
        },
      });
      homeAnimRef.current = homeAnim;
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
          riseFallenBodies();
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
        const flight =
          VOICE_MESSAGES.length > 0
            ? beginRoleVoice(
                root,
                deckRef.current.next(),
                bodiesRef.current,
                nodesRef.current,
              )
            : null;
        if (flight) {
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
      const voiced = generation !== 0;
      const body = window.__headerSoftBody;
      homingRef.current = true;
      window.__headerHoming = true;
      homeTRef.current = 0;
      window.__headerHomeT = 0;
      if (!voiced) {
        beginPlayHome(bodiesRef.current);
      }
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
          if (!voiced) {
            applyPlayHome(bodiesRef.current, value);
          }
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
          const stillVoiced = run?.generation === generation && run.phase === "flight";
          if (!stillVoiced) {
            finishPlayHome(bodiesRef.current);
          }
          if (body) {
            pinSoftBodyRest(body);
            body.spinStart = performance.now();
            body.homeAt = 0;
            body.homeFrom = null;
          }
          homeFromHeadRef.current = null;
          homeAnimRef.current = null;
          homingRef.current = false;
          grabbedAt = 0;
          window.__headerHoming = false;
          window.__headerHomeT = 0;
          window.__headerHomeFrom = null;
          if (!stillVoiced || !run) {
            return;
          }

          parkRoleLine(run, bodiesRef.current, nodesRef.current);
          run.phase = "hold";
          run.holdTimer = window.setTimeout(() => {
            startScramble(generation);
          }, voiceHoldMs({ text: run.flight.phrase }));
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

      const starting = !body.loose;
      body.loose = true;
      if (starting) {
        armGrabClock(performance.now());
      }
      body.x = event.clientX - origin.left - body.rest.w / 2;
      body.y = event.clientY - origin.top - body.rest.h / 2;
      body.vx = (event.clientX - drag.lastX) * 45;
      body.vy = (event.clientY - drag.lastY) * 45;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
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
    };

    button?.addEventListener("pointerdown", onButtonDown);
    window.addEventListener("pointermove", onButtonMove);
    window.addEventListener("pointerup", onButtonUp);
    window.addEventListener("pointercancel", onButtonUp);

    const armGrabClock = (now: number) => {
      if (grabbedAt === 0) {
        grabbedAt = now;
      }
    };

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (window.__headerPlay) {
        syncSoftBody(window.__headerPlay);
      }
      alignJournalToHead(bodiesRef.current);
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
        collectBodies(root, bodiesRef.current, nodesRef.current, journalSettledRef.current);
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

      const holding = Boolean(bust?.grabbing) || drag.active;
      const grabbing = Boolean(bust?.grabbing);
      if (grabbing && !wasGrabbing) {
        armGrabClock(now);
      }
      if (grabbing) {
        stopHome();
        settleAt = 0;
      } else if (wasGrabbing) {
        stopHome();
        if (grabbedAt > 0 && now - grabbedAt >= GRAB_HOME_MS) {
          settleAt = now + RELEASE_SETTLE_MS;
        }
      }
      wasGrabbing = grabbing;

      const grabElapsed = grabbedAt > 0 && now - grabbedAt >= GRAB_HOME_MS;
      const settled = settleAt === 0 || now >= settleAt;
      if (
        !homingRef.current &&
        !voiceActiveRef.current &&
        !holding &&
        grabElapsed &&
        settled
      ) {
        settleAt = 0;
        startHome();
      }

      const flight = voiceRef.current?.phase === "flight" ? voiceRef.current.flight : null;
      let playBodies = bodiesRef.current;
      let suspendPhysics = homingRef.current;
      let bustCollider = drag.active ? null : liveBust;
      if (flight) {
        const flying = new Set(flight.flyers.map((flyer) => flyer.body));
        playBodies = bodiesRef.current.filter((body) => !flying.has(body));
        suspendPhysics = false;
        bustCollider = null;
      }
      const { struck } = stepPlayfield(playBodies, dt, bounds, bustCollider, suspendPhysics);

      if (struck) {
        const grabStillOpen = grabbedAt > 0 && now - grabbedAt < GRAB_HOME_MS;
        if (grabStillOpen || grabbedAt === 0) {
          stopHome(voiceRef.current?.phase === "flight");
        }
      }

      if (homingRef.current) {
        if (voiceRef.current?.phase !== "flight") {
          applyPlayHome(bodiesRef.current, homeTRef.current);
        }
        const body = window.__headerSoftBody;
        if (body && homeFromHeadRef.current) {
          applySoftBodyHome(body, homeFromHeadRef.current, homeTRef.current);
        }
      } else if (window.__headerSoftBody && !bust?.grabbing) {
        window.__headerSoftBody.homeAt = 0;
      }

      paintBodies(bodiesRef.current, nodesRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      window.clearTimeout(enterFallback);
      cancelJournalEnter();
      if (button) {
        button.inert = false;
        delete button.dataset.journalIn;
      }
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

  const copyKey = [name, role, ...paragraphs].join("\n");
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enteredRef.current || voiceActiveRef.current) {
      return;
    }

    collectBodies(root, bodiesRef.current, nodesRef.current, journalSettledRef.current);
  }, [copyKey]);

  return (
    <div ref={rootRef} className="home-playfield">
      <motion.div
        className="home-intro mx-auto w-full max-w-[42rem]"
        variants={introList}
        initial={prefersReduced ? "show" : "hide"}
        animate="show"
      >
        <PlayLine className="intro-name" text={name} lineId="name" links={links} />
        <PlayLine className="role-line" text={role} lineId="role" links={links} />
        {paragraphs.map((text, index) => (
          <PlayLine
            key={text}
            className="intro-copy"
            text={text}
            lineId={`intro-${index}`}
            links={links}
          />
        ))}
      </motion.div>
      <div className="playfield-end" aria-hidden="true" />
    </div>
  );
}

function PlayLine({
  className,
  text,
  lineId,
  links,
}: {
  className: string;
  text: string;
  lineId: string;
  links?: Readonly<Record<string, string>>;
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

          const bare = token.value.replace(/[.,]$/, "");
          const punct = token.value.slice(bare.length);
          const href = links?.[bare];
          return (
            <span
              key={`${lineId}-w${index}`}
              className="play-word"
              data-play-word={`${lineId}-${index}`}
            >
              {href ? (
                <>
                  <a className="intro-link" href={href} rel="noreferrer" target="_blank" tabIndex={-1}>
                    {bare}
                  </a>
                  {punct}
                </>
              ) : (
                token.value
              )}
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
  node.style.color = "";
  delete node.dataset.voiceFly;
}

function beginRoleVoice(
  root: HTMLElement,
  message: VoiceMessage,
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
      nextText: "",
      swapped: false,
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
  appendVoiceParts(measure, message.text, "play-word");
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
      flyer.nextText = slot.textContent ?? "";
      return;
    }

    flyer.fade = true;
    flyer.toX = phraseBox.left + phraseBox.width / 2 - flyer.node.offsetWidth / 2 - baseLeft;
    flyer.toY = phraseBox.top + phraseBox.height / 2 - flyer.node.offsetHeight / 2 - baseTop;
  });

  const fromHeight = Math.ceil(Number.parseFloat(line.style.minHeight) || line.getBoundingClientRect().height);
  const toHeight = Math.ceil(measure.getBoundingClientRect().height);
  return {
    phrase: message.text,
    line,
    visual,
    measure,
    flyers,
    fromHeight,
    toHeight,
  };
}

function appendVoiceParts(parent: HTMLElement, text: string, wordClass: string) {
  for (const part of text.split(/(\s+)/)) {
    if (!part) {
      continue;
    }

    const span = document.createElement("span");
    if (/^\s+$/.test(part)) {
      span.className = "play-space";
      span.textContent = "\u00A0";
    } else {
      span.className = wordClass;
      span.textContent = part;
    }
    parent.appendChild(span);
  }
}

const TEXT_SWAP = 0.46;
const TEXT_FADE = 0.16;

function paintVoiceFlight(flight: VoiceFlight, t: number) {
  const eased = Math.min(1, Math.max(0, t));
  const height = flight.fromHeight + (flight.toHeight - flight.fromHeight) * eased;
  flight.line.style.minHeight = `${Math.ceil(height)}px`;
  for (const flyer of flight.flyers) {
    const x = flyer.fromX + (flyer.toX - flyer.fromX) * eased;
    const y = flyer.fromY + (flyer.toY - flyer.fromY) * eased;
    const rot = flyer.fromRotate * (1 - eased);
    flyer.node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
    flyer.node.style.opacity = voiceGlyphOpacity(flyer, eased).toFixed(3);
    flyer.body.x = flyer.body.rest.x + x;
    flyer.body.y = flyer.body.rest.y + y;
    flyer.body.rotate = rot;
    flyer.body.vx = 0;
    flyer.body.vy = 0;
    flyer.body.vr = 0;
  }
}

function voiceGlyphOpacity(flyer: VoiceFlyer, eased: number) {
  if (flyer.fade || !flyer.nextText) {
    return flyer.fade ? 1 - eased : 1;
  }

  if (!flyer.swapped && eased >= TEXT_SWAP) {
    flyer.node.textContent = flyer.nextText;
    flyer.swapped = true;
    return 0;
  }

  const dist = Math.abs(eased - TEXT_SWAP);
  if (dist >= TEXT_FADE) {
    return 1;
  }

  return dist / TEXT_FADE;
}

function parkRoleLine(run: VoiceRun, bodies: PlayBody[], nodes: Map<string, HTMLElement>) {
  for (const flyer of run.flight.flyers) {
    clearFlyerStyle(flyer.node);
    flyer.node.style.display = "none";
  }
  run.flight.measure.dataset.shown = "";
  run.flight.line.style.minHeight = "";
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

function alignJournalToHead(bodies: PlayBody[]) {
  const journal = bodies.find((body) => body.id === "journal");
  if (journal?.loose) {
    return;
  }

  const header = document.querySelector<HTMLElement>(".site-header-bar");
  const button = header?.querySelector<HTMLElement>("[data-play-button]");
  const canvas = headerStageCanvas(window.__headerSoftHandle);
  const camera = window.__headerSoftHandle?.ctx?.camera;
  const body = window.__headerSoftBody;
  if (!header || !button || !canvas || !camera?.position.clone || !body?.count) {
    return;
  }

  const height = canvas.getBoundingClientRect().height;
  if (height < 32) {
    return;
  }

  let crown = -Infinity;
  let chin = Infinity;
  for (let index = 0; index < body.count; index += 1) {
    const y = body.rest[index * 3 + 1];
    crown = Math.max(crown, y);
    chin = Math.min(chin, y);
  }

  const project = (worldY: number) => {
    const projected = camera.position.clone().set(0, worldY, 0).project(camera);
    return (-projected.y * 0.5 + 0.5) * height;
  };
  const mid = (project(crown) + project(chin)) / 2;
  if (!Number.isFinite(mid)) {
    return;
  }

  const top = Math.round((mid - button.getBoundingClientRect().height / 2) * 10) / 10;
  const next = `${top}px`;
  if (header.style.getPropertyValue("--journal-top") === next) {
    return;
  }

  header.style.setProperty("--journal-top", next);
  if (journal) {
    syncPlayRest(journal, restFromNode(button, header.getBoundingClientRect()));
  }
}

function collectBodies(
  root: HTMLElement,
  bodies: PlayBody[],
  nodes: Map<string, HTMLElement>,
  includeJournal = true,
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
  if (button && includeJournal) {
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
  const bounds = headScreenBounds(origin);
  if (!bounds) {
    return null;
  }

  return {
    x: bounds.x,
    y: bounds.y,
    rx: bounds.rx,
    ry: bounds.ry,
    grabbing: bounds.grabbing,
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
