import type { ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { renderAsciiVideoBlob } from "./export-video";
import {
  createAsciiPlateRecipeFromState,
  renderAsciiExportCanvas,
} from "./renderer/ascii-canvas";

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Browser could not encode the illustration."));
      },
      mimeType,
      0.94,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read image bytes."));
    reader.readAsDataURL(blob);
  });
}

async function getImageSize(
  dataUrl: string,
): Promise<{ height: number; unit: "px"; width: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        height: image.naturalHeight,
        unit: "px",
        width: image.naturalWidth,
      });
    image.onerror = () => reject(new Error("Could not decode the inbox image."));
    image.src = dataUrl;
  });
}

async function loadInboxImage({
  dispatch,
  fileName,
}: {
  dispatch: Parameters<ToolcraftPanelActionHandler>[0]["dispatch"];
  fileName: string;
}): Promise<void> {
  if (!fileName || fileName === "__none__") {
    throw new Error("Put a Paper export in studio/inbox, then refresh the list.");
  }

  const response = await fetch(
    `/api/journal/inbox?name=${encodeURIComponent(fileName)}`,
  );
  if (!response.ok) {
    throw new Error(`Could not load ${fileName}.`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  const size = await getImageSize(dataUrl);

  dispatch({
    asset: {
      assetKind: "image",
      dataUrl,
      fileName,
      mimeType: blob.type || "image/png",
      position: { x: 0, y: 0 },
      size,
      sourceTarget: "source.image",
    },
    replaceExisting: true,
    type: "media.import",
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = fileName;
  anchor.href = url;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function postAssignment(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/journal/assign", {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const result = (await response.json()) as {
    error?: string;
    mediaSrc?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "Could not assign the illustration.");
  }
}

export const handleAsciiPanelAction: ToolcraftPanelActionHandler = ({
  action,
  dispatch,
  reportProgress,
  state,
}) => {
  if (action.value === "inbox.refresh") {
    window.location.reload();
    return;
  }

  if (action.value === "inbox.load") {
    return loadInboxImage({
      dispatch,
      fileName: String(state.values["source.inboxItem"] ?? ""),
    });
  }

  if (action.value === "marks.reshuffle") {
    dispatch({
      history: "merge",
      label: "New variation",
      target: "marks.seed",
      type: "controls.setValue",
      value: String(Math.floor(Math.random() * 99_999) + 1),
    });
    return;
  }

  if (action.value === "export.png") {
    return (async () => {
      reportProgress(0.08);
      await nextPaint();

      const format = String(
        state.values["export.image.format"] ?? "png",
      ).toLowerCase();
      const imageResolution = String(
        state.values["export.image.resolution"] ?? "2k",
      ).toLowerCase();
      const canvas = await renderAsciiExportCanvas({ imageResolution, state });

      reportProgress(0.72);
      await nextPaint();

      const isJpeg = format === "jpg";
      const blob = await canvasToBlob(
        canvas,
        isJpeg ? "image/jpeg" : "image/png",
      );
      downloadBlob(
        blob,
        `ascii-journal-${imageResolution}.${isJpeg ? "jpg" : "png"}`,
      );
      reportProgress(1);
    })();
  }

  if (action.value === "export.video") {
    return (async () => {
      reportProgress(0.08);
      await nextPaint();
      const exported = await renderAsciiVideoBlob(state);
      reportProgress(0.86);
      downloadBlob(exported.blob, exported.fileName);
      reportProgress(1);
    })();
  }

  if (action.value !== "journal.assign") {
    return;
  }

  return (async () => {
    const entryId = String(state.values["journal.entryId"] ?? "");
    const alt = String(state.values["journal.alt"] ?? "").trim();
    const assignKind = String(state.values["journal.assignKind"] ?? "plate");

    if (!entryId || entryId === "__none__") {
      throw new Error("Choose a journal entry before assigning.");
    }
    if (!alt) {
      throw new Error("Add alt text before assigning the illustration.");
    }

    reportProgress(0.08);

    if (assignKind === "video") {
      const exported = await renderAsciiVideoBlob(state);
      reportProgress(0.72);
      const dataUrl = await blobToDataUrl(exported.blob);
      await postAssignment({
        alt,
        entryId,
        kind: "video",
        mimeType: exported.mimeType,
        videoDataUrl: dataUrl,
      });
      reportProgress(1);
      return;
    }

    const canvas = await renderAsciiExportCanvas({
      imageResolution: "2k",
      state,
    });
    reportProgress(0.62);
    const blob = await canvasToBlob(canvas, "image/png");
    const dataUrl = await blobToDataUrl(blob);

    if (assignKind === "still") {
      await postAssignment({ alt, dataUrl, entryId, kind: "still" });
      reportProgress(1);
      return;
    }

    const plate = await createAsciiPlateRecipeFromState(state);
    await postAssignment({
      alt,
      dataUrl,
      entryId,
      kind: "plate",
      plate,
    });
    reportProgress(1);
  })();
};
