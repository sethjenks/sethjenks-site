import { paintPlate } from "@ascii-plate";
import {
  getToolcraftTimelineLoopProgress,
  getToolcraftTimelineLoopTime,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { geistMonoReady } from "./geist-mono";
import {
  buildAsciiPlateRecipe,
  getAsciiSourceAsset,
  loadAsciiSourceImage,
  readAsciiRenderSettings,
} from "./renderer/ascii-renderer";

const VIDEO_FPS = 12;

function pickSupportedVideoType(format: string): {
  extension: "mp4" | "webm";
  mimeType: string;
} {
  const mp4Types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
  ];
  const webmTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const preferred = format === "webm" ? webmTypes : mp4Types;
  const fallback = format === "webm" ? mp4Types : webmTypes;

  for (const mimeType of preferred) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return {
        extension: format === "webm" ? "webm" : "mp4",
        mimeType,
      };
    }
  }

  for (const mimeType of fallback) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return {
        extension: mimeType.includes("webm") ? "webm" : "mp4",
        mimeType,
      };
    }
  }

  throw new Error("This browser cannot encode MP4 or WebM video.");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function renderAsciiVideoBlob(
  state: ToolcraftState,
): Promise<{
  blob: Blob;
  durationSeconds: number;
  fileName: string;
  height: number;
  mimeType: string;
  width: number;
}> {
  const source = getAsciiSourceAsset(state);
  if (!source) {
    throw new Error("Add a source image before exporting video.");
  }

  const format = String(state.values["export.video.format"] ?? "mp4").toLowerCase();
  const videoResolution = String(
    state.values["export.video.resolution"] ?? "current",
  ).toLowerCase();
  const size = getToolcraftVideoExportSize({
    resolution: videoResolution,
    state,
  });
  const includeBackground = shouldIncludeToolcraftExportBackground({
    format: "video",
    schema: state.schema,
  });
  const durationSeconds = state.timeline.durationSeconds;
  const frameCount = Math.max(1, Math.round(durationSeconds * VIDEO_FPS));
  const { extension, mimeType } = pickSupportedVideoType(format);

  await geistMonoReady;
  const image = await loadAsciiSourceImage(source);
  const settings = {
    ...readAsciiRenderSettings(state),
    includeBackground,
  };
  const recipe = buildAsciiPlateRecipe({
    asset: source,
    height: size.height,
    image,
    settings,
    width: size.width,
  });

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Video export requires a 2D canvas context.");
  }

  const stream = canvas.captureStream(0);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      const encoderError =
        "error" in event && event.error instanceof Error
          ? event.error
          : new Error("Video encoder failed.");
      reject(encoderError);
    };
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const currentTimeSeconds = (frameIndex / frameCount) * durationSeconds;
    const timestampSeconds = getToolcraftTimelineLoopTime({
      currentTimeSeconds,
      durationSeconds,
    });
    const progress = getToolcraftTimelineLoopProgress({
      currentTimeSeconds: timestampSeconds,
      durationSeconds,
    });

    context.fillStyle = settings.background;
    context.fillRect(0, 0, size.width, size.height);
    paintPlate(
      context,
      recipe,
      {
        fontFamily:
          '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        progress,
      },
      {
        height: size.height,
        includeBackground: false,
        width: size.width,
      },
    );

    const [track] = stream.getVideoTracks();
    if (track && "requestFrame" in track && typeof track.requestFrame === "function") {
      track.requestFrame();
    }
    await wait(1000 / VIDEO_FPS);
  }

  recorder.stop();
  const blob = await recorded;
  if (blob.size === 0) {
    throw new Error("Video encoder produced an empty file.");
  }

  return {
    blob,
    durationSeconds,
    fileName: `ascii-journal-${videoResolution}.${extension}`,
    height: size.height,
    mimeType,
    width: size.width,
  };
}
