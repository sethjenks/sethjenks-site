export type VideoPlayMode = "auto" | "hover";

export type CardLayer =
  | { kind: "image"; src: string; position?: string; opacity?: number; fit?: "cover" | "contain" }
  | { kind: "video"; src: string; poster?: string; playMode?: VideoPlayMode; opacity?: number; fit?: "cover" | "contain" }
  | { kind: "embed"; src: string; title: string; opacity?: number }
  | { kind: "texture"; gradient: string; opacity?: number }
  | { kind: "shader"; preset: "soft"; opacity?: number }
  | { kind: "noise"; opacity?: number };

export type CardMedia = {
  /** Painted under layers. The surface always starts from #ededed. */
  layers: CardLayer[];
};

const LAYER_ORDER = ["image", "video", "embed", "texture", "shader", "noise"] as const;

export function embedLayer(media: CardMedia | undefined): Extract<CardLayer, { kind: "embed" }> | undefined {
  const layer = media?.layers.find((item) => item.kind === "embed");
  return layer?.kind === "embed" ? layer : undefined;
}

export function orderedLayers(layers: readonly CardLayer[]): CardLayer[] {
  const first = new Map<CardLayer["kind"], CardLayer>();
  for (const layer of layers) {
    if (!first.has(layer.kind)) {
      first.set(layer.kind, layer);
    }
  }

  return LAYER_ORDER.flatMap((kind) => {
    const layer = first.get(kind);
    return layer ? [layer] : [];
  });
}

export function imageLayer(media: CardMedia | undefined): Extract<CardLayer, { kind: "image" }> | undefined {
  const layer = media?.layers.find((item) => item.kind === "image");
  return layer?.kind === "image" ? layer : undefined;
}
