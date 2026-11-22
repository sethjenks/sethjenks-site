"use client";

import { Cancel01Icon, SlidersHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

export type CardTune = {
  masked: boolean;
  shellBackground: string;
  shellRadius: number;
  contentRadius: number | null;
};

export const DEFAULT_CARD_TUNE: CardTune = {
  masked: true,
  shellBackground: "#ededed",
  shellRadius: 24,
  contentRadius: null,
};

export function tunedContentRadius(defaultRadius: number, tune: CardTune) {
  return tune.contentRadius ?? defaultRadius;
}

const SHELL_BACKGROUNDS = [
  { value: "#ededed", label: "Paper" },
  { value: "#fafafa", label: "Stage" },
  { value: "#ffffff", label: "White" },
  { value: "#111111", label: "Ink" },
] as const;

const PANEL_WIDTH = 280;
const PANEL_MARGIN = 16;

export function CardTunePanel({
  tune,
  onChange,
  contentDefault,
}: {
  tune: CardTune;
  onChange: (next: CardTune) => void;
  contentDefault: number;
}) {
  const contentValue = tune.contentRadius ?? contentDefault;
  const [open, setOpen] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 72 });
  const posRef = useRef(pos);
  const panelRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const placed = useRef(false);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    if (placed.current) {
      return;
    }

    placed.current = true;
    setPos({
      x: Math.max(PANEL_MARGIN, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN),
      y: 72,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const head = headRef.current;
    const panel = panelRef.current;
    if (!head || !panel) {
      return;
    }

    let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;

    const clampPos = (x: number, y: number) => {
      const width = panel.offsetWidth || PANEL_WIDTH;
      const height = panel.offsetHeight || 320;
      return {
        x: Math.min(Math.max(x, PANEL_MARGIN), window.innerWidth - width - PANEL_MARGIN),
        y: Math.min(Math.max(y, PANEL_MARGIN), window.innerHeight - Math.min(height, 120) - PANEL_MARGIN),
      };
    };

    const onMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const next = clampPos(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
      posRef.current = next;
      setPos(next);
    };

    const onUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      drag = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if ((event.target as Element | null)?.closest("button")) {
        return;
      }

      event.preventDefault();
      drag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - posRef.current.x,
        offsetY: event.clientY - posRef.current.y,
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
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="card-tune-toggle"
        aria-expanded={open}
        aria-controls="card-tune-panel"
        aria-label={open ? "Hide card controls" : "Show card controls"}
        onClick={() => setOpen((current) => !current)}
      >
        <HugeiconsIcon
          icon={open ? Cancel01Icon : SlidersHorizontalIcon}
          size={16}
          strokeWidth={1.75}
          color="currentColor"
        />
      </button>

      {open ? (
        <aside
          id="card-tune-panel"
          ref={panelRef}
          className="card-tune"
          aria-label="Card controls"
          style={{ left: pos.x, top: pos.y }}
        >
          <header ref={headRef} className="card-tune-head">
            <div className="card-tune-titles">
              <p className="card-tune-kicker">Tune</p>
              <h2 className="card-tune-title">Card</h2>
            </div>
          </header>

          <section className="card-tune-section">
            <h3 className="card-tune-label">Mask</h3>
            <div className="card-switch" role="group" aria-label="Mask">
              <button type="button" aria-pressed={!tune.masked} onClick={() => onChange({ ...tune, masked: false })}>
                Off
              </button>
              <button type="button" aria-pressed={tune.masked} onClick={() => onChange({ ...tune, masked: true })}>
                On
              </button>
            </div>
            <p className="card-tune-note">
              {tune.masked
                ? "Content is clipped to a rounded shape inside the card."
                : "Content keeps its own corners and is not clipped by a radius."}
            </p>
          </section>

          <section className="card-tune-section">
            <h3 className="card-tune-label">Shell background</h3>
            <div className="card-tune-swatches" role="group" aria-label="Shell background">
              {SHELL_BACKGROUNDS.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className="card-tune-swatch"
                  aria-label={swatch.label}
                  aria-pressed={tune.shellBackground === swatch.value}
                  style={{ background: swatch.value }}
                  onClick={() => onChange({ ...tune, shellBackground: swatch.value })}
                />
              ))}
            </div>
            <label className="card-tune-field">
              <span>Custom</span>
              <input
                type="color"
                value={toColorInput(tune.shellBackground)}
                onChange={(event) => onChange({ ...tune, shellBackground: event.target.value })}
              />
            </label>
          </section>

          <section className="card-tune-section">
            <div className="card-tune-row">
              <h3 className="card-tune-label">Shell radius</h3>
              <span className="card-tune-value">{tune.shellRadius}px</span>
            </div>
            <input
              className="card-tune-range"
              type="range"
              min={0}
              max={48}
              step={1}
              value={tune.shellRadius}
              aria-label="Shell radius"
              onChange={(event) => onChange({ ...tune, shellRadius: Number(event.target.value) })}
            />
          </section>

          <section className="card-tune-section" data-disabled={tune.masked ? undefined : ""}>
            <div className="card-tune-row">
              <h3 className="card-tune-label">Content radius</h3>
              <span className="card-tune-value">{contentValue}px</span>
            </div>
            <input
              className="card-tune-range"
              type="range"
              min={0}
              max={80}
              step={1}
              value={contentValue}
              disabled={!tune.masked}
              aria-label="Content radius"
              onChange={(event) => onChange({ ...tune, contentRadius: Number(event.target.value) })}
            />
            <div className="card-tune-actions">
              <button
                type="button"
                className="card-tune-ghost"
                disabled={!tune.masked}
                aria-pressed={tune.contentRadius === null}
                onClick={() => onChange({ ...tune, contentRadius: null })}
              >
                Auto · {contentDefault}px
              </button>
            </div>
            <p className="card-tune-note">
              {tune.masked
                ? tune.contentRadius === null
                  ? "Using this card type’s default content radius."
                  : "Overrides the rounded mask on the content."
                : "Turn Mask on to shape the content."}
            </p>
          </section>
        </aside>
      ) : null}
    </>
  );
}

function toColorInput(value: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, a, b, c] = value;
    return `#${a}${a}${b}${b}${c}${c}`;
  }

  return "#ededed";
}
