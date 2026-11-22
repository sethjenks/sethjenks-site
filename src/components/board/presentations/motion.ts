export const ENTER_EASE = [0.32, 0.72, 0, 1] as const;
export const EXIT_EASE = [0.32, 0.72, 0, 1] as const;
export const MOVE_EASE = [0.22, 1, 0.36, 1] as const;
export const OPEN_SHELL_S = 0.42;
export const CLOSED_HOVER_SCALE = 1.08;
export const CLOSED_HOVER_S = 0.4;
export const HOVER_EASE = [0.23, 1, 0.32, 1] as const;
export const ENTER_FADE_S = 0.36;
export const EXIT_FADE_S = 0.16;
export const STAGGER_S = 0.11;
export const MAX_FADE_RING = 4;
export const CLOSE_MOVE_DELAY_S = (MAX_FADE_RING - 1) * STAGGER_S + EXIT_FADE_S;
export const CLOSE_TOTAL_S = CLOSE_MOVE_DELAY_S + OPEN_SHELL_S;
export const CLOSE_APPEAR_BUFFER_S = 0.08;

export function moveTransition(reduced: boolean, duration: number, delay = 0) {
  if (reduced) {
    return { duration: 0, delay: 0 };
  }

  return {
    duration,
    ease: MOVE_EASE,
    delay,
  };
}

export function shellVariants(
  closed: { x: number; y: number; width: number; height: number },
  open: { x: number; y: number; width: number; height: number },
  reduced: boolean,
) {
  return {
    closed: {
      ...closed,
      transition: moveTransition(reduced, OPEN_SHELL_S, CLOSE_MOVE_DELAY_S),
    },
    open: {
      ...open,
      transition: moveTransition(reduced, OPEN_SHELL_S),
    },
  };
}

export function shiftVariants(x: number, y: number, reduced: boolean) {
  return {
    closed: {
      x,
      y,
      transition: moveTransition(reduced, OPEN_SHELL_S, CLOSE_MOVE_DELAY_S),
    },
    open: {
      x: 0,
      y: 0,
      transition: moveTransition(reduced, OPEN_SHELL_S),
    },
  };
}

export function tileVariants(ring: number, reduced: boolean) {
  const fadeRing = Math.min(MAX_FADE_RING, Math.max(1, ring));

  return {
    closed: {
      opacity: 0,
      transition: {
        duration: reduced ? 0 : EXIT_FADE_S,
        ease: EXIT_EASE,
        delay: reduced ? 0 : (MAX_FADE_RING - fadeRing) * STAGGER_S,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: reduced ? 0 : ENTER_FADE_S,
        ease: ENTER_EASE,
        delay: reduced ? 0 : OPEN_SHELL_S + (fadeRing - 1) * STAGGER_S,
      },
    },
  };
}
