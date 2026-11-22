"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  DARK_BACKGROUND,
  DEMO_ELEVATIONS,
  LIGHT_REACH,
  PAGE_BACKGROUND,
  demoStates,
  azimuthFromPoint,
  darkElevationTokens,
  distanceFromReach,
  elevationTokens,
  formatOklch,
  oklchToHex,
  parseOklch,
  pointFromAzimuth,
  reachFromDistance,
  tintFor,
  toCSSBlock,
  type ElevationLevel,
  type ShadowTokens,
} from "@/lib/shadows";

const STORAGE_KEY = "shadow-light";

const DARK_SURFACE: Record<ElevationLevel, string> = {
  sm: "oklch(24% 0 none)",
  md: "oklch(27% 0 none)",
  lg: "oklch(30% 0 none)",
  xl: "oklch(34% 0 none)",
};

const COOL_TINT = "oklch(28% 0.04 262)";
const INK_TINT = "oklch(18% 0 none)";

type Theme = "light" | "dark";

type LightState = {
  azimuth: number;
  distance: number;
  blurScale: number;
  layers: number;
  theme: Theme;
  color: string | null;
};

const INITIAL: LightState = {
  azimuth: 90,
  distance: 100,
  blurScale: 1,
  layers: 6,
  theme: "light",
  color: null,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function surfaceFor(theme: Theme): string {
  switch (theme) {
    case "light":
      return PAGE_BACKGROUND;
    case "dark":
      return DARK_BACKGROUND;
    default: {
      const never: never = theme;
      return never;
    }
  }
}

function readStored(): LightState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const stored = value as Partial<LightState>;
    if (stored.theme !== "light" && stored.theme !== "dark") return null;
    if (typeof stored.azimuth !== "number" || typeof stored.distance !== "number") return null;
    return {
      azimuth: ((stored.azimuth % 360) + 360) % 360,
      distance: clamp(stored.distance, 0, 150),
      blurScale: clamp(typeof stored.blurScale === "number" ? stored.blurScale : 1, 0.25, 3),
      layers: clamp(Math.round(typeof stored.layers === "number" ? stored.layers : 6), 2, 10),
      theme: stored.theme,
      color: typeof stored.color === "string" ? stored.color : null,
    };
  } catch {
    return null;
  }
}

type Hsv = { h: number; s: number; v: number };
type Rgb = { r: number; g: number; b: number };

function shadowColorName(color: string | null): string {
  if (color === null) return "Page";
  if (color === COOL_TINT) return "Cool";
  if (color === INK_TINT) return "Ink";
  return "Custom";
}

function hexToRgb(hex: string): Rgb {
  const digits = hex.replace("#", "");
  const full = digits.length === 3 ? [...digits].map((part) => part + part).join("") : digits;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function hsvToCss(hsv: Hsv): string {
  return formatOklch(parseOklch(rgbToHex(hsvToRgb(hsv))));
}

function colorToHsv(color: string): Hsv {
  return rgbToHsv(hexToRgb(oklchToHex(parseOklch(color))));
}

function tokensFor(light: LightState, theme: Theme): ShadowTokens {
  const input = {
    azimuth: light.azimuth,
    distance: light.distance,
    blurScale: light.blurScale,
    layers: light.layers,
    size: 100,
    color: light.color ?? tintFor(surfaceFor(theme)),
  };
  return theme === "dark" ? darkElevationTokens(input) : elevationTokens(input);
}

function shadowStyle(tokens: ShadowTokens): CSSProperties {
  return {
    "--shadow-sm": tokens.sm,
    "--shadow-md": tokens.md,
    "--shadow-lg": tokens.lg,
    "--shadow-xl": tokens.xl,
  } as CSSProperties;
}

export function ShadowLab() {
  const originRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLButtonElement>(null);
  const lightRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const colorPanelHeadRef = useRef<HTMLHeaderElement>(null);
  const panelPosRef = useRef({ x: 24, y: 24 });
  const [light, setLight] = useState<LightState>(INITIAL);
  const [notice, setNotice] = useState<"Apply" | "Copied" | "Saved">("Apply");
  const [colorOpen, setColorOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 24, y: 24 });
  const [hsv, setHsv] = useState<Hsv>(() => colorToHsv(tintFor(PAGE_BACKGROUND)));
  panelPosRef.current = panelPos;
  const tokens = tokensFor(light, light.theme);
  const point = pointFromAzimuth(light.azimuth, reachFromDistance(light.distance));
  const activeColor = light.color ?? tintFor(surfaceFor(light.theme));
  const activeHex = oklchToHex(parseOklch(activeColor));
  const hueCss = `hsl(${Math.round(hsv.h)} 100% 50%)`;

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setLight(stored);
      setHsv(colorToHsv(stored.color ?? tintFor(surfaceFor(stored.theme))));
    }
  }, []);

  useEffect(() => {
    if (notice === "Apply") return;
    const id = window.setTimeout(() => setNotice("Apply"), 1600);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!colorOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      event.preventDefault();
      setColorOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [colorOpen]);

  useEffect(() => {
    if (!colorOpen) return;
    const head = colorPanelHeadRef.current;
    if (!head) return;

    let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;

    const onMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const next = {
        x: clamp(event.clientX - drag.offsetX, 8, window.innerWidth - 56),
        y: clamp(event.clientY - drag.offsetY, 8, window.innerHeight - 56),
      };
      panelPosRef.current = next;
      setPanelPos(next);
    };

    const onUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if ((event.target as Element | null)?.closest("button")) return;
      event.preventDefault();
      drag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - panelPosRef.current.x,
        offsetY: event.clientY - panelPosRef.current.y,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    head.addEventListener("pointerdown", onDown);
    return () => {
      head.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [colorOpen]);

  function place(dx: number, dy: number) {
    const dist = Math.hypot(dx, dy) || 1;
    const reach = clamp(dist, LIGHT_REACH.min, LIGHT_REACH.max);
    const x = (dx / dist) * reach;
    const y = (dy / dist) * reach;
    setLight((current) => ({
      ...current,
      azimuth: azimuthFromPoint(x, y),
      distance: distanceFromReach(reach),
    }));
  }

  function moveFromPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const origin = originRef.current;
    if (!origin) return;
    const rect = origin.getBoundingClientRect();
    place(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
  }

  function setTheme(theme: Theme) {
    setLight((current) => ({ ...current, theme }));
  }

  function onThemeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const theme =
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? "dark"
        : event.key === "ArrowRight" || event.key === "ArrowDown"
          ? "light"
          : null;
    if (!theme) return;
    event.preventDefault();
    setTheme(theme);
    (theme === "dark" ? darkRef : lightRef).current?.focus();
  }

  function onLightKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 18 : 8;
    const next = {
      ArrowRight: [step, 0],
      ArrowLeft: [-step, 0],
      ArrowDown: [0, step],
      ArrowUp: [0, -step],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    place(point.x + next[0], point.y + next[1]);
  }

  async function apply() {
    const css = toCSSBlock(tokensFor(light, "light"), tokensFor(light, "dark"));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
    try {
      await navigator.clipboard.writeText(css);
      setNotice("Copied");
    } catch {
      setNotice("Saved");
    }
  }

  function setCustomFromHsv(next: Hsv) {
    setHsv(next);
    setLight((current) => ({ ...current, color: hsvToCss(next) }));
  }

  function openColorPanel() {
    const next = colorToHsv(activeColor);
    setHsv(next);
    const button = colorButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const width = 248;
      const height = 320;
      setPanelPos({
        x: clamp(rect.left + rect.width / 2 - width / 2, 16, window.innerWidth - width - 16),
        y: clamp(rect.top - height - 14, 16, window.innerHeight - height - 16),
      });
    }
    setColorOpen(true);
  }

  function sampleSv(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    setCustomFromHsv({ ...hsv, s, v });
  }

  function sampleHue(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const h = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 359.999);
    setCustomFromHsv({ ...hsv, h });
  }

  const pointStyle = {
    "--x": `calc(50% + ${point.x}px)`,
    "--y": `calc(50% + ${point.y}px)`,
  } as CSSProperties;

  return (
    <main className="shadow-lab" data-theme={light.theme} style={shadowStyle(tokens)}>
      <header className="shadow-head">
        <a href="/lab">Lab</a>
        <span>Shadows</span>
      </header>

      <div className="shadow-stage">
        <div className="shadow-field">
          <div className="shadow-origin" ref={originRef} style={pointStyle}>
            <div className="shadow-card" style={{ background: light.theme === "dark" ? DARK_SURFACE.md : undefined }} />
            <button
              type="button"
              className="shadow-light"
              aria-label={`Light. Shadow falls ${Math.round(light.azimuth)} degrees.`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                moveFromPointer(event);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                moveFromPointer(event);
              }}
              onKeyDown={onLightKeyDown}
            />
          </div>
        </div>

        <div className="shadow-scale">
          <p className="shadow-scale-note">Elevation steps. Hover and press each one.</p>
          {DEMO_ELEVATIONS.map((demo) => {
            const states = demoStates(
              {
                azimuth: light.azimuth,
                distance: light.distance,
                blurScale: light.blurScale,
                layers: light.layers,
                size: 100,
                color: light.color ?? tintFor(surfaceFor(light.theme)),
              },
              light.theme,
              demo.id,
            );
            return (
              <button
                key={demo.id}
                type="button"
                className="shadow-demo"
                data-kind={demo.kind}
                aria-label={`${demo.id} ${demo.use}. ${demo.note}`}
              >
                <span className="shadow-demo-name">
                  <b>{demo.id}</b> {demo.use}
                </span>
                <span className="shadow-demo-stage">
                  <span
                    className="shadow-demo-face"
                    style={
                      {
                        "--rest": states.rest,
                        "--hover": states.hover,
                        "--press": states.press,
                      } as CSSProperties
                    }
                  />
                </span>
                <span className="shadow-demo-state" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="shadow-tools">
        <div className="shadow-bar" role="toolbar" aria-label="Shadow light">
          <div
            className="shadow-theme"
            role="radiogroup"
            aria-label="Surface"
            onKeyDown={onThemeKeyDown}
          >
            <button
              ref={darkRef}
              type="button"
              role="radio"
              className="shadow-theme-option"
              data-theme="dark"
              aria-checked={light.theme === "dark"}
              aria-label="Dark surface"
              tabIndex={light.theme === "dark" ? 0 : -1}
              onClick={() => setTheme("dark")}
            />
            <button
              ref={lightRef}
              type="button"
              role="radio"
              className="shadow-theme-option"
              data-theme="light"
              aria-checked={light.theme === "light"}
              aria-label="Light surface"
              tabIndex={light.theme === "light" ? 0 : -1}
              onClick={() => setTheme("light")}
            />
          </div>
          <button
            ref={colorButtonRef}
            type="button"
            className="shadow-color"
            aria-pressed={colorOpen}
            aria-label={`Shadow color, ${shadowColorName(light.color)}`}
            style={{ "--swatch": activeColor } as CSSProperties}
            onClick={() => (colorOpen ? setColorOpen(false) : openColorPanel())}
          />
          <button type="button" className="shadow-more" popoverTarget="shadow-menu" aria-label="Shadow options">
            <svg viewBox="0 0 24 6" aria-hidden="true">
              <circle cx="3" cy="3" r="1.35" />
              <circle cx="12" cy="3" r="1.35" />
              <circle cx="21" cy="3" r="1.35" />
            </svg>
          </button>
          <button type="button" className="shadow-apply" onClick={() => void apply()}>
            {notice}
          </button>
        </div>
      </div>

      <div id="shadow-menu" popover="auto" className="shadow-menu">
        <label>
          <span>Distance <b>{Math.round(light.distance)}</b></span>
          <input
            type="range"
            min={0}
            max={150}
            step={1}
            value={light.distance}
            onChange={(event) =>
              setLight((current) => ({ ...current, distance: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          <span>Blur <b>{light.blurScale.toFixed(2)}</b></span>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={light.blurScale}
            onChange={(event) =>
              setLight((current) => ({ ...current, blurScale: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          <span>Layers <b>{light.layers}</b></span>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={light.layers}
            onChange={(event) =>
              setLight((current) => ({ ...current, layers: Number(event.target.value) }))
            }
          />
        </label>
        <p className="shadow-readout">Falls {Math.round(light.azimuth)}°</p>
      </div>

      {colorOpen ? (
        <div
          className="shadow-color-panel"
          data-floating-panel=""
          role="dialog"
          aria-label="Shadow color"
          style={{ insetInlineStart: panelPos.x, insetBlockStart: panelPos.y }}
        >
          <header ref={colorPanelHeadRef} className="shadow-color-panel-head">
            <p className="shadow-readout">Color · {shadowColorName(light.color)}</p>
            <button
              type="button"
              className="shadow-color-close"
              aria-label="Close color panel"
              onClick={() => setColorOpen(false)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.2 2.2 9.8 9.8M9.8 2.2 2.2 9.8" />
              </svg>
            </button>
          </header>

          <div
            className="shadow-sv"
            style={{ "--hue": hueCss } as CSSProperties}
            role="slider"
            tabIndex={0}
            aria-label="Saturation and brightness"
            aria-valuetext={`${Math.round(hsv.s * 100)}% sat, ${Math.round(hsv.v * 100)}% bright`}
            onPointerDown={(event) => {
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Ignore capture failures on synthetic pointers.
              }
              sampleSv(event);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              sampleSv(event);
            }}
          >
            <span
              className="shadow-sv-thumb"
              style={{ insetInlineStart: `${hsv.s * 100}%`, insetBlockStart: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <div
            className="shadow-hue"
            role="slider"
            tabIndex={0}
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            onPointerDown={(event) => {
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Ignore capture failures on synthetic pointers.
              }
              sampleHue(event);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              sampleHue(event);
            }}
          >
            <span className="shadow-hue-thumb" style={{ insetInlineStart: `${(hsv.h / 360) * 100}%` }} />
          </div>

          <div className="shadow-color-meta">
            <span className="shadow-color-chip" style={{ background: activeColor }} />
            <code>{activeHex}</code>
          </div>

          <div className="shadow-colors" role="group" aria-label="Shadow color settings">
            <button
              type="button"
              aria-pressed={light.color === null}
              onClick={() => {
                setLight((current) => ({ ...current, color: null }));
                setHsv(colorToHsv(tintFor(surfaceFor(light.theme))));
              }}
            >
              <i style={{ background: tintFor(surfaceFor(light.theme)) }} />
              Page
            </button>
            <button
              type="button"
              aria-pressed={light.color === COOL_TINT}
              onClick={() => {
                setLight((current) => ({ ...current, color: COOL_TINT }));
                setHsv(colorToHsv(COOL_TINT));
              }}
            >
              <i style={{ background: COOL_TINT }} />
              Cool
            </button>
            <button
              type="button"
              aria-pressed={light.color === INK_TINT}
              onClick={() => {
                setLight((current) => ({ ...current, color: INK_TINT }));
                setHsv(colorToHsv(INK_TINT));
              }}
            >
              <i style={{ background: INK_TINT }} />
              Ink
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
