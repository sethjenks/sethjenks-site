// Layered shadows from one light. Math from Beautiful Shadows by Alex Widua
// (MIT), as specified by the inspired-shadows skill.

export const PAGE_BACKGROUND = "oklch(98.5% 0 none)";
export const DARK_BACKGROUND = "oklch(18% 0 none)";

export const ELEVATION = {
  sm: { elevation: 0.06, brightness: 0.12 },
  md: { elevation: 0.15, brightness: 0.14 },
  lg: { elevation: 0.3, brightness: 0.16 },
  xl: { elevation: 0.5, brightness: 0.18 },
} as const;

export const ELEVATION_LEVELS = ["sm", "md", "lg", "xl"] as const;

export type ElevationLevel = (typeof ELEVATION_LEVELS)[number];

// Radix Themes usage order, with a recessed card for the inset step.
export const DEMO_ELEVATIONS = [
  { id: 1, use: "Button", kind: "control", note: "Hover lifts it. Press insets it." },
  { id: 2, use: "Recessed card", kind: "well", note: "Hover softens the well. Press sinks it." },
  { id: 3, use: "Card", kind: "lift", note: "Hover raises it. Press flattens it." },
  { id: 4, use: "Raised card", kind: "lift", note: "Hover raises it. Press settles it." },
  { id: 5, use: "Popover", kind: "lift", note: "Hover raises it. Press settles it." },
  { id: 6, use: "Dialog", kind: "lift", note: "Press settles it. Nothing sits higher." },
] as const;

export type DemoElevationId = (typeof DEMO_ELEVATIONS)[number]["id"];

const DEMO_STEPS: Record<DemoElevationId, Pick<ShadowInput, "elevation" | "brightness" | "inset">> = {
  1: { elevation: 0.06, brightness: 0.12 },
  2: { elevation: 0.12, brightness: 0.2, inset: true },
  3: { elevation: 0.07, brightness: 0.12 },
  4: { elevation: 0.15, brightness: 0.14 },
  5: { elevation: 0.34, brightness: 0.16 },
  6: { elevation: 0.5, brightness: 0.18 },
};

const DEMO_FLAT = { elevation: 0.035, brightness: 0.1 } as const;
const DEMO_SOFT_WELL = { elevation: 0.07, brightness: 0.14, inset: true } as const;
const DEMO_PRESSED_INSET = { elevation: 0.1, brightness: 0.24, inset: true } as const;
const DEMO_DEEP_WELL = { elevation: 0.18, brightness: 0.26, inset: true } as const;

export const LIGHT_REACH = { min: 96, max: 200 } as const;

const DARK_BRIGHTNESS = 2.5;
const DARK_ALPHA_CAP = 0.6;
const DARK_HIGHLIGHT = "inset 0px 1px 0px oklch(100% 0 none / 0.06)";

export type Oklch = {
  l: number;
  c: number;
  h: number | null;
};

export type ShadowInput = {
  azimuth?: number;
  distance?: number;
  elevation?: number;
  brightness?: number;
  color?: string;
  layers?: number;
  size?: number;
  blurScale?: number;
  inset?: boolean;
  alphaCap?: number;
};

export type ShadowLayer = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  alpha: number;
  inset: boolean;
};

export type ShadowTokens = Record<ElevationLevel, string>;

type TokenInput = Omit<ShadowInput, "elevation" | "brightness"> & {
  brightnessScale?: number;
};

const FALLBACK: Oklch = { l: 0.22, c: 0, h: null };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeQuadIn(t: number): number {
  return t * t;
}

function easeQuadOut(t: number): number {
  return t * (2 - t);
}

function easeCubicInOut(t: number): number {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

function normalizeDegrees(value: number): number {
  const turns = value % 360;
  return turns < 0 ? turns + 360 : turns;
}

function srgbChannelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearSrgbToOklch(red: number, green: number, blue: number): Oklch {
  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  const labL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const labA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const labB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.hypot(labA, labB);
  if (chroma < 0.0008) return { l: labL, c: 0, h: null };
  const hue = Math.atan2(labB, labA) * (180 / Math.PI);
  return { l: labL, c: chroma, h: hue < 0 ? hue + 360 : hue };
}

export function parseOklch(input: string): Oklch {
  const oklch = input
    .trim()
    .match(/^oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+(none|[0-9.]+)/i);
  if (oklch) {
    const lightness = oklch[1].includes("%") || Number(oklch[1]) > 1 ? Number(oklch[1]) / 100 : Number(oklch[1]);
    const chroma = Number(oklch[2]);
    const hue = oklch[3].toLowerCase() === "none" || chroma < 0.0008 ? null : Number(oklch[3]);
    return { l: clamp(lightness, 0, 1), c: Math.max(0, chroma), h: hue };
  }

  const hex = input.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return FALLBACK;
  const digits = hex[1].length === 3 ? [...hex[1]].map((channel) => channel + channel).join("") : hex[1];
  const red = srgbChannelToLinear(Number.parseInt(digits.slice(0, 2), 16));
  const green = srgbChannelToLinear(Number.parseInt(digits.slice(2, 4), 16));
  const blue = srgbChannelToLinear(Number.parseInt(digits.slice(4, 6), 16));
  return linearSrgbToOklch(red, green, blue);
}

function linearChannelToSrgb(channel: number): number {
  const value = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
  return Math.round(clamp(value, 0, 1) * 255);
}

export function oklchToHex(color: Oklch): string {
  const hue = ((color.h ?? 0) * Math.PI) / 180;
  const a = color.c * Math.cos(hue);
  const b = color.c * Math.sin(hue);
  const lRoot = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = color.l - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const red = linearChannelToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = linearChannelToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = linearChannelToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  const hex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

export function formatOklch(color: Oklch, alpha?: number): string {
  const lightness = `${Math.round(clamp(color.l, 0, 1) * 100)}%`;
  const chroma = color.c < 0.0008 ? "0" : `${Math.round(color.c * 1000) / 1000}`;
  const hue = color.c < 0.0008 || color.h === null ? "none" : `${Math.round(color.h * 10) / 10}`;
  const body = `oklch(${lightness} ${chroma} ${hue}`;
  if (alpha === undefined) return `${body})`;
  const rounded = Math.round(alpha * 100) / 100;
  const text = rounded.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  return `${body} / ${text})`;
}

export function tintFor(background: string): string {
  const color = parseOklch(background);
  if (color.l > 0.55) {
    const chroma = color.c < 0.008 ? 0 : Math.min(0.08, color.c * 1.4);
    return formatOklch({ l: 0.22, c: chroma, h: chroma === 0 ? null : color.h });
  }
  const chroma = color.c < 0.008 ? 0 : Math.min(0.05, color.c);
  return formatOklch({
    l: Math.max(0.08, color.l * 0.45),
    c: chroma,
    h: chroma === 0 ? null : color.h,
  });
}

export function fromLightAngle(lightDegrees: number): number {
  return normalizeDegrees(lightDegrees + 180);
}

export function azimuthFromPoint(dx: number, dy: number): number {
  const light = Math.atan2(dy, dx) * (180 / Math.PI);
  return fromLightAngle(light);
}

export function pointFromAzimuth(azimuth: number, radius: number): { x: number; y: number } {
  const light = ((azimuth + 180) * Math.PI) / 180;
  return { x: Math.cos(light) * radius, y: Math.sin(light) * radius };
}

export function reachFromDistance(distance: number): number {
  const t = clamp(distance / 150, 0, 1);
  return LIGHT_REACH.min + t * (LIGHT_REACH.max - LIGHT_REACH.min);
}

export function distanceFromReach(px: number): number {
  const t = clamp((px - LIGHT_REACH.min) / (LIGHT_REACH.max - LIGHT_REACH.min), 0, 1);
  return t * 150;
}

export function shadowLayers(input: ShadowInput = {}): ShadowLayer[] {
  const azimuth = input.azimuth ?? 90;
  const distance = input.distance ?? 100;
  const elevation = input.elevation ?? 0.15;
  const brightness = input.brightness ?? 0.1;
  const layers = Math.max(2, Math.round(input.layers ?? 6));
  const size = input.size ?? 100;
  const blurScale = input.blurScale ?? 1;
  const inset = input.inset ?? false;
  const alphaCap = input.alphaCap ?? 1;
  const radians = (azimuth * Math.PI) / 180;
  const reachScale = (distance * size) / 100;
  const blurBase = 50 * Math.max(reachScale / 100, 0.1);
  const result: ShadowLayer[] = [];

  for (let index = 0; index < layers; index += 1) {
    const t = index / layers;
    const alpha = Math.min(alphaCap, Math.round(brightness * (1 - easeCubicInOut(t)) * 100) / 100);
    const reach = reachScale * elevation * easeQuadIn(t) * 5;
    const x = Math.round(Math.cos(radians) * reach);
    const y = Math.round(Math.sin(radians) * reach);
    const blur = Math.round(blurBase * easeQuadOut(t) * elevation * 2 * blurScale);
    if (x === 0 && y === 0 && blur === 0) continue;
    if (alpha <= 0) continue;
    result.push({ x, y, blur, spread: 0, alpha, inset });
  }

  return result;
}

export function castShadow(input: ShadowInput, theme: "light" | "dark"): string {
  switch (theme) {
    case "light":
      return beautifulShadow(input, { dropInvisible: true });
    case "dark": {
      const shadow = beautifulShadow(
        {
          ...input,
          brightness: (input.brightness ?? 0.1) * DARK_BRIGHTNESS,
          alphaCap: input.alphaCap ?? DARK_ALPHA_CAP,
        },
        { dropInvisible: true },
      );
      return shadow === "none" ? DARK_HIGHLIGHT : `${DARK_HIGHLIGHT}, ${shadow}`;
    }
    default: {
      const never: never = theme;
      return never;
    }
  }
}

export function demoStates(
  input: Omit<ShadowInput, "elevation" | "brightness" | "inset">,
  theme: "light" | "dark",
  id: DemoElevationId,
): { rest: string; hover: string; press: string } {
  const step = (level: DemoElevationId) => castShadow({ ...input, ...DEMO_STEPS[level] }, theme);
  switch (id) {
    case 1:
      return { rest: step(1), hover: step(3), press: castShadow({ ...input, ...DEMO_PRESSED_INSET }, theme) };
    case 2:
      return {
        rest: step(2),
        hover: castShadow({ ...input, ...DEMO_SOFT_WELL }, theme),
        press: castShadow({ ...input, ...DEMO_DEEP_WELL }, theme),
      };
    case 3:
      return { rest: step(3), hover: step(4), press: castShadow({ ...input, ...DEMO_FLAT }, theme) };
    case 4:
      return { rest: step(4), hover: step(5), press: step(3) };
    case 5:
      return { rest: step(5), hover: step(6), press: step(4) };
    case 6:
      return { rest: step(6), hover: step(6), press: step(5) };
    default: {
      const never: never = id;
      return never;
    }
  }
}

export function beautifulShadow(input: ShadowInput = {}, options: { dropInvisible?: boolean } = {}): string {
  const color = parseOklch(input.color ?? "#000");
  const layers = shadowLayers(input).filter((layer) => !options.dropInvisible || layer.alpha > 0);
  if (layers.length === 0) return "none";
  return layers
    .map((layer) => {
      const inset = layer.inset ? "inset " : "";
      return `${inset}${layer.x}px ${layer.y}px ${layer.blur}px ${formatOklch(color, layer.alpha)}`;
    })
    .join(", ");
}

function tokensFor(input: TokenInput, highlight: boolean): ShadowTokens {
  const scale = input.brightnessScale ?? 1;
  const tokens = {} as ShadowTokens;
  for (const level of ELEVATION_LEVELS) {
    const shadow = beautifulShadow(
      {
        ...input,
        elevation: ELEVATION[level].elevation,
        brightness: ELEVATION[level].brightness * scale,
      },
      { dropInvisible: true },
    );
    tokens[level] = highlight && shadow !== "none" ? `${DARK_HIGHLIGHT}, ${shadow}` : shadow;
  }
  return tokens;
}

export function elevationTokens(input: TokenInput = {}): ShadowTokens {
  return tokensFor(input, false);
}

export function darkElevationTokens(input: TokenInput = {}): ShadowTokens {
  return tokensFor(
    {
      ...input,
      brightnessScale: (input.brightnessScale ?? 1) * DARK_BRIGHTNESS,
      alphaCap: input.alphaCap ?? DARK_ALPHA_CAP,
    },
    true,
  );
}

export function toCSSBlock(light: ShadowTokens, dark: ShadowTokens): string {
  const lines = (tokens: ShadowTokens) =>
    ELEVATION_LEVELS.map((level) => `  --shadow-${level}: ${tokens[level]};`).join("\n");
  return `:root {\n${lines(light)}\n}\n\n[data-theme="dark"] {\n${lines(dark)}\n}`;
}
