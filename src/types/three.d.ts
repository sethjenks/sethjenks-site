declare module "three" {
  export const SRGBColorSpace: "srgb";

  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    copy(vector: Vector3): this;
    unproject(camera: Camera): this;
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
    x: number;
    y: number;
    z: number;
  }

  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number;
    y: number;
    z: number;
    w: number;
    set(x: number, y: number, z: number, w: number): this;
    copy(quaternion: Quaternion): this;
    setFromEuler(euler: Euler): this;
  }

  export class Color {
    constructor(color?: string);
    r: number;
    g: number;
    b: number;
  }

  export class Plane {
    constructor(normal?: Vector3, constant?: number);
  }

  export class Ray {
    intersectPlane(plane: Plane, target: Vector3): Vector3 | null;
  }

  export class Raycaster {
    ray: Ray;
    setFromCamera(coords: Vector2, camera: Camera): void;
  }

  export class Clock {
    getDelta(): number;
  }

  export class BufferAttribute {
    count: number;
    getX(index: number): number;
    getY(index: number): number;
    getZ(index: number): number;
  }

  export class BufferGeometry {
    dispose(): void;
    computeVertexNormals(): void;
    getAttribute(name: string): BufferAttribute | undefined;
  }

  export class Material {
    dispose(): void;
    clone(): this;
  }

  export class ShaderMaterial extends Material {
    constructor(parameters: {
      uniforms: Record<string, { value: unknown }>;
      vertexShader: string;
      fragmentShader: string;
      transparent?: boolean;
      depthWrite?: boolean;
      premultipliedAlpha?: boolean;
    });
  }

  export class MeshBasicMaterial extends Material {
    constructor(parameters?: {
      map?: Texture;
      transparent?: boolean;
      depthWrite?: boolean;
      premultipliedAlpha?: boolean;
    });
    opacity: number;
  }

  export class Texture {
    colorSpace: string;
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class TorusGeometry extends BufferGeometry {
    constructor(
      radius?: number,
      tube?: number,
      radialSegments?: number,
      tubularSegments?: number,
    );
  }

  export class CircleGeometry extends BufferGeometry {
    constructor(radius?: number, segments?: number);
  }

  export class Object3D {
    position: Vector3;
    quaternion: Quaternion;
    rotation: Vector3 & { set(x: number, y: number, z: number): void };
    scale: Vector3 & { setScalar(scale: number): void };
    renderOrder: number;
    frustumCulled: boolean;
    add(object: Object3D): this;
    remove(object: Object3D): this;
    traverse(callback: (object: Object3D) => void): void;
    updateMatrixWorld(): void;
  }

  export class Mesh extends Object3D {
    constructor(geometry: BufferGeometry, material: Material);
    geometry: BufferGeometry;
    material: Material | Material[];
  }

  export class Camera {}

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    fov: number;
    aspect: number;
    position: Vector3;
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
    updateMatrixWorld(): void;
  }

  export class Scene extends Object3D {}

  export class WebGLRenderer {
    constructor(parameters?: {
      canvas?: HTMLCanvasElement;
      alpha?: boolean;
      antialias?: boolean;
      premultipliedAlpha?: boolean;
      powerPreference?: string;
    });
    outputColorSpace: string;
    setClearColor(color: number, alpha?: number): void;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  export const MathUtils: {
    degToRad(degrees: number): number;
  };
}

declare module "three/webgpu" {
  import { Camera, Material, Scene, Texture } from "three";

  export * from "three";

  export const BackSide: number;
  export const FloatType: number;
  export const HalfFloatType: number;
  export const LinearFilter: number;
  export const LinearMipmapLinearFilter: number;
  export const LinearSRGBColorSpace: string;
  export const NoBlending: number;
  export const RGBAFormat: number;
  export const RepeatWrapping: number;

  export class DataTexture extends Texture {
    constructor(
      data: Float32Array,
      width: number,
      height: number,
      format?: number,
      type?: number,
    );
    wrapS: number;
    flipY: boolean;
    generateMipmaps: boolean;
    minFilter: number;
    magFilter: number;
    needsUpdate: boolean;
  }

  export class RenderTarget {
    constructor(width?: number, height?: number, options?: object);
    width: number;
    height: number;
    texture: Texture;
    setSize(width: number, height: number): void;
    dispose(): void;
  }

  export class MeshBasicNodeMaterial extends Material {
    constructor(parameters?: object);
    colorNode: unknown;
    outputNode: unknown;
    side: number;
    blending: number;
    toneMapped: boolean;
    lights: boolean;
    fog: boolean;
    transparent: boolean;
    depthWrite: boolean;
  }

  export class WebGPURenderer {
    constructor(parameters?: { canvas?: HTMLCanvasElement; antialias?: boolean; alpha?: boolean });
    init(): Promise<void>;
    outputColorSpace: string;
    setClearColor(color: number, alpha?: number): void;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setRenderTarget(target: RenderTarget | null): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
}

declare module "three/tsl" {
  export const Break: any;
  export const Fn: any;
  export const If: any;
  export const Loop: any;
  export const abs: any;
  export const and: any;
  export const cameraPosition: any;
  export const cameraProjectionMatrix: any;
  export const cameraViewMatrix: any;
  export const clamp: any;
  export const dot: any;
  export const equirectUV: any;
  export const exp: any;
  export const float: any;
  export const fract: any;
  export const int: any;
  export const max: any;
  export const min: any;
  export const mix: any;
  export const modelNormalMatrix: any;
  export const normalLocal: any;
  export const normalize: any;
  export const positionWorld: any;
  export const pow: any;
  export const reflect: any;
  export const refract: any;
  export const select: any;
  export const smoothstep: any;
  export const sqrt: any;
  export const texture: any;
  export const uniform: any;
  export const vec2: any;
  export const vec3: any;
  export const vec4: any;
}

declare module "three/addons/geometries/RoundedBoxGeometry.js" {
  import { BufferGeometry } from "three";

  export class RoundedBoxGeometry extends BufferGeometry {
    constructor(
      width?: number,
      height?: number,
      depth?: number,
      segments?: number,
      radius?: number,
    );
  }
}
