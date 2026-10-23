export type InkPoint = {
  x: number;
  y: number;
};

export type InkStroke = {
  id: string;
  points: InkPoint[];
  width: number;
  color: string;
  closed: boolean;
};

export type VisualStroke = {
  id: string;
  d: string;
  width: number;
  color: string;
  hipX: number;
  hipY: number;
  cx: number;
  cy: number;
  dot: { x: number; y: number } | null;
};

export type ScreenBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MonsterDrawing = {
  strokes: InkStroke[];
  visual: VisualStroke[];
  screenBox: ScreenBox;
  shapeIds: string[];
};

export type Mood = "friendly" | "grumpy";

export type Gait = "legs" | "hop" | "roll";

export type SizeWord = "small" | "medium" | "large";

export type MonsterTraits = {
  name: string;
  ink: number;
  size: SizeWord;
  speed: number;
  mass: number;
  mood: Mood;
  jaggedness: number;
  roundness: number;
  gait: Gait;
  legIds: string[];
  looseness: number;
  lifespan: number;
};

export type Collider = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay: boolean;
};

export type CreaturePhase = "peel" | "live" | "decay" | "done";

export type CreatureState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  roll: number;
  phase: CreaturePhase;
  age: number;
  life: number;
  peel: number;
  squash: number;
  ram: number;
  stun: number;
  hop: number;
  bob: number;
  decay: number;
  gait: Gait;
  mood: Mood;
  speed: number;
  mass: number;
  reduced: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  naturalW: number;
  naturalH: number;
};
