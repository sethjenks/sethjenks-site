import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import type { BoardGel, BoardRenderer, GelPiece } from "@/components/board-jelly-gel";

const VERTEX = `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
uniform vec3 uColor;
uniform float uSolid;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorld);
  vec3 normal = normalize(vNormal);
  float facing = abs(dot(normal, viewDir));
  float fresnel = pow(1.0 - facing, 1.85);
  vec3 lightDir = normalize(vec3(0.32, 0.86, 0.48));
  float wrap = dot(normal, lightDir) * 0.5 + 0.5;
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 48.0);
  float glint = pow(max(dot(normal, halfDir), 0.0), 160.0);
  vec3 jelly = uColor * (0.72 + wrap * 0.55) + spec * 0.85 + glint;
  vec3 ink = vec3(0.045, 0.045, 0.05) * (0.62 + wrap * 0.7) + spec * 0.42;
  vec3 color = mix(jelly, ink, uSolid);
  float alpha = mix(mix(0.16, 0.82, fresnel), mix(0.97, 1.0, fresnel), uSolid);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

type JellyKind = "sphere" | "cube" | "ring" | "head";

type Recipe = {
  kind: JellyKind;
  color: string;
  radius: number;
  fx: number;
  fy: number;
};

type Body = {
  kind: JellyKind;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  squash: number;
  squashV: number;
  asleep: boolean;
  hops: number;
  morph: number;
  head: THREE.BufferGeometry | null;
  homeHead: boolean;
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  gel: GelPiece | null;
};

const RECIPES: readonly Recipe[] = [
  { kind: "cube", color: "#ff159f", radius: 0.34, fx: 0.07, fy: 0.14 },
  { kind: "ring", color: "#ff8a3d", radius: 0.27, fx: 0.18, fy: 0.4 },
  { kind: "cube", color: "#ffc638", radius: 0.36, fx: 0.34, fy: 0.12 },
  { kind: "sphere", color: "#11e4b3", radius: 0.25, fx: 0.46, fy: 0.36 },
  { kind: "head", color: "#141414", radius: 0.5, fx: 0.24, fy: 0.34 },
  { kind: "ring", color: "#4d86ff", radius: 0.3, fx: 0.68, fy: 0.42 },
  { kind: "cube", color: "#b56bff", radius: 0.28, fx: 0.8, fy: 0.15 },
  { kind: "sphere", color: "#ff5aa5", radius: 0.18, fx: 0.91, fy: 0.32 },
  { kind: "ring", color: "#7ae0ff", radius: 0.16, fx: 0.96, fy: 0.14 },
];

function jellyMaterial(color: string, solid: number) {
  const tint = new THREE.Color(color);
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(tint.r, tint.g, tint.b) },
      uSolid: { value: solid },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
}

function shapeGeometry(kind: Exclude<JellyKind, "head">, radius: number) {
  switch (kind) {
    case "sphere":
      return new THREE.SphereGeometry(radius, 40, 28);
    case "cube":
      return new RoundedBoxGeometry(radius * 1.65, radius * 1.65, radius * 1.65, 5, radius * 0.42);
    case "ring":
      return new THREE.TorusGeometry(radius * 0.72, radius * 0.3, 20, 40);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

async function headGeometry(radius: number) {
  const install = window.installHeaderHead;
  const factory = window.__headerHeadGeometry;
  if (!install) {
    return null;
  }

  const ready = await install();
  const build = window.__headerHeadGeometry ?? factory;
  if (!ready || !build) {
    return null;
  }

  const geometry = build(THREE, {
    width: radius * 1.55,
    height: radius * 2.05,
    depth: radius * 1.55,
  });
  if (!(geometry instanceof THREE.BufferGeometry)) {
    return null;
  }

  geometry.computeVertexNormals();
  return geometry;
}

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(17, 17, 17, 0.22)");
  gradient.addColorStop(1, "rgba(17, 17, 17, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function separate(bodies: Body[]) {
  for (let pass = 0; pass < 8; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        if (!a || !b) {
          continue;
        }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const min = (a.radius + b.radius) * 0.96;
        if (dist >= min) {
          continue;
        }
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

export async function mountBoardJelly(canvas: HTMLCanvasElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let gel: BoardGel | null = null;
  try {
    // three/webgpu reads `self` at module scope, so it has to load in the browser.
    const module = await import("@/components/board-jelly-gel");
    gel = await module.createBoardGel(canvas);
  } catch (error) {
    console.warn("Soft-matter jelly unavailable", error);
  }

  let renderer: BoardRenderer;
  if (gel) {
    renderer = gel.renderer;
  } else {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return () => undefined;
    }
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(0, 0.1, 8.6);
  camera.lookAt(0, -0.2, 0);

  const shadowMap = shadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });

  const head = await headGeometry(0.5);
  const bodies: Body[] = RECIPES.map((recipe) => {
    const solid = recipe.kind === "head" ? 1 : 0;
    const geometry =
      recipe.kind === "head"
        ? (head ?? shapeGeometry("sphere", recipe.radius))
        : shapeGeometry(recipe.kind, recipe.radius);
    const gelPiece = gel
      ? recipe.kind === "head"
        ? gel.solid(recipe.color)
        : gel.piece(recipe.color, geometry)
      : null;
    const mesh = new THREE.Mesh(geometry, gelPiece?.material ?? jellyMaterial(recipe.color, solid));
    mesh.frustumCulled = false;
    scene.add(mesh);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), shadowMaterial.clone());
    shadow.position.z = -0.35;
    scene.add(shadow);

    return {
      kind: recipe.kind,
      radius: recipe.radius,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      spin: recipe.kind === "cube" ? recipe.fx * 4 : 0,
      squash: 0,
      squashV: 0,
      asleep: false,
      hops: 0,
      morph: 0,
      head: recipe.kind === "head" ? geometry : null,
      homeHead: recipe.kind === "head",
      mesh,
      shadow,
      gel: gelPiece,
    };
  });

  const hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();
  let frame = 0;
  let held: Body | null = null;
  let dragged = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerAt = 0;
  let pointerVx = 0;
  let pointerVy = 0;
  let downClientX = 0;
  let downClientY = 0;
  let halfW = 4;
  let floor = -1.6;
  let ceiling = 1.7;
  let placed = false;

  const planePoint = (ndcX: number, ndcY: number) => {
    const point = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    const dirZ = point.z - camera.position.z;
    const t = dirZ === 0 ? 0 : -camera.position.z / dirZ;
    return {
      x: (point.x - 0) * t,
      y: camera.position.y + (point.y - camera.position.y) * t,
    };
  };

  const view = () => {
    camera.updateMatrixWorld();
    const bottom = planePoint(0, -1);
    const top = planePoint(0, 1);
    const edge = planePoint(1, 0);
    floor = bottom.y;
    ceiling = top.y - 0.18;
    halfW = Math.abs(edge.x) - 0.12;
  };

  const place = () => {
    view();
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index];
      const recipe = RECIPES[index];
      if (!body || !recipe) {
        continue;
      }
      body.x = -halfW + recipe.fx * halfW * 2;
      body.y = floor + body.radius + recipe.fy * (ceiling - floor) * 0.62;
      body.vx = 0;
      body.vy = 0;
    }
    separate(bodies);
    placed = true;
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) {
      return;
    }
    const ratio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    gel?.resize(width, height, ratio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    view();
    if (!placed) {
      place();
    }
  };

  const project = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(plane, hit);
  };

  const pick = (x: number, y: number) => {
    let best: Body | null = null;
    let bestDist = Infinity;
    for (const body of bodies) {
      const dist = Math.hypot(body.x - x, body.y - y);
      if (dist < body.radius * 1.28 && dist < bestDist) {
        best = body;
        bestDist = dist;
      }
    }
    return best;
  };

  const nextKind = (body: Body): JellyKind => {
    switch (body.kind) {
      case "head":
        return "sphere";
      case "sphere":
        return "cube";
      case "cube":
        return "ring";
      case "ring":
        return body.homeHead ? "head" : "sphere";
      default: {
        const unreachable: never = body.kind;
        return unreachable;
      }
    }
  };

  const adopt = (body: Body, kind: JellyKind) => {
    const previous = body.mesh.geometry;
    const material = body.mesh.material;
    if (Array.isArray(material)) {
      return;
    }
    const geometry = kind === "head" ? (body.head ?? shapeGeometry("sphere", body.radius)) : shapeGeometry(kind, body.radius);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.position.set(body.mesh.position.x, body.mesh.position.y, body.mesh.position.z);
    mesh.rotation.set(body.mesh.rotation.x, body.mesh.rotation.y, body.mesh.rotation.z);
    mesh.scale.set(body.mesh.scale.x, body.mesh.scale.y, body.mesh.scale.z);
    scene.remove(body.mesh);
    scene.add(mesh);
    body.mesh = mesh;
    body.gel?.retarget(geometry);
    body.kind = kind;
    if (previous !== geometry && previous !== body.head) {
      previous.dispose();
    }
  };

  const launch = (body: Body) => {
    const direction = Math.random() < 0.5 ? -1 : 1;
    body.asleep = false;
    body.hops = 1.05;
    body.morph = 0;
    body.vx = direction * (2.4 + Math.random() * 1.6);
    body.vy = 4.6 + Math.random() * 1.1;
    body.spin += direction * (1.4 + Math.random());
    body.squashV = -1.1;
  };

  const onDown = (event: PointerEvent) => {
    if (reduce || !project(event)) {
      return;
    }
    const body = pick(hit.x, hit.y);
    if (!body) {
      return;
    }
    held = body;
    dragged = false;
    body.asleep = false;
    pointerX = hit.x;
    pointerY = hit.y;
    pointerAt = performance.now();
    pointerVx = 0;
    pointerVy = 0;
    downClientX = event.clientX;
    downClientY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const onMove = (event: PointerEvent) => {
    if (!held || !project(event)) {
      return;
    }
    if (Math.hypot(event.clientX - downClientX, event.clientY - downClientY) > 8) {
      dragged = true;
    }
    const now = performance.now();
    const dt = Math.max(0.008, (now - pointerAt) / 1000);
    pointerAt = now;
    pointerVx = (hit.x - pointerX) / dt;
    pointerVy = (hit.y - pointerY) / dt;
    pointerX = hit.x;
    pointerY = hit.y;
  };

  const release = () => {
    if (!held) {
      return;
    }
    if (!dragged) {
      launch(held);
    } else {
      const speed = Math.hypot(pointerVx, pointerVy);
      const max = 11;
      const scale = speed > max ? max / speed : 1;
      held.vx = pointerVx * scale;
      held.vy = pointerVy * scale;
      held.hops = 0;
      held.morph = 0;
    }
    held = null;
    canvas.style.cursor = "";
  };

  const collide = () => {
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      if (!a) {
        continue;
      }
      const limit = halfW - a.radius;
      if (a.x < -limit) {
        a.x = -limit;
        if (!a.asleep) {
          a.vx = Math.abs(a.vx) * 0.62;
        }
      } else if (a.x > limit) {
        a.x = limit;
        if (!a.asleep) {
          a.vx = -Math.abs(a.vx) * 0.62;
        }
      }
      const bottom = floor + a.radius;
      const top = ceiling - a.radius;
      if (a.asleep) {
        a.y = Math.max(a.y, bottom);
      } else if (a.y < bottom) {
        const impact = Math.max(0, -a.vy);
        a.y = bottom;
        if (a.hops > 0 && impact > 0.35) {
          a.vy = impact * 0.62;
          a.vx *= 0.96;
          a.squashV -= impact * 2.2;
        } else {
          a.vy = 0;
          a.vx *= 0.45;
          if (Math.abs(a.vx) < 0.18) {
            a.vx = 0;
          }
          if (impact > 0.9) {
            a.squashV -= impact * 1.5;
          }
        }
      } else if (a.y > top) {
        a.y = top;
        a.vy = -Math.abs(a.vy) * 0.45;
      }

      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        if (!b) {
          continue;
        }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const min = (a.radius + b.radius) * 0.94;
        if (dist >= min) {
          continue;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = min - dist;
        if (a.asleep && b.asleep) {
          continue;
        }
        const shove = (mover: Body, amount: number) => {
          if (mover === held || mover.asleep) {
            return;
          }
          mover.x += nx * amount;
          mover.y += ny * amount;
        };
        if (a.asleep) {
          shove(b, overlap);
          if (b !== held && b.hops === 0 && b.vy * ny < 0) {
            b.vy = 0;
            b.vx *= 0.4;
          }
        } else if (b.asleep) {
          shove(a, -overlap);
          if (a !== held && a.hops === 0 && a.vy * ny > 0) {
            a.vy = 0;
            a.vx *= 0.4;
          }
        } else {
          shove(a, -overlap * 0.5);
          shove(b, overlap * 0.5);
        }
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel >= 0 || a.hops + b.hops === 0) {
          continue;
        }
        const impulse = -(1.05 * rel) / 2;
        if (!a.asleep && a !== held) {
          a.vx -= impulse * nx * (b.asleep ? 2 : 1);
          a.vy -= impulse * ny * (b.asleep ? 2 : 1);
          a.spin += impulse * 0.2;
          a.squash = Math.min(a.squash, -Math.min(0.28, overlap * 1.4));
        }
        if (!b.asleep && b !== held) {
          b.vx += impulse * nx * (a.asleep ? 2 : 1);
          b.vy += impulse * ny * (a.asleep ? 2 : 1);
          b.spin -= impulse * 0.2;
          b.squash = Math.min(b.squash, -Math.min(0.28, overlap * 1.4));
        }
      }
    }
  };

  const deform = (body: Body) => {
    const speed = body.asleep ? 0 : Math.hypot(body.vx, body.vy);
    const stretch = Math.min(0.48, speed * 0.07);
    let compress = body.asleep ? 0 : body.squash;
    if (body.morph > 0) {
      compress -= Math.sin((1 - body.morph / 0.56) * Math.PI) * 0.62;
    }
    const sy = Math.max(0.28, 1 + compress - stretch * 0.85);
    const sx = Math.max(0.42, 1 - compress * 0.72 + stretch * 1.15);
    const sz = Math.max(0.46, 1 - compress * 0.28);
    const jelly = body.kind === "head" ? 0.6 : 1;
    return {
      sx: 1 + (sx - 1) * jelly,
      sy: 1 + (sy - 1) * jelly,
      sz: 1 + (sz - 1) * jelly,
    };
  };

  const yReach = (rx: number, ry: number, rz: number, hx: number, hy: number, hz: number) => {
    const a = Math.cos(rx);
    const b = Math.sin(rx);
    const c = Math.cos(ry);
    const d = Math.sin(ry);
    const e = Math.cos(rz);
    const f = Math.sin(rz);
    return hx * Math.abs(a * f + b * d * e) + hy * Math.abs(a * e - b * d * f) + hz * Math.abs(b * c);
  };

  const footOf = (body: Body) => {
    const span = body.radius;
    switch (body.kind) {
      case "sphere":
        return span;
      case "cube": {
        const half = span * 0.78;
        return yReach(0.42, 0.55, body.spin, half, half, half);
      }
      case "ring": {
        const outer = span * 0.96;
        return yReach(0.15, body.spin * 0.25, 0, outer, outer, span * 0.28);
      }
      case "head":
        return yReach(0.12, 0.85, body.spin * 0.15, span * 0.78, span * 1.02, span * 0.78);
      default: {
        const unreachable: never = body.kind;
        return unreachable;
      }
    }
  };

  const render = () => {
    for (const body of bodies) {
      const { sx, sy, sz } = deform(body);
      const moving = Math.hypot(body.vx, body.vy) > 0.4;
      const tilt = body.kind === "head" || !moving ? 0 : Math.atan2(body.vy, body.vx);
      if (body.kind === "head") {
        body.mesh.rotation.set(0.12, 0.85, body.spin * 0.15);
      } else if (body.kind === "cube") {
        body.mesh.rotation.set(0.42, 0.55, body.spin);
      } else {
        body.mesh.rotation.set(0.15, body.spin * 0.25, tilt * 0.35);
      }
      body.mesh.scale.set(sx, sy, sz);
      body.mesh.position.set(body.x, body.y - body.radius + footOf(body) * sy, 0);
      body.gel?.sync(body.mesh);
      const lift = (body.y - (floor + body.radius)) / 2.4;
      body.shadow.position.set(body.x, floor + 0.02, -0.4);
      body.shadow.scale.set(body.radius * (1.35 - lift * 0.4), body.radius * 0.42, 1);
      const material = body.shadow.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.max(0.04, 0.9 - lift);
      }
    }
    camera.updateMatrixWorld();
    gel?.render(camera);
    renderer.render(scene, camera);
  };

  const settle = (body: Body) => {
    if (body === held || body.hops > 0 || body.morph > 0) {
      body.asleep = false;
      return;
    }
    const speed = Math.hypot(body.vx, body.vy);
    const grounded = body.y <= floor + body.radius + 0.03;
    const reach = body.asleep ? 1.25 : 1.06;
    let supported = grounded;
    if (!supported) {
      for (const other of bodies) {
        if (other === body || other.y > body.y + 0.02) {
          continue;
        }
        const dist = Math.hypot(other.x - body.x, other.y - body.y);
        if (dist < (body.radius + other.radius) * reach) {
          supported = true;
          break;
        }
      }
    }
    let crowded = false;
    for (const other of bodies) {
      if (other === body) {
        continue;
      }
      const dist = Math.hypot(other.x - body.x, other.y - body.y);
      if (dist < (body.radius + other.radius) * 0.9) {
        crowded = true;
        break;
      }
    }
    if (!supported || crowded || speed > 0.16 || Math.abs(body.squash) > 0.02) {
      body.asleep = false;
      return;
    }
    if (grounded) {
      body.y = floor + body.radius;
    }
    body.vx = 0;
    body.vy = 0;
    body.squash = 0;
    body.squashV = 0;
    body.asleep = true;
  };

  const step = (dt: number) => {
    for (const body of bodies) {
      if (body.asleep && body !== held) {
        continue;
      }
      if (body === held && dragged) {
        const dx = pointerX - body.x;
        const dy = pointerY - body.y;
        body.vx += dx * 36 * dt;
        body.vy += dy * 36 * dt;
        body.vx *= 0.78;
        body.vy *= 0.78;
      } else if (body !== held) {
        body.vy -= 7.4 * dt;
        body.vx *= 0.992;
        body.vy *= 0.992;
      }
      if (body.hops > 0) {
        body.hops = Math.max(0, body.hops - dt);
        if (body.hops === 0) {
          body.morph = 0.56;
          body.vy = Math.min(body.vy, 1.4);
        }
      }
      if (body.morph > 0) {
        const before = body.morph;
        body.morph = Math.max(0, body.morph - dt);
        body.vx *= 0.9;
        if (before > 0.28 && body.morph <= 0.28) {
          adopt(body, nextKind(body));
        }
      }
      body.squashV += (-90 * body.squash - 19 * body.squashV) * dt;
      body.squash += body.squashV * dt;
      if (Math.abs(body.squash) < 0.008 && Math.abs(body.squashV) < 0.05) {
        body.squash = 0;
        body.squashV = 0;
      } else {
        body.squash = Math.max(-0.48, Math.min(0.22, body.squash));
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      if (!body.asleep && Math.abs(body.vx) > 0.2) {
        body.spin += body.vx * dt * 0.18;
      }
    }
    collide();
    for (const body of bodies) {
      settle(body);
    }
  };

  const tick = () => {
    frame = window.requestAnimationFrame(tick);
    if (document.hidden) {
      return;
    }
    const dt = Math.min(0.033, clock.getDelta());
    if (!reduce) {
      step(dt);
    }
    render();
  };

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  tick();

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", release);
    canvas.removeEventListener("pointercancel", release);
    shadowMap.dispose();
    shadowMaterial.dispose();
    for (const body of bodies) {
      if (!body.gel && body.mesh.material instanceof THREE.Material) {
        body.mesh.material.dispose();
      }
      const current = body.mesh.geometry;
      current.dispose();
      if (body.head && body.head !== current) {
        body.head.dispose();
      }
      body.shadow.geometry.dispose();
      if (body.shadow.material instanceof THREE.Material) {
        body.shadow.material.dispose();
      }
    }
    if (gel) {
      gel.dispose();
    } else {
      renderer.dispose();
    }
  };
}
