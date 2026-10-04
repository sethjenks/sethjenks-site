"use client";

import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 8;

type KeyButtonProps = {
  href: string;
  children: string;
  play?: boolean;
};

export function KeyButton({ href, children, play = false }: KeyButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, dragged: false, armed: false });

  const onPointerDown = useCallback((event: PointerEvent<HTMLAnchorElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
      armed: true,
    };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLAnchorElement>) => {
    if (dragRef.current.armed) {
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        dragRef.current.dragged = true;
      }
    }

    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    node.dataset.lit = "";
    node.style.setProperty("--key-light-x", `${(x * 100).toFixed(2)}%`);
    node.style.setProperty("--key-light-y", `${(y * 100).toFixed(2)}%`);
    node.style.setProperty("--key-shadow-x", `${((0.5 - x) * 4).toFixed(2)}px`);
    node.style.setProperty("--key-shadow-y", `${(3 + (0.5 - y) * 2.5).toFixed(2)}px`);
  }, []);

  const onPointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    delete node.dataset.lit;
    node.style.removeProperty("--key-light-x");
    node.style.removeProperty("--key-light-y");
    node.style.removeProperty("--key-shadow-x");
    node.style.removeProperty("--key-shadow-y");
  }, []);

  const onClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (dragRef.current.dragged) {
      event.preventDefault();
    }
    dragRef.current.armed = false;
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      className="key-button"
      data-play-button={play ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      <span className="key-button-shadow" aria-hidden="true" />
      <span className="key-button-rim" aria-hidden="true" />
      <span className="key-button-face">
        <span className="key-button-label">{children}</span>
        <span className="key-button-filament" aria-hidden="true" />
        <span className="key-button-specular" aria-hidden="true" />
        <span className="key-button-tint-left" aria-hidden="true" />
        <span className="key-button-tint-right" aria-hidden="true" />
        <span className="key-button-haze" aria-hidden="true" />
        <span className="key-button-basin" aria-hidden="true" />
        <span className="key-button-texture" aria-hidden="true" />
        <span className="key-button-wash" aria-hidden="true" />
        <span className="key-button-glare" aria-hidden="true" />
      </span>
    </a>
  );
}
