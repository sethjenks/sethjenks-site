import type { Collider, RigidBody } from "@dimforge/rapier3d-compat";
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
  vec3 lightDir = normalize(vec3(0.32, 0.86, 0.48));
  float wrap = dot(normal, lightDir) * 0.5 + 0.5;
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 28.0);
  vec3 jelly = mix(uColor * (0.9 + wrap * 0.14) + spec * 0.12, uColor, 0.78);
  vec3 ink = vec3(0.07, 0.075, 0.085) * (0.84 + wrap * 0.2) + spec * 0.08;
  vec3 color = mix(jelly, ink, uSolid);
  float alpha = mix(0.92, 1.0, uSolid);
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
  squash: number;
  squashV: number;
  hops: number;
  morph: number;
  head: THREE.BufferGeometry | null;
  homeHead: boolean;
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  gel: GelPiece | null;
  rigid: RigidBody;
  collider: Collider;
};

const RECIPES: readonly Recipe[] = [
  { kind: "cube", color: "#c3d4e8", radius: 0.34, fx: 0.07, fy: 0.14 },
  { kind: "ring", color: "#a9c0d8", radius: 0.27, fx: 0.18, fy: 0.4 },
  { kind: "cube", color: "#d0dce8", radius: 0.36, fx: 0.34, fy: 0.12 },
  { kind: "sphere", color: "#8eabca", radius: 0.25, fx: 0.46, fy: 0.36 },
  { kind: "head", color: "#16181c", radius: 0.5, fx: 0.24, fy: 0.34 },
  { kind: "ring", color: "#b4c8de", radius: 0.3, fx: 0.68, fy: 0.42 },
  { kind: "cube", color: "#97b0cb", radius: 0.28, fx: 0.8, fy: 0.15 },
  { kind: "sphere", color: "#c9d6e6", radius: 0.18, fx: 0.91, fy: 0.32 },
  { kind: "ring", color: "#7d9dbd", radius: 0.16, fx: 0.96, fy: 0.14 },
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
  gradient.addColorStop(0, "rgba(17, 17, 17, 0.12)");
  gradient.addColorStop(1, "rgba(17, 17, 17, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function reachOf(body: Body) {
  switch (body.kind) {
    case "sphere":
      return body.radius;
    case "cube":
      return body.radius * 1.05;
    case "ring":
      return body.radius * 1.15;
    case "head":
      return body.radius * 1.2;
    default: {
      const unreachable: never = body.kind;
      return unreachable;
    }
  }
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
        const min = (reachOf(a) + reachOf(b)) * 0.96;
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
  const [gel, rapier] = await Promise.all([
    (async () => {
      try {
        // three/webgpu reads `self` at module scope, so it has to load in the browser.
        const module = await import("@/components/board-jelly-gel");
        return await module.createBoardGel(canvas);
      } catch (error) {
        console.warn("Soft-matter jelly unavailable", error);
        return null;
      }
    })(),
    (async () => {
      // Rapier's wasm build initializes in the browser, after the server render.
      const module = await import("@dimforge/rapier3d-compat");
      await module.default.init();
      return module.default;
    })(),
  ]);

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

  const world = new rapier.World({ x: 0, y: -13, z: 0 });
  world.timestep = 1 / 60;
  world.numSolverIterations = 10;
  const events = new rapier.EventQueue(true);
  const colliders = new Map<number, Body>();
  const REST = { x: 0, y: 0, z: 0, w: 1 };
  const DEPTH = 0.58;

  const fixedBox = (hx: number, hy: number, hz: number) => {
    const wall = world.createRigidBody(rapier.RigidBodyDesc.fixed());
    world.createCollider(
      rapier.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.9).setRestitution(0.42),
      wall,
    );
    return wall;
  };
  const floorBody = fixedBox(30, 0.5, 3);
  const ceilingBody = fixedBox(30, 0.5, 3);
  const leftBody = fixedBox(0.5, 30, 3);
  const rightBody = fixedBox(0.5, 30, 3);

  const dress = (desc: ReturnType<typeof rapier.ColliderDesc.ball>) =>
    desc
      .setFriction(0.68)
      .setRestitution(0.46)
      .setDensity(1.35)
      .setActiveEvents(rapier.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(6);

  const hullFrom = (geometry: THREE.BufferGeometry, depth: number) => {
    const attr = geometry.getAttribute("position");
    if (!attr || attr.count < 4) {
      return null;
    }
    const stride = Math.max(1, Math.ceil(attr.count / 420));
    const count = Math.ceil(attr.count / stride);
    const points = new Float32Array(count * 3);
    let write = 0;
    for (let index = 0; index < attr.count; index += stride) {
      points[write] = attr.getX(index);
      points[write + 1] = attr.getY(index);
      points[write + 2] = attr.getZ(index) * depth;
      write += 3;
    }
    return rapier.ColliderDesc.convexHull(points);
  };

  const descriptor = (kind: JellyKind, radius: number, geometry: THREE.BufferGeometry) => {
    switch (kind) {
      case "sphere":
        return dress(hullFrom(geometry, DEPTH) ?? rapier.ColliderDesc.ball(radius));
      case "cube": {
        const half = radius * 0.825;
        const depth = half * DEPTH;
        const border = Math.min(radius * 0.16, half * 0.4, depth * 0.4);
        return dress(
          rapier.ColliderDesc.roundCuboid(half - border, half - border, Math.max(0.04, depth - border), border),
        );
      }
      case "head": {
        const hull = hullFrom(geometry, 1);
        return dress(hull ?? rapier.ColliderDesc.capsule(radius * 0.62, radius * 0.38));
      }
      case "ring": {
        const major = radius * 0.72;
        const tube = radius * 0.3;
        const count = 12;
        const shapes = [];
        const positions = [];
        const rotations = [];
        for (let index = 0; index < count; index += 1) {
          const angle = (index / count) * Math.PI * 2;
          shapes.push(new rapier.Ball(tube));
          positions.push({ x: Math.cos(angle) * major, y: Math.sin(angle) * major, z: 0 });
          rotations.push(REST);
        }
        return dress(rapier.ColliderDesc.compound(shapes, positions, rotations));
      }
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
  };

  const restRotation = (kind: JellyKind, spin: number) => {
    let rx = 0;
    let ry = 0;
    let rz = spin;
    switch (kind) {
      case "cube":
        rx = 0.42;
        ry = 0.55;
        break;
      case "ring":
        rx = 0.25;
        ry = 0.1;
        break;
      case "sphere":
        break;
      case "head":
        rx = 0.12;
        ry = 0.85;
        rz = spin * 0.15;
        break;
      default: {
        const unreachable: never = kind;
        return unreachable;
      }
    }
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    return { x: turn.x, y: turn.y, z: turn.z, w: turn.w };
  };

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

  const bind = (rigid: RigidBody, kind: JellyKind, radius: number, geometry: THREE.BufferGeometry, previous?: Collider) => {
    if (previous) {
      colliders.delete(previous.handle);
      world.removeCollider(previous, true);
    }
    const collider = world.createCollider(descriptor(kind, radius, geometry), rigid);
    rigid.recomputeMassPropertiesFromColliders();
    return collider;
  };

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

    const spin = recipe.kind === "cube" ? recipe.fx * 4 : 0;
    const rigid = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(0, 0, 0)
        .setRotation(restRotation(recipe.kind, spin))
        .enabledTranslations(true, true, false)
        .setLinearDamping(0.12)
        .setAngularDamping(0.28)
        .setCcdEnabled(true)
        .setCanSleep(true),
    );
    const collider = bind(rigid, recipe.kind, recipe.radius, geometry);
    const body: Body = {
      kind: recipe.kind,
      radius: recipe.radius,
      x: 0,
      y: 0,
      squash: 0,
      squashV: 0,
      hops: 0,
      morph: 0,
      head: recipe.kind === "head" ? geometry : null,
      homeHead: recipe.kind === "head",
      mesh,
      shadow,
      gel: gelPiece,
      rigid,
      collider,
    };
    colliders.set(collider.handle, body);
    return body;
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
    const mid = (floor + ceiling) / 2;
    floorBody.setTranslation({ x: 0, y: floor - 0.5, z: 0 }, false);
    ceilingBody.setTranslation({ x: 0, y: ceiling + 0.5, z: 0 }, false);
    leftBody.setTranslation({ x: -halfW - 0.5, y: mid, z: 0 }, false);
    rightBody.setTranslation({ x: halfW + 0.5, y: mid, z: 0 }, false);
    for (const body of bodies) {
      body.rigid.wakeUp();
    }
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
      body.y = floor + reachOf(body) + recipe.fy * (ceiling - floor) * 0.62;
      body.squash = 0;
      body.squashV = 0;
      body.hops = 0;
      body.morph = 0;
    }
    separate(bodies);
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index];
      const recipe = RECIPES[index];
      if (!body || !recipe) {
        continue;
      }
      const spin = recipe.kind === "cube" ? recipe.fx * 4 : 0;
      body.rigid.setTranslation({ x: body.x, y: body.y, z: 0 }, true);
      body.rigid.setRotation(restRotation(recipe.kind, spin), true);
      body.rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.rigid.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
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
      if (dist < reachOf(body) * 1.25 && dist < bestDist) {
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
    mesh.position.copy(body.mesh.position);
    mesh.quaternion.copy(body.mesh.quaternion);
    mesh.scale.copy(body.mesh.scale);
    scene.remove(body.mesh);
    scene.add(mesh);
    body.mesh = mesh;
    body.gel?.retarget(geometry);
    body.kind = kind;
    body.collider = bind(body.rigid, kind, body.radius, geometry, body.collider);
    colliders.set(body.collider.handle, body);
    if (previous !== geometry && previous !== body.head) {
      previous.dispose();
    }
  };

  const launch = (body: Body) => {
    const direction = Math.random() < 0.5 ? -1 : 1;
    body.hops = 1.05;
    body.morph = 0;
    body.rigid.wakeUp();
    body.rigid.setLinvel(
      {
        x: direction * (3.4 + Math.random() * 1.6),
        y: 8.2 + Math.random() * 1.2,
        z: 0,
      },
      true,
    );
    body.rigid.setAngvel(
      {
        x: direction * (1.6 + Math.random()),
        y: (Math.random() - 0.5) * 1.8,
        z: direction * (2.4 + Math.random() * 2),
      },
      true,
    );
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
    body.rigid.wakeUp();
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
      if (!dragged) {
        held.rigid.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      }
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
      const max = 14;
      const scale = speed > max ? max / speed : 1;
      held.rigid.setBodyType(rapier.RigidBodyType.Dynamic, true);
      held.rigid.setLinvel({ x: pointerVx * scale, y: pointerVy * scale, z: 0 }, true);
      held.rigid.setAngvel({ x: 0, y: 0, z: pointerVx * 0.12 }, true);
      held.hops = 0;
      held.morph = 0;
    }
    held = null;
    canvas.style.cursor = "";
  };

  let leftover = 0;

  const deform = (body: Body) => {
    const vel = body.rigid.linvel();
    const speed = Math.hypot(vel.x, vel.y);
    const stretch = Math.min(0.14, speed * 0.012);
    let compress = body.squash;
    if (body.morph > 0) {
      compress -= Math.sin((1 - body.morph / 0.56) * Math.PI) * 0.34;
    }
    const sy = Math.max(0.7, 1 + compress * 0.5 - stretch);
    const sx = Math.max(0.7, 1 - compress * 0.38 + stretch);
    const depth = body.kind === "head" ? 1 : DEPTH;
    const sz = depth * Math.max(0.78, 1 - compress * 0.16);
    return { sx, sy, sz };
  };

  const render = () => {
    for (const body of bodies) {
      const pos = body.rigid.translation();
      const rot = body.rigid.rotation();
      body.x = pos.x;
      body.y = pos.y;
      body.mesh.position.set(pos.x, pos.y, 0);
      body.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      const { sx, sy, sz } = deform(body);
      body.mesh.scale.set(sx, sy, sz);
      body.gel?.sync(body.mesh);
      const lift = Math.max(0, body.y - floor - reachOf(body)) / 2.2;
      body.shadow.position.set(body.x, floor + 0.02, -0.4);
      body.shadow.scale.set(body.radius * (1.35 - Math.min(0.5, lift) * 0.4), body.radius * 0.42, 1);
      const material = body.shadow.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = Math.max(0.04, 0.85 - lift * 0.35);
      }
    }
    camera.updateMatrixWorld();
    gel?.render(camera);
    renderer.render(scene, camera);
  };

  const bump = (handle: number, hit: number) => {
    const body = colliders.get(handle);
    if (!body || body === held) {
      return;
    }
    body.squashV -= hit * 8;
  };

  const step = (dt: number) => {
    for (const body of bodies) {
      if (body.hops > 0) {
        body.hops = Math.max(0, body.hops - dt);
        if (body.hops === 0) {
          body.morph = 0.56;
          const vel = body.rigid.linvel();
          body.rigid.setLinvel({ x: vel.x * 0.85, y: Math.min(vel.y, 1.8), z: 0 }, true);
        }
      }
      if (body.morph > 0) {
        const before = body.morph;
        body.morph = Math.max(0, body.morph - dt);
        if (before > 0.28 && body.morph <= 0.28) {
          adopt(body, nextKind(body));
        }
      }
      body.squashV += (-70 * body.squash - 16 * body.squashV) * dt;
      body.squash += body.squashV * dt;
      if (Math.abs(body.squash) < 0.008 && Math.abs(body.squashV) < 0.05) {
        body.squash = 0;
        body.squashV = 0;
      } else {
        body.squash = Math.max(-0.42, Math.min(0.18, body.squash));
      }
    }
    leftover = Math.min(0.1, leftover + dt);
    let substeps = 0;
    while (leftover >= world.timestep && substeps < 4) {
      if (held && dragged) {
        held.rigid.setNextKinematicTranslation({ x: pointerX, y: pointerY, z: 0 });
        held.rigid.setNextKinematicRotation(held.rigid.rotation());
      }
      world.step(events);
      events.drainContactForceEvents((event) => {
        const hit = Math.min(0.4, event.maxForceMagnitude() / 64);
        bump(event.collider1(), hit);
        bump(event.collider2(), hit);
      });
      leftover -= world.timestep;
      substeps += 1;
    }
  };


  const tick = () => {
    frame = window.requestAnimationFrame(tick);
    if (document.hidden) {
      clock.getDelta();
      return;
    }
    const dt = Math.min(0.033, clock.getDelta());
    if (!reduce && placed) {
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
    events.free();
    world.free();
  };
}
