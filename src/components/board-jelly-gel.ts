import type { BufferGeometry, Camera, Material, Mesh, Scene as ThreeScene } from "three";
import {
  BackSide,
  Color,
  DataTexture,
  FloatType,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh as GelMesh,
  MeshBasicNodeMaterial,
  NoBlending,
  RGBAFormat,
  RenderTarget,
  RepeatWrapping,
  Scene,
  Vector3,
  WebGPURenderer,
} from "three/webgpu";
import {
  Break,
  Fn,
  If,
  Loop,
  and,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  dot,
  equirectUV,
  exp,
  float,
  int,
  max,
  mix,
  modelNormalMatrix,
  normalLocal,
  normalize,
  positionWorld,
  reflect,
  pow,
  refract,
  select,
  smoothstep,
  sqrt,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

const ABSORPTION = 4;
const ROUGHNESS = 0.355;
const IOR = 1.7;
const REFLECTIONS = 1.25;
const THICKNESS = 8;
const BACKGROUND = "#fafafa";

export type BoardRenderer = {
  outputColorSpace: string;
  setClearColor(color: number, alpha?: number): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: ThreeScene, camera: Camera): void;
  dispose(): void;
};

export type GelPiece = {
  material: Material;
  sync(mesh: Mesh): void;
  retarget(geometry: BufferGeometry): void;
  dispose(): void;
};

export type BoardGel = {
  renderer: BoardRenderer;
  piece(color: string, geometry: BufferGeometry): GelPiece;
  solid(color: string): GelPiece;
  resize(width: number, height: number, ratio: number): void;
  render(camera: Camera): void;
  dispose(): void;
};

function studioEnvironment() {
  const width = 128;
  const height = 64;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const windowA = Math.exp(-(((u - 0.22) / 0.014) ** 2) - (((v - 0.4) / 0.24) ** 8)) * 9;
      const windowB = Math.exp(-(((u - 0.73) / 0.009) ** 2) - (((v - 0.42) / 0.28) ** 8)) * 12;
      const ceiling = Math.exp(-(((v - 0.15) / 0.15) ** 2)) * 1.1;
      const shade = Math.exp(-(((u - 0.48) / 0.15) ** 4) - (((v - 0.48) / 0.35) ** 8)) * 0.25;
      const value = 0.36 + ceiling + windowA + windowB - shade;
      const index = (y * width + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 1;
    }
  }

  const environment = new DataTexture(data, width, height, RGBAFormat, FloatType);
  environment.colorSpace = LinearSRGBColorSpace;
  environment.wrapS = RepeatWrapping;
  environment.flipY = false;
  environment.magFilter = LinearFilter;
  environment.minFilter = LinearMipmapLinearFilter;
  environment.generateMipmaps = true;
  environment.needsUpdate = true;
  return environment;
}

function absorptionOf(color: string) {
  const tint = new Color(color);
  return new Vector3(
    -Math.log(Math.max(1e-4, tint.r)) / ABSORPTION,
    -Math.log(Math.max(1e-4, tint.g)) / ABSORPTION,
    -Math.log(Math.max(1e-4, tint.b)) / ABSORPTION,
  );
}

export async function createBoardGel(canvas: HTMLCanvasElement): Promise<BoardGel> {
  const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
  await renderer.init();
  renderer.setClearColor(0x000000, 0);

  const environment = studioEnvironment();
  const exitTarget = new RenderTarget(1, 1, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: true,
  });
  exitTarget.texture.colorSpace = LinearSRGBColorSpace;

  const ior = uniform(IOR);
  const roughness = uniform(ROUGHNESS);
  const reflections = uniform(REFLECTIONS);
  const thickness = uniform(THICKNESS / 2.1);
  const background = uniform(new Color(BACKGROUND));

  const fresnel = Fn(([cosTheta, etaI, etaT]: [any, any, any]) => {
    const ratio = etaI.div(etaT);
    const k = ratio.mul(ratio).mul(float(1).sub(cosTheta.mul(cosTheta)));
    const cosTransmit = sqrt(float(1).sub(k).max(1e-6));
    const rs = etaI
      .mul(cosTheta)
      .sub(etaT.mul(cosTransmit))
      .div(etaI.mul(cosTheta).add(etaT.mul(cosTransmit)));
    const rp = etaT
      .mul(cosTheta)
      .sub(etaI.mul(cosTransmit))
      .div(etaT.mul(cosTheta).add(etaI.mul(cosTransmit)));
    return select(k.greaterThanEqual(1), float(1), rs.mul(rs).add(rp.mul(rp)).mul(0.5));
  });

  const sampleExit = Fn(([uv]: [any]) => texture(exitTarget.texture, uv, 0));

  const project = Fn(([point]: [any]) => {
    const clip = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(point, 1));
    return vec2(clip.x.div(clip.w).mul(0.5).add(0.5), clip.y.div(clip.w).mul(-0.5).add(0.5));
  });

  const shade = Fn(([direction, point, center]: [any, any, any]) => {
    const dir = normalize(direction);
    const lit = texture(environment, equirectUV(dir), roughness.mul(7)).rgb.mul(reflections).toVar();
    const travel = point.y.div(dir.y.negate().max(0.015)).clamp(0, 120);
    const hit = point.add(dir.mul(travel));
    const local = hit.xz.sub(center.xz).div(vec2(2.3, 1.7));
    const contact = exp(local.dot(local).mul(-3.8))
      .mul(0.3)
      .div(float(1).add(center.y.sub(0.95).max(0)));
    lit.assign(
      mix(lit, background.mul(float(1).sub(contact)), float(1).sub(smoothstep(-0.09, 0.055, dir.y))),
    );
    return lit;
  });

  const backMaterial = new MeshBasicNodeMaterial();
  backMaterial.side = BackSide;
  backMaterial.blending = NoBlending;
  backMaterial.toneMapped = false;
  backMaterial.fog = false;
  backMaterial.lights = false;
  backMaterial.outputNode = vec4(
    normalize(modelNormalMatrix.mul(normalLocal)),
    positionWorld.sub(cameraPosition).length(),
  );

  const backScene = new Scene();
  const pieces: GelPiece[] = [];

  const piece = (color: string, geometry: BufferGeometry) => {
    const absorption = uniform(absorptionOf(color));
    const center = new Vector3();
    const centerNode = uniform(center);
    const material = new MeshBasicNodeMaterial();
    material.fog = false;
    material.lights = false;
    material.toneMapped = false;
    material.transparent = false;
    material.depthWrite = true;
    material.colorNode = Fn(() => {
      const eye = cameraPosition;
      const point = positionWorld;
      const view = normalize(eye.sub(point));
      const outward = normalize(modelNormalMatrix.mul(normalLocal));
      const normal = outward.mul(select(dot(outward, view).greaterThanEqual(0), 1, -1)).toVar();
      const incident = view.negate();
      const frontReflect = fresnel(dot(view, normal).clamp(1e-4, 1), float(1), ior);
      const entry = sampleExit(project(point).clamp(0, 1)).toVar();
      const span = select(
        entry.w.greaterThan(0),
        entry.w.sub(point.sub(eye).length()).clamp(0.035, 5),
        float(0.065),
      );
      const radiance = shade(reflect(incident, normal), point, centerNode).mul(frontReflect).toVar();
      const ray = refract(incident, normal, float(1).div(ior)).toVar();
      const origin = point.toVar();
      const transmit = float(1).sub(frontReflect).toVar();
      const traveled = float(0).toVar();
      const travel = span.toVar();

      Loop(int(3), () => {
        const exitNormal = vec3(0, 0, 1).toVar();
        const found = float(0).toVar();
        for (let step = 0; step < 2; step += 1) {
          const probe = origin.add(ray.mul(travel));
          const uv = project(probe);
          const sample = sampleExit(uv.clamp(0, 1)).toVar();
          If(
            and(
              sample.w.greaterThan(0),
              and(
                uv.x.greaterThanEqual(0),
                and(uv.x.lessThanEqual(1), and(uv.y.greaterThanEqual(0), uv.y.lessThanEqual(1))),
              ),
            ),
            () => {
              const exitPoint = eye.add(normalize(probe.sub(eye)).mul(sample.w));
              travel.assign(dot(exitPoint.sub(origin), ray).clamp(0.035, 5));
              exitNormal.assign(sample.xyz);
              found.assign(1);
            },
          );
        }

        const exit = origin.add(ray.mul(travel));
        traveled.addAssign(travel);
        const hitNormal = select(found.greaterThan(0.5), exitNormal, ray);
        const aligned = normalize(hitNormal).mul(select(dot(hitNormal, ray).greaterThanEqual(0), 1, -1));
        const backReflect = fresnel(dot(ray, aligned).clamp(1e-4, 1), ior, float(1));
        const leaving = refract(ray, aligned.negate(), ior);
        const escaped = leaving.dot(leaving).greaterThan(1e-6);
        const beer = exp(absorption.mul(traveled.mul(thickness).negate()));
        radiance.addAssign(
          beer
            .mul(shade(select(escaped, leaving, ray), exit, centerNode))
            .mul(transmit)
            .mul(float(1).sub(backReflect))
            .mul(select(escaped, 1, 0)),
        );
        transmit.mulAssign(backReflect);
        ray.assign(reflect(ray, aligned));
        origin.assign(exit);
        If(transmit.lessThan(0.004), () => {
          Break();
        });
      });

      radiance.addAssign(
        exp(absorption.mul(traveled.mul(thickness).negate())).mul(transmit).mul(shade(ray, origin, centerNode)),
      );
      return radiance.max(vec3(0));
    })();

    let back = new GelMesh(geometry, backMaterial);
    back.frustumCulled = false;
    backScene.add(back);

    const gelPiece: GelPiece = {
      material,
      sync(mesh) {
        back.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
        back.rotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
        back.scale.set(mesh.scale.x, mesh.scale.y, mesh.scale.z);
        center.set(mesh.position.x, mesh.position.y, mesh.position.z);
      },
      retarget(next) {
        const replacement = new GelMesh(next, backMaterial);
        replacement.frustumCulled = false;
        replacement.position.set(back.position.x, back.position.y, back.position.z);
        replacement.rotation.set(back.rotation.x, back.rotation.y, back.rotation.z);
        replacement.scale.set(back.scale.x, back.scale.y, back.scale.z);
        backScene.remove(back);
        backScene.add(replacement);
        back = replacement;
      },
      dispose() {
        material.dispose();
      },
    };
    pieces.push(gelPiece);
    return gelPiece;
  };

  const solid = (color: string) => {
    const ink = uniform(new Color(color));
    const material = new MeshBasicNodeMaterial();
    material.fog = false;
    material.lights = false;
    material.toneMapped = false;
    material.colorNode = Fn(() => {
      const normal = normalize(modelNormalMatrix.mul(normalLocal));
      const view = normalize(cameraPosition.sub(positionWorld));
      const light = normalize(vec3(0.32, 0.86, 0.48));
      const wrap = dot(normal, light).mul(0.5).add(0.5);
      const halfDir = normalize(light.add(view));
      const spec = pow(max(dot(normal, halfDir), float(0)), float(64));
      return ink.mul(float(0.62).add(wrap.mul(0.9))).add(vec3(spec.mul(0.55)));
    })();
    const gelPiece: GelPiece = {
      material,
      sync() {},
      retarget() {},
      dispose() {
        material.dispose();
      },
    };
    pieces.push(gelPiece);
    return gelPiece;
  };

  return {
    renderer,
    piece,
    solid,
    resize(width, height, ratio) {
      const targetWidth = Math.max(1, Math.round(width * ratio));
      const targetHeight = Math.max(1, Math.round(height * ratio));
      if (exitTarget.width !== targetWidth || exitTarget.height !== targetHeight) {
        exitTarget.setSize(targetWidth, targetHeight);
      }
    },
    render(camera) {
      renderer.setRenderTarget(exitTarget);
      renderer.render(backScene, camera);
      renderer.setRenderTarget(null);
    },
    dispose() {
      for (const gelPiece of pieces) {
        gelPiece.dispose();
      }
      backMaterial.dispose();
      exitTarget.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
