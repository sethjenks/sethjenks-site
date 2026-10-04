"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  applyHeaderPlay,
  compactHeaderPlay,
  COMPACT_HOME_MS,
  PLAY_HOME_MS,
  syncSoftBody,
  type HeaderSoftHandle,
} from "@/lib/header-play";

const RUNTIME_SRC = "/soft-matter/runtime.d631aa3ec6122788.js";
const EFFECT_SRC = "/soft-matter/effect.b9030f95b969b94d.js";
const DRAG_THRESHOLD_PX = 8;

type AstraEvent =
  | { type: "ready"; backend?: string }
  | { type: "error"; message: string };

type AstraHandle = HeaderSoftHandle & {
  dispose: () => void;
};

type InspolaPayload = {
  compiled?: string;
  document: {
    values: {
      grid?: boolean;
      roughness?: number;
      reflections?: number;
      ior?: number;
      gravity?: number;
      firmness?: number;
      shape?: string;
      shapeThickness?: number;
      colour?: string;
    };
  };
};

type AstraRuntime = {
  mount: (
    element: HTMLElement,
    payload: InspolaPayload,
    onEvent?: (event: AstraEvent) => void,
  ) => Promise<AstraHandle>;
};

declare global {
  interface Window {
    AstraRuntime?: AstraRuntime;
    __inspolaPayload?: InspolaPayload;
    __headerHeadGeometry?: (
      three: { BufferGeometry: new () => unknown },
      dims: { width: number; height: number; depth: number },
    ) => unknown;
    installHeaderHead?: () => Promise<boolean>;
  }
}

let loadPromise: Promise<void> | null = null;

function loadScript(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

function loadSoftMatter() {
  if (typeof window !== "undefined" && window.AstraRuntime && window.__inspolaPayload) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = loadScript(RUNTIME_SRC).then(() => loadScript(EFFECT_SRC));
  }

  return loadPromise;
}

function flattenPlayfield(compiled: string) {
  const yMax = "window.__headerPlay&&window.__headerPlay.yMax||3.6";
  const yMin = "window.__headerPlay&&window.__headerPlay.yMin||.08";
  const homeMs = "window.__headerPlay&&window.__headerPlay.homeMs||5e3";
  return compiled
    .replaceAll(
      "x:Math.max(-3.2,Math.min(3.2,s.x)),y:Math.max(.1,Math.min(4.1,s.y)),z:Math.max(-2.4,Math.min(2.4,s.z))",
      `x:Math.max(-6,Math.min(52,s.x)),y:Math.max(${yMin},Math.min(${yMax},s.y)),z:Math.max(-1.6,Math.min(1.6,s.z))`,
    )
    .replaceAll(
      "Math.max(-3.2,Math.min(3.2,C.x)),Math.max(.1,Math.min(4.1,C.y)),Math.max(-2.4,Math.min(2.4,C.z))",
      `Math.max(-6,Math.min(52,C.x)),Math.max(${yMin},Math.min(${yMax},C.y)),Math.max(-1.6,Math.min(1.6,C.z))`,
    )
    .replaceAll(
      "for(let e=0;e<this.count;e++)t[e*3+1]=Math.max(this.floor,t[e*3+1])",
      `for(let e=0;e<this.count;e++){const zW=this.spinStart?2.8:1.6;t[e*3]=Math.max(-6,Math.min(52,t[e*3])),t[e*3+1]=Math.min(${yMax},t[e*3+1]),t[e*3+2]=Math.max(-zW,Math.min(zW,t[e*3+2]))}let floorMinY=1/0;for(let e=0;e<this.count;e++)floorMinY=Math.min(floorMinY,t[e*3+1]);if(floorMinY<this.floor){const floorLift=this.floor-floorMinY;for(let e=0;e<this.count;e++)t[e*3+1]+=floorLift,this.previous[e*3+1]+=floorLift}`,
    )
    .replaceAll(
      "r[e+h]=Math.max(-15,Math.min(15,(t[e+h]-this.previous[e+h])/o))",
      "r[e+h]=Math.max(-42,Math.min(42,(t[e+h]-this.previous[e+h])/o))",
    )
    .replaceAll(
      "a.setXYZ(o,g[r]+f,Math.max(.018,g[r+1]+u),g[r+2]+M)",
      "a.setXYZ(o,g[r]+f,g[r+1]+u,g[r+2]+M)",
    )
    .replaceAll(
      "t[e+1]<=this.floor+.002&&(r[e]*=.8,r[e+2]*=.8,r[e+1]=Math.max(0,r[e+1]))",
      `t[e+1]<=this.floor+.002&&(this.spinStart?r[e+1]=Math.max(0,r[e+1]):(r[e]*=.5,r[e+2]*=.55,r[e+1]=r[e+1]<0?-r[e+1]*.15:r[e+1])),t[e+1]>=${yMax}&&(r[e+1]=r[e+1]>0?-r[e+1]*.15:r[e+1]),(t[e]<=-6||t[e]>=52)&&(r[e]*=-.62),(t[e+2]<=-(this.spinStart?2.8:1.6)||t[e+2]>=(this.spinStart?2.8:1.6))&&(r[e+2]*=-.55)`,
    )
    .replaceAll(
      "grab(s){this.grabNodes=[],this.moveGrab(s);",
      "grab(s){this.homeAt=0,this.spinUntil=0,this.spinStart=0,this.homeFrom=null,this.grabNodes=[],this.moveGrab(s);",
    )
    .replaceAll(
      "release(){this.grabNodes=[]}",
      `release(){const g=this.grabNodes.length;this.grabNodes=[];if(g)this.homeAt=performance.now()+(${homeMs})}`,
    )
    .replaceAll(
      "r.reset(Number(Z.seed)),r.nudge(.2),l.update()",
      'r.reset(Number(Z.seed));if(!matchMedia("(prefers-reduced-motion: reduce)").matches){const home=location.pathname==="/"||location.pathname==="";if(home){if(window.__headerEnterShift==null)window.__headerEnterShift=6}else{r.spinStart=performance.now()}}l.update()',
    )
    .replaceAll(
      "step(s){const t=this.positions,r=this.velocities,o=this.stepSize,i=Math.exp(-Math.max(0,s.damping)*o);this.previous.set(t);for(let d=0;d<this.count;d++){",
      "step(s){const t=this.positions,r=this.velocities,o=this.stepSize,i=Math.exp(-Math.max(0,s.damping)*o);this.previous.set(t);for(let d=0;d<this.count;d++){",
    )
    .replaceAll(
      "}metrics(){let s=0,t=0,r=1/0",
      "if(window.__headerEntering){for(let n=0;n<this.count;n++){const i=n*3;this.positions[i]=this.rest[i];this.positions[i+1]=this.rest[i+1];this.positions[i+2]=this.rest[i+2];this.previous[i]=this.positions[i];this.previous[i+1]=this.positions[i+1];this.previous[i+2]=this.positions[i+2];this.velocities[i]=0;this.velocities[i+1]=0;this.velocities[i+2]=0}}else if(window.__headerHoming&&window.__headerHomeFrom){const ht=Math.min(1,Math.max(0,window.__headerHomeT||0)),hf=window.__headerHomeFrom;for(let n=0;n<this.count;n++){const i=n*3;this.positions[i]=hf[i]+(this.rest[i]-hf[i])*ht;this.positions[i+1]=hf[i+1]+(this.rest[i+1]-hf[i+1])*ht;this.positions[i+2]=hf[i+2]+(this.rest[i+2]-hf[i+2])*ht;this.previous[i]=this.positions[i];this.previous[i+1]=this.positions[i+1];this.previous[i+2]=this.positions[i+2];this.velocities[i]=0;this.velocities[i+1]=0;this.velocities[i+2]=0}}else if(!this.grabNodes.length&&this.spinStart){const a=((performance.now()-this.spinStart)/16000)*Math.PI*2;const c=Math.cos(a),s=Math.sin(a);for(let n=0;n<this.count;n++){const i=n*3,rx=this.rest[i],rz=this.rest[i+2];this.positions[i]=rx*c-rz*s;this.positions[i+1]=this.rest[i+1];this.positions[i+2]=rx*s+rz*c;this.previous[i]=this.positions[i];this.previous[i+1]=this.positions[i+1];this.previous[i+2]=this.positions[i+2];this.velocities[i]=0;this.velocities[i+1]=0;this.velocities[i+2]=0}}else if(!this.grabNodes.length&&this.homeAt&&performance.now()>this.homeAt){if(!this.homeFrom)this.homeFrom=this.positions.slice();const T=Math.min(1,(performance.now()-this.homeAt)/2000);const e=T*T*T;for(let n=0;n<this.count;n++){const i=n*3,f=this.homeFrom;this.positions[i]=f[i]+(this.rest[i]-f[i])*e;this.positions[i+1]=f[i+1]+(this.rest[i+1]-f[i+1])*e;this.positions[i+2]=f[i+2]+(this.rest[i+2]-f[i+2])*e;this.previous[i]=this.positions[i];this.previous[i+1]=this.positions[i+1];this.previous[i+2]=this.positions[i+2];this.velocities[i]=0;this.velocities[i+1]=0;this.velocities[i+2]=0}if(T>=1){this.homeFrom=null;this.homeAt=0;this.spinStart=this.spinStart||performance.now()}};}metrics(){let s=0,t=0,r=1/0",
    )
    .replaceAll(
      'A=l==="Block"?new c.BoxGeometry(t.width,t.height,t.depth,...F):(0,G.createShapeGeometry)(c,l,B,t.depth/(0,G.shapeDimensions)(l).depth);',
      'A=window.__headerHeadGeometry?window.__headerHeadGeometry(c,t):(l==="Block"?new c.BoxGeometry(t.width,t.height,t.depth,...F):(0,G.createShapeGeometry)(c,l,B,t.depth/(0,G.shapeDimensions)(l).depth));',
    )
    .replaceAll(
      "e.camera.position.set(3.2*p,2.8*p+1.1,7.2*p)",
      "e.camera.fov=window.__headerPlay&&window.__headerPlay.camZ>4?10:35,e.camera.position.set(1.55*p,window.__headerPlay&&window.__headerPlay.camZ>4?window.__headerPlay.lookY-(window.__headerEnterShift||0):(window.__headerPlay?window.__headerPlay.camY:1.35)*p+(window.__headerPlay?window.__headerPlay.camLift:1.2)-(window.__headerEnterShift||0),(window.__headerPlay?window.__headerPlay.camZ:3.45)*p)",
    )
    .replaceAll(
      "e.camera.lookAt(0,Math.max(1.05,r.height*.52),0)",
      "e.camera.lookAt(0,(window.__headerPlay?window.__headerPlay.lookY:Math.max(1.05,r.height*.52))-(window.__headerEnterShift||0),0)",
    )
    .replaceAll(
      "N.colorNode=$();",
      "N.colorNode=e.vec3(.08,.08,.08).mul(e.normalize(e.modelNormalMatrix.mul(e.normalLocal)).dot(e.normalize(e.vec3(.35,.9,.32))).max(0).mul(.7).add(.35));",
    )
    .replaceAll(
      'u.userData.softMatter={...d,nodes:r.count,tetrahedra:r.tets.length/4,solver:"CPU XPBD cage",quality:v,shape:o,shapeThickness:P,depth:r.depth,colour:t.colour||"#ff159f"}',
      'u.userData.softMatter={...d,nodes:r.count,tetrahedra:r.tets.length/4,solver:"CPU XPBD cage",quality:v,shape:o,shapeThickness:P,depth:r.depth,colour:t.colour||"#ff159f"};window.__headerSoftBody=r',
    );
}

function payloadForHeader(source: InspolaPayload): InspolaPayload {
  const payload = structuredClone(source);
  payload.document.values.grid = false;
  payload.document.values.colour = "#111111";
  payload.document.values.roughness = 1;
  payload.document.values.reflections = 0;
  payload.document.values.ior = 1;
  payload.document.values.gravity = 96;
  payload.document.values.damping = 2;
  payload.document.values.firmness = 8;
  if (typeof window !== "undefined" && window.__headerHeadGeometry) {
    payload.document.values.shape = "Sphere";
    payload.document.values.shapeThickness = 1;
  }
  if (payload.compiled) {
    payload.compiled = flattenPlayfield(payload.compiled);
  }
  return payload;
}

type BootStage = HTMLElement & { __headerBooting?: boolean };

// The boot script mounts the canvas before hydration. A shadow host keeps
// that canvas out of the light DOM React compares to the server HTML.
function stageHost(stage: HTMLElement) {
  const root = stage.shadowRoot ?? stage.attachShadow({ mode: "open" });
  let host = root.querySelector<HTMLElement>("[data-stage-host]");
  if (!host) {
    const style = document.createElement("style");
    style.textContent =
      ":host{display:block;width:100%;height:100%}[data-stage-host]{position:absolute;inset:0}canvas{display:block;width:100%;height:100%;background:transparent;touch-action:none}";
    host = document.createElement("div");
    host.dataset.stageHost = "";
    root.append(style, host);
  }
  return host;
}

function stageCanvas(stage: HTMLElement) {
  return stage.shadowRoot?.querySelector("canvas") ?? null;
}

function hideStageFurniture(scene: NonNullable<NonNullable<HeaderSoftHandle["ctx"]>["scene"]>) {
  scene.traverse((object) => {
    if (object.userData?.inspolaBackground || object.type === "GridHelper") {
      object.visible = false;
      return;
    }

    const size = object.geometry?.parameters;
    if (size?.width !== 1 || size.height !== 1) {
      return;
    }

    if ((object.position?.y ?? 1) < 0.05) {
      object.visible = false;
    }
  });
}

type SoftMatterMarkProps = {
  home: boolean;
};

export function SoftMatterMark({ home }: SoftMatterMarkProps) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, dragged: false });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    if (stageCanvas(stage)) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let handle: AstraHandle | null = null;

    loadSoftMatter()
      .then(() => (window.installHeaderHead ? window.installHeaderHead() : Promise.resolve(false)))
      .then(() => {
        if (cancelled || !window.AstraRuntime || !window.__inspolaPayload) {
          throw new Error("Effect files could not load.");
        }

        if (stageCanvas(stage) || (stage as BootStage).__headerBooting) {
          setReady(true);
          return;
        }

        (stage as BootStage).__headerBooting = true;
        return window.AstraRuntime.mount(
          stageHost(stage),
          payloadForHeader(window.__inspolaPayload),
          (event) => {
            if (cancelled) {
              return;
            }

            if (event.type === "ready") {
              setReady(true);
              return;
            }

            if (event.type === "error") {
              setFailed(true);
            }
          },
        );
      })
      .then((mounted) => {
        if (!mounted) {
          return;
        }

        if (cancelled) {
          mounted.dispose();
          return;
        }

        handle = mounted;
        window.__headerSoftHandle = mounted;
        if (mounted.ctx?.scene) {
          hideStageFurniture(mounted.ctx.scene);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      delete (stage as BootStage).__headerBooting;
      handle?.dispose();
    };
  }, []);

  useEffect(() => {
    const play = window.__headerPlay;
    if (!play) {
      return;
    }

    play.homeMs = home ? PLAY_HOME_MS : COMPACT_HOME_MS;
    if (!home) {
      const compact = compactHeaderPlay();
      applyHeaderPlay(compact);
      syncSoftBody(compact);
    }
  }, [home]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      dragRef.current.dragged = true;
    }
  };

  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (dragRef.current.dragged) {
      event.preventDefault();
      return;
    }

    if (!home) {
      router.push("/");
    }
  };

  return (
    <span
      className="site-mark"
      data-ready={ready && !failed ? "true" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
    >
      {home ? (
        <h1 className="site-mark-label">Seth Jenks</h1>
      ) : (
        <Link href="/" className="site-mark-label" onClick={onClick}>
          Seth Jenks
        </Link>
      )}
      <div ref={stageRef} className="soft-matter-stage" aria-hidden="true" />
    </span>
  );
}
