"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createColliderScan } from "@/lib/monsters/colliders";
import {
  createCreature,
  displayScale,
  findLanding,
  pose,
  rideSupport,
  stepCreature,
} from "@/lib/monsters/simulate";
import {
  getSummon,
  releaseMonster,
  subscribeMonster,
  type MonsterSummon,
} from "@/lib/monsters/store";
import { fittedSize, summonAnnouncement, traitCardCopy } from "@/lib/monsters/traits";
import type { Collider, ScreenBox, VisualStroke } from "@/lib/monsters/types";

type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
};

const CARD_W = 176;
const CARD_H = 68;

function escapeAttr(value: string): string {
  return value.split("\\").join("\\\\").split('"').join('\\"');
}

function legIndexesFor(ids: string[], legs: string[]): Map<string, number> {
  return ids.reduce((indexes, id) => {
    if (legs.includes(id)) {
      indexes.set(id, indexes.size);
    }
    return indexes;
  }, new Map<string, number>());
}

function makeShards(visual: VisualStroke[], box: ScreenBox): Shard[] {
  return visual.map((stroke, index) => {
    const angle = Math.atan2(stroke.cy - box.h / 2, stroke.cx - box.w / 2);
    const speed = 80 + (index % 4) * 22;
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 36,
      rot: 0,
      vr: (index % 2 === 0 ? 1 : -1) * (80 + (index % 3) * 30),
    };
  });
}

type ViewRefs = {
  view: MonsterSummon;
  actorRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  cardRef: RefObject<HTMLDivElement | null>;
  nameRef: RefObject<HTMLParagraphElement | null>;
  lineRef: RefObject<HTMLParagraphElement | null>;
  detailRef: RefObject<HTMLParagraphElement | null>;
};

export function MonsterStage() {
  const [view, setView] = useState<MonsterSummon | null>(null);
  const [farewell, setFarewell] = useState("");
  const actorRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const detailRef = useRef<HTMLParagraphElement>(null);
  const veilRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.monsterVeil = "true";
    document.head.append(style);
    veilRef.current = style;
    return () => {
      style.remove();
      veilRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = getSummon();
      if (!next) {
        return;
      }
      setView((current) => (current?.token === next.token ? current : next));
    };
    sync();
    return subscribeMonster(sync);
  }, []);

  useEffect(() => {
    if (!view) {
      return;
    }

    const veil = veilRef.current;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrowQuery = window.matchMedia("(max-width: 720px)");
    if (veil) {
      const fade = reducedQuery.matches ? "" : "transition:opacity 180ms var(--ease-out);";
      veil.textContent = view.shapeIds
        .map((id) => `.tl-shape[data-shape-id="${escapeAttr(id)}"]{opacity:0 !important;${fade}}`)
        .join("");
    }

    const scan = createColliderScan();
    const narrow = narrowQuery.matches;
    const size = fittedSize(view.drawing.screenBox, view.traits.ink, narrow);
    const landing = findLanding(
      view.drawing.screenBox,
      size,
      scan(performance.now(), null, narrow),
      window.innerWidth,
      window.innerHeight,
    );
    const state = createCreature({
      from: view.drawing.screenBox,
      to: landing,
      size,
      life: view.traits.lifespan,
      speed: view.traits.speed * (narrow ? 0.85 : 1),
      mass: view.traits.mass,
      gait: view.traits.gait,
      mood: view.traits.mood,
      reduced: view.reduced || reducedQuery.matches,
    });
    const shards = makeShards(view.drawing.visual, view.drawing.screenBox);
    const opening = traitCardCopy(view.traits, state.life);
    if (nameRef.current) {
      nameRef.current.textContent = opening.name;
    }
    if (lineRef.current) {
      lineRef.current.textContent = opening.line;
    }
    if (detailRef.current) {
      detailRef.current.textContent = opening.detail;
    }

    let frame = 0;
    let last = performance.now();
    let stopped = false;
    let previousPlatforms = new Map<string, Collider>();
    let shownSecond = Math.ceil(state.life);
    const cursor = { x: null as number | null, y: null as number | null };

    const onPointer = (event: PointerEvent) => {
      cursor.x = event.clientX;
      cursor.y = event.clientY;
    };
    const onReduced = () => {
      state.reduced = reducedQuery.matches;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    reducedQuery.addEventListener("change", onReduced);

    const paint = (dt: number) => {
      const actor = actorRef.current;
      const card = cardRef.current;
      const svg = svgRef.current;
      if (!actor || !card || !svg) {
        return;
      }
      const scale = displayScale(state);
      const look = pose(state);
      actor.style.width = `${scale.w}px`;
      actor.style.height = `${scale.h}px`;
      actor.style.transform = `translate3d(${state.x}px, ${state.y + look.bob}px, 0)`;
      svg.style.transformOrigin = state.gait === "roll" ? "50% 50%" : "50% 100%";
      svg.style.transform =
        state.gait === "roll"
          ? `rotate(${state.roll}rad) scale(${look.squashX}, ${look.squashY})`
          : `scale(${look.squashX}, ${look.squashY})`;

      const user = state.naturalH / Math.max(1, scale.h);
      if (state.phase === "decay" && !state.reduced) {
        for (const shard of shards) {
          shard.vy += 1700 * user * dt;
          shard.x += shard.vx * user * dt;
          shard.y += shard.vy * user * dt;
          shard.rot += shard.vr * dt;
        }
      }

      const groups = svg.querySelectorAll<SVGGElement>("[data-shard]");
      groups.forEach((group, index) => {
        const shard = shards[index];
        const leg = group.dataset.leg === "true";
        const swingIndex = Number(group.dataset.legIndex ?? "0");
        if (state.phase === "decay" && !state.reduced && shard) {
          const fade = state.decay < 0.4 ? 1 : 1 - (state.decay - 0.4) / 0.75;
          group.setAttribute(
            "transform",
            `translate(${shard.x.toFixed(1)} ${shard.y.toFixed(1)}) rotate(${shard.rot.toFixed(1)} ${group.dataset.cx} ${group.dataset.cy})`,
          );
          group.style.opacity = String(Math.max(0, fade));
          return;
        }
        if (state.phase === "decay" && state.reduced) {
          group.style.opacity = String(Math.max(0, 1 - state.decay / 0.35));
          return;
        }
        if (leg && state.phase === "live") {
          const swing = look.swing * (swingIndex % 2 === 0 ? 1 : -1);
          group.setAttribute(
            "transform",
            `rotate(${swing.toFixed(2)} ${group.dataset.hipX} ${group.dataset.hipY})`,
          );
          group.style.opacity = "1";
          return;
        }
        group.removeAttribute("transform");
        group.style.opacity = "1";
      });

      const cardX = Math.min(
        Math.max(8, state.x + scale.w / 2 - CARD_W / 2),
        Math.max(8, window.innerWidth - CARD_W - 8),
      );
      let cardY = state.y + look.bob - CARD_H - 10;
      if (cardY < 8) {
        cardY = state.y + scale.h + 10;
      }
      card.style.transform = `translate3d(${cardX}px, ${cardY}px, 0)`;
      card.style.opacity =
        state.phase === "decay" ? String(Math.max(0, 1 - state.decay / 0.35)) : "1";
    };

    const loop = (now: number) => {
      if (stopped) {
        return;
      }
      if (document.hidden) {
        last = now;
        frame = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const world = scan(
        now,
        { x: state.x + state.w / 2, y: state.y + state.h },
        narrowQuery.matches,
      );
      stepCreature(
        state,
        dt,
        world,
        cursor.x,
        cursor.y,
        window.innerWidth,
        window.innerHeight,
      );
      rideSupport(state, world, previousPlatforms);
      previousPlatforms = new Map(world.map((collider) => [collider.key, collider]));
      paint(dt);
      if (state.phase === "live") {
        const second = Math.ceil(Math.max(0, state.life - state.age));
        if (second !== shownSecond && detailRef.current && lineRef.current) {
          shownSecond = second;
          const next = traitCardCopy(view.traits, state.life - state.age);
          lineRef.current.textContent = next.line;
          detailRef.current.textContent = next.detail;
        }
      }
      if (state.phase === "done") {
        if (veil) {
          veil.textContent = "";
        }
        releaseMonster();
        setFarewell(`${view.traits.name} fell apart.`);
        setView(null);
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      reducedQuery.removeEventListener("change", onReduced);
    };
  }, [view]);

  const status = view ? summonAnnouncement(view.traits) : farewell;

  if (!view && status.length === 0) {
    return null;
  }

  return (
    <>
      <p className="sr-only" role="status">
        {status}
      </p>
      {view ? (
        <CreatureView
          view={view}
          actorRef={actorRef}
          svgRef={svgRef}
          cardRef={cardRef}
          nameRef={nameRef}
          lineRef={lineRef}
          detailRef={detailRef}
        />
      ) : null}
    </>
  );
}

function CreatureView({
  view,
  actorRef,
  svgRef,
  cardRef,
  nameRef,
  lineRef,
  detailRef,
}: ViewRefs) {
  const copy = traitCardCopy(view.traits, view.traits.lifespan);
  const legIndexes = legIndexesFor(
    view.drawing.visual.map((stroke) => stroke.id),
    view.traits.legIds,
  );
  return (
    <div className="monster-stage" data-monster-root aria-hidden="true">
      <div className="monster-actor" ref={actorRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${view.drawing.screenBox.w} ${view.drawing.screenBox.h}`}
          aria-hidden="true"
        >
          {view.drawing.visual.map((stroke) => {
            const leg = view.traits.legIds.includes(stroke.id);
            const index = legIndexes.get(stroke.id) ?? 0;
            return (
              <g
                key={stroke.id}
                data-shard=""
                data-leg={leg ? "true" : "false"}
                data-leg-index={index}
                data-hip-x={stroke.hipX.toFixed(1)}
                data-hip-y={stroke.hipY.toFixed(1)}
                data-cx={stroke.cx.toFixed(1)}
                data-cy={stroke.cy.toFixed(1)}
              >
                {stroke.dot ? (
                  <circle
                    cx={stroke.dot.x}
                    cy={stroke.dot.y}
                    r={Math.max(stroke.width, 2)}
                    fill={stroke.color}
                  />
                ) : (
                  <path
                    d={stroke.d}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="monster-card" ref={cardRef}>
        <p className="monster-card-name" ref={nameRef}>
          {copy.name}
        </p>
        <p className="monster-card-meta" ref={lineRef}>
          {copy.line}
        </p>
        <p className="monster-card-meta" ref={detailRef}>
          {copy.detail}
        </p>
      </div>
    </div>
  );
}
