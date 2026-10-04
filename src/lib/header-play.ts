export const COMPACT_HEADER_PX = 86;
export const COMPACT_Y_MAX = 3.6;
export const COMPACT_CAM_Y = 1.35;
export const COMPACT_CAM_LIFT = 1.2;
export const COMPACT_CAM_Z = 3.45;
export const COMPACT_LOOK_Y = 1.05;
export const COMPACT_HOME_MS = 5000;
export const PLAY_HOME_MS = 5000;
export const HOME_RETURN_MS = 2000;
export const HEAD_REST_Y = 1.2;
export const HEAD_TOP_OFFSET = 1.2;
export const HEAD_TOP_INSET_PX = 24;
export const HEAD_WORLD_H = 2.4;
export const HEAD_TEXT_GAP_PX = 16;
export const HOME_ENTER_SHIFT = 6;
export const HOME_EASE_IN = [0.895, 0.03, 0.685, 0.22] as const;
const HOME_FOV = 10;
const VERTICAL_FOV = (HOME_FOV * Math.PI) / 180;
const FLOOR_INSET_PX = 20;

export type HeaderPlayConfig = {
  yMin: number;
  yMax: number;
  lift: number;
  lookY: number;
  camY: number;
  camLift: number;
  camZ: number;
  homeMs: number;
  textTop?: number;
};

export type SoftBodyLift = {
  count: number;
  floor?: number;
  rest: Float64Array | number[];
  positions: Float64Array | number[];
  previous: Float64Array | number[];
  homeAt?: number;
  homeFrom?: Float64Array | number[] | null;
  spinUntil?: number;
  spinStart?: number;
  velocities?: Float64Array | number[];
  grabNodes?: unknown[];
  __playLift?: number;
};

export type HeaderCamera = {
  position: { set: (x: number, y: number, z: number) => void };
  lookAt: (x: number, y: number, z: number) => void;
  updateProjectionMatrix: () => void;
  updateMatrixWorld?: () => void;
  fov?: number;
  far?: number;
};

export function compactHeaderPlay(homeMs = COMPACT_HOME_MS): HeaderPlayConfig {
  return {
    yMin: 0.08,
    yMax: COMPACT_Y_MAX,
    lift: 0,
    lookY: COMPACT_LOOK_Y,
    camY: COMPACT_CAM_Y,
    camLift: COMPACT_CAM_LIFT,
    camZ: COMPACT_CAM_Z,
    homeMs,
  };
}

export function headerPlayForHeight(
  height: number,
  width = 1280,
  textTop = COMPACT_HEADER_PX + 32,
): HeaderPlayConfig {
  const headPx = homeHeadPixels(width, textTop);
  const visibleH = (HEAD_WORLD_H * Math.max(height, 1)) / headPx;
  const camZ = visibleH / (2 * Math.tan(VERTICAL_FOV / 2));
  const topNdc = 1 - (2 * HEAD_TOP_INSET_PX) / Math.max(height, 1);
  const lookY = HEAD_REST_Y + HEAD_TOP_OFFSET - topNdc * (visibleH / 2);
  return {
    yMin: lookY - visibleH / 2 + 0.2,
    yMax: Math.max(COMPACT_Y_MAX, lookY + visibleH / 2 - 0.2),
    lift: 0,
    lookY,
    camY: COMPACT_CAM_Y,
    camLift: COMPACT_CAM_LIFT,
    camZ,
    homeMs: PLAY_HOME_MS,
    textTop,
  };
}

function homeHeadPixels(width: number, textTop: number) {
  const fromText = Math.max(36, textTop - HEAD_TOP_INSET_PX - HEAD_TEXT_GAP_PX);
  const fromWidth = width < 480 ? 48 : width < 720 ? 60 : width < 960 ? 72 : 88;
  return Math.min(fromText, fromWidth);
}

export function applyHeaderPlay(play: HeaderPlayConfig) {
  window.__headerPlay = play;
}

export function applySoftBodyLift(body: SoftBodyLift | null | undefined, lift: number) {
  if (!body) {
    return;
  }

  const current = body.__playLift ?? 0;
  const delta = lift - current;
  if (Math.abs(delta) < 1e-6) {
    return;
  }

  for (let index = 0; index < body.count; index += 1) {
    const y = index * 3 + 1;
    body.rest[y] += delta;
    body.positions[y] += delta;
    body.previous[y] += delta;
  }

  body.__playLift = lift;
}

export function applyHeaderCamera(
  camera: HeaderCamera | null | undefined,
  play: HeaderPlayConfig,
  aspect = 1,
) {
  if (!camera) {
    return;
  }

  const scale = Math.max(1, 1.05 / Math.max(0.3, aspect));
  const shift = window.__headerEnterShift ?? 0;
  const home = play.camZ > COMPACT_CAM_Z + 0.01;
  if (camera.fov != null) {
    camera.fov = home ? HOME_FOV : 35;
  }
  const eyeZ = play.camZ * scale;
  camera.position.set(
    1.55 * scale,
    home ? play.lookY - shift : play.camY * scale + play.camLift - shift,
    eyeZ,
  );
  camera.lookAt(0, play.lookY - shift, 0);
  camera.far = Math.max(120, eyeZ + 48);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld?.();
}

export function pinSoftBodyRest(body: SoftBodyLift | null | undefined) {
  if (!body) {
    return;
  }

  for (let index = 0; index < body.count * 3; index += 1) {
    body.positions[index] = body.rest[index];
    body.previous[index] = body.rest[index];
    if (body.velocities) {
      body.velocities[index] = 0;
    }
  }
}

export function snapshotSoftBody(body: SoftBodyLift) {
  return Float64Array.from(body.positions);
}

export function applySoftBodyHome(body: SoftBodyLift, from: ArrayLike<number>, t: number) {
  for (let index = 0; index < body.count * 3; index += 1) {
    body.positions[index] = from[index] + (body.rest[index] - from[index]) * t;
    body.previous[index] = body.positions[index];
    if (body.velocities) {
      body.velocities[index] = 0;
    }
  }
}

export function seatSoftBodyOnFloor(body: SoftBodyLift | null | undefined) {
  if (!body) {
    return;
  }

  let restX = 0;
  let restZ = 0;
  let liveX = 0;
  let liveZ = 0;
  for (let index = 0; index < body.count; index += 1) {
    const x = index * 3;
    restX += body.rest[x];
    restZ += body.rest[x + 2];
    liveX += body.positions[x];
    liveZ += body.positions[x + 2];
  }
  const count = Math.max(1, body.count);
  const shiftX = liveX / count - restX / count;
  const shiftZ = liveZ / count - restZ / count;

  for (let index = 0; index < body.count; index += 1) {
    const x = index * 3;
    body.positions[x] = body.rest[x] + shiftX;
    body.positions[x + 1] = body.rest[x + 1];
    body.positions[x + 2] = body.rest[x + 2] + shiftZ;
    body.previous[x] = body.positions[x];
    body.previous[x + 1] = body.positions[x + 1];
    body.previous[x + 2] = body.positions[x + 2];
    if (body.velocities) {
      body.velocities[x] = 0;
      body.velocities[x + 1] = 0;
      body.velocities[x + 2] = 0;
    }
  }
}

export function headerStageCanvas(handle?: HeaderSoftHandle | null) {
  return (
    handle?.ctx?.canvas ??
    document
      .querySelector(".soft-matter-stage")
      ?.shadowRoot?.querySelector<HTMLCanvasElement>("canvas") ??
    document.querySelector<HTMLCanvasElement>(".soft-matter-stage canvas")
  );
}

export function holdSoftBody(body: SoftBodyLift | null | undefined) {
  if (!body) {
    return;
  }

  body.homeAt = performance.now();
}

export function syncSoftBody(play: HeaderPlayConfig) {
  const body = window.__headerSoftBody;
  if (!body) {
    return false;
  }

  applySoftBodyLift(body, 0);

  const handle = window.__headerSoftHandle;
  const canvas = headerStageCanvas(handle);
  const rect = canvas?.getBoundingClientRect();
  if (!rect?.height) {
    applySoftBodySupport(body, play);
    return true;
  }

  const width = rect.width || window.innerWidth;
  const height = rect.height;
  const aspect = width / Math.max(1, height);
  const enterShift = window.__headerEnterShift ?? 0;
  window.__headerEnterShift = 0;
  applyHeaderCamera(handle?.ctx?.camera, play, aspect);
  if (play.camZ > COMPACT_CAM_Z + 0.01 && height >= 32) {
    const topY = restTopY(body);
    const bottomY = restBottomY(body);
    const canvasPageTop = rect.top + window.scrollY;
    frameHeadTop(handle?.ctx?.camera, play, width, height, topY, canvasPageTop);
    fitHeadAboveText(
      handle?.ctx?.camera,
      play,
      width,
      height,
      topY,
      bottomY,
      canvasPageTop,
    );
    fitPlayfieldFloor(handle?.ctx?.camera, play, width, height, bottomY);
  }
  window.__headerEnterShift = enterShift;
  if (enterShift) {
    applyHeaderCamera(handle?.ctx?.camera, play, aspect);
  }
  applySoftBodySupport(body, play);
  return true;
}

function applySoftBodySupport(body: SoftBodyLift, play: HeaderPlayConfig) {
  const entering =
    window.__headerEntering === true ||
    Math.abs(window.__headerEnterShift ?? 0) > 0.01;
  body.floor = play.yMin;
  if (entering) {
    pinSoftBodyRest(body);
  }
}

function restTopY(body: SoftBodyLift) {
  let top = HEAD_REST_Y + HEAD_TOP_OFFSET;
  for (let index = 0; index < body.count; index += 1) {
    top = Math.max(top, body.rest[index * 3 + 1]);
  }
  return top;
}

function restBottomY(body: SoftBodyLift) {
  let bottom = HEAD_REST_Y;
  for (let index = 0; index < body.count; index += 1) {
    bottom = Math.min(bottom, body.rest[index * 3 + 1]);
  }
  return bottom;
}

function frameHeadTop(
  camera: HeaderProjectCamera | null | undefined,
  play: HeaderPlayConfig,
  width: number,
  height: number,
  topY: number,
  canvasTop: number,
) {
  if (!camera?.position.clone) {
    return;
  }

  const aspect = width / Math.max(1, height);
  const target = HEAD_TOP_INSET_PX - canvasTop;
  const fov = ((camera.fov ?? 35) * Math.PI) / 180;
  const worldPerPx = (2 * play.camZ * Math.tan(fov / 2)) / height;

  for (let step = 0; step < 6; step += 1) {
    applyHeaderCamera(camera, play, aspect);
    const projected = camera.position.clone().set(0, topY, 0).project(camera);
    const screenY = (-projected.y * 0.5 + 0.5) * height;
    const deltaPx = target - screenY;
    if (!Number.isFinite(screenY) || Math.abs(deltaPx) < 1) {
      return;
    }

    const shift = deltaPx * worldPerPx;
    play.lookY += shift;
    play.camLift += shift;
  }

  applyHeaderCamera(camera, play, aspect);
}

function projectWorldY(
  camera: HeaderProjectCamera,
  play: HeaderPlayConfig,
  width: number,
  height: number,
  worldY: number,
) {
  const aspect = width / Math.max(1, height);
  applyHeaderCamera(camera, play, aspect);
  const projected = camera.position.clone().set(0, worldY, 0).project(camera);
  return (-projected.y * 0.5 + 0.5) * height;
}

function fitHeadAboveText(
  camera: HeaderProjectCamera | null | undefined,
  play: HeaderPlayConfig,
  width: number,
  height: number,
  topY: number,
  bottomY: number,
  canvasTop: number,
) {
  if (!camera?.position.clone || play.textTop == null) {
    return;
  }

  const limit = play.textTop - HEAD_TEXT_GAP_PX - canvasTop;
  if (limit <= HEAD_TOP_INSET_PX + 24) {
    return;
  }

  for (let step = 0; step < 8; step += 1) {
    const chin = projectWorldY(camera, play, width, height, bottomY);
    if (!Number.isFinite(chin) || chin <= limit) {
      return;
    }

    const crown = projectWorldY(camera, play, width, height, topY);
    const currentH = Math.max(8, chin - crown);
    const allowedH = Math.max(8, limit - HEAD_TOP_INSET_PX);
    play.camZ *= currentH / allowedH;
    frameHeadTop(camera, play, width, height, topY, canvasTop);
  }
}

function fitPlayfieldFloor(
  camera: HeaderProjectCamera | null | undefined,
  play: HeaderPlayConfig,
  width: number,
  height: number,
  restBottom: number,
) {
  if (!camera?.position.clone) {
    play.yMin = Math.min(play.yMin, restBottom - 0.05);
    return;
  }

  const floorY = screenWorldY(camera, play, width, height, height - FLOOR_INSET_PX);
  const topY = screenWorldY(camera, play, width, height, FLOOR_INSET_PX);
  if (Number.isFinite(floorY)) {
    play.yMin = floorY;
  }
  if (Number.isFinite(topY)) {
    play.yMax = Math.max(COMPACT_Y_MAX, topY);
  }
}

function screenWorldY(
  camera: HeaderProjectCamera,
  play: HeaderPlayConfig,
  width: number,
  height: number,
  screenY: number,
) {
  const aspect = width / Math.max(1, height);
  const scale = Math.max(1, 1.05 / Math.max(0.3, aspect));
  const fov = ((camera.fov ?? 35) * Math.PI) / 180;
  const worldPerPx = (2 * play.camZ * scale * Math.tan(fov / 2)) / height;
  let worldY = play.lookY;

  for (let step = 0; step < 8; step += 1) {
    applyHeaderCamera(camera, play, aspect);
    const projected = camera.position.clone().set(0, worldY, 0).project(camera);
    const current = (-projected.y * 0.5 + 0.5) * height;
    if (!Number.isFinite(current)) {
      return worldY;
    }
    const error = current - screenY;
    if (Math.abs(error) < 0.5) {
      return worldY;
    }
    worldY += error * worldPerPx;
  }

  return worldY;
}

export type HeaderSoftHandle = {
  ctx?: {
    scene?: {
      traverse: (
        visit: (object: {
          visible?: boolean;
          userData?: {
            softMatter?: HeaderSoftMatter;
            inspolaBackground?: boolean;
          };
          type?: string;
          position?: { y: number };
          geometry?: { parameters?: { width?: number; height?: number } };
        }) => void,
      ) => void;
    };
    camera?: HeaderProjectCamera;
    canvas?: HTMLCanvasElement;
    viewport?: { width: number; height: number };
    pointer?: { down?: boolean };
  };
};

export type HeaderSoftMatter = {
  center?: { x: number; y: number; z: number };
  grabbing?: boolean;
};

export type HeaderProjectCamera = HeaderCamera & {
  position: HeaderCamera["position"] & {
    clone: () => HeaderProjectVector;
  };
};

export type HeaderProjectVector = {
  set: (x: number, y: number, z: number) => HeaderProjectVector;
  project: (camera: HeaderProjectCamera) => HeaderProjectVector;
  x: number;
  y: number;
};

declare global {
  interface Window {
    __headerPlay?: HeaderPlayConfig;
    __headerEnterShift?: number;
    __headerEntering?: boolean;
    __headerHoming?: boolean;
    __headerHomeT?: number;
    __headerHomeFrom?: ArrayLike<number> | null;
    __headerSoftBody?: SoftBodyLift;
    __headerSoftHandle?: HeaderSoftHandle;
  }
}
