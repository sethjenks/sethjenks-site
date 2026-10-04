import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  dragCanvasHandle,
  expectCanvasHandlesUseToolcraftVisualLanguage,
  expectExportExcludesCanvasHandles,
  expectNoForbiddenCanvasUi,
} from "./canvas-handle-helpers";
import {
  dragToolcraftSliderByLabel,
  getToolcraftFieldByLabel,
} from "./performance-control-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";

const productCanvas =
  '[data-toolcraft-product-output="ascii-journal-canvas"]';
const siteRoot = path.resolve(import.meta.dirname, "../../..");
const inboxDir = path.join(siteRoot, "studio", "inbox");
const entriesDir = path.join(siteRoot, "content", "entries");
const mediaDir = path.join(siteRoot, "public", "media");

const sourceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#fafafa"/>
  <rect width="760" height="680" fill="#111111"/>
  <circle cx="1280" cy="330" r="300" fill="#777777"/>
  <rect x="1400" y="760" width="420" height="250" fill="#222222"/>
</svg>`;

async function uploadSource(page: Page, name = "source.svg"): Promise<void> {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    buffer: Buffer.from(sourceSvg),
    mimeType: "image/svg+xml",
    name,
  });
  await expect(page.getByRole("img", { name })).toBeVisible();
}

async function selectToolcraftOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.getByRole("combobox").click();
  await page.getByText(option, { exact: true }).last().click();
}

async function decodedDimensions(
  page: Page,
  bytes: Buffer,
  mimeType: string,
): Promise<{ height: number; width: number }> {
  return page.evaluate(
    async ({ encoded, type }) => {
      const binary = atob(encoded);
      const data = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      const bitmap = await createImageBitmap(new Blob([data], { type }));
      const result = { height: bitmap.height, width: bitmap.width };
      bitmap.close();
      return result;
    },
    { encoded: bytes.toString("base64"), type: mimeType },
  );
}

test.describe.configure({ timeout: 60_000 });

test("browser: applies ASCII illustration controls to product output", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(productCanvas)).toBeVisible();

  await expectToolcraftProductObservableToChange(page, () => uploadSource(page), {
    selector: productCanvas,
  });
  await expectToolcraftProductObservableToChange(
    page,
    () => dragToolcraftSliderByLabel(page, "Columns", 0.9),
    { selector: productCanvas },
  );
  await expectToolcraftProductObservableToChange(
    page,
    () => selectToolcraftOption(page, "Character set", "Blocks"),
    { selector: productCanvas },
  );
  await expectToolcraftProductObservableToChange(
    page,
    () => dragToolcraftSliderByLabel(page, "Contrast", 0.8),
    { selector: productCanvas },
  );

  const invert = (await getToolcraftFieldByLabel(page, "Invert")).getByRole(
    "switch",
  );
  await expectToolcraftProductObservableToChange(page, () => invert.click(), {
    selector: productCanvas,
  });

  const tick = (await getToolcraftFieldByLabel(page, "Show tick marks")).getByRole(
    "switch",
  );
  await expectToolcraftProductObservableToChange(page, () => tick.click(), {
    selector: productCanvas,
  });

  await expectToolcraftProductObservableToChange(
    page,
    () => dragToolcraftSliderByLabel(page, "Zoom", 0.8),
    { selector: productCanvas },
  );

  const offset = await getToolcraftFieldByLabel(page, "Offset");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      // vector.x
      await offset.getByLabel("Offset X").fill("0.35");
      await offset.getByLabel("Offset X").press("Enter");
      // vector.y
      await offset.getByLabel("Offset Y").fill("-0.20");
      await offset.getByLabel("Offset Y").press("Enter");
    },
    { selector: productCanvas },
  );

  const inks = await getToolcraftFieldByLabel(page, "Inks");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      // collectionActions.add
      await page.getByRole("button", { name: "Add ink" }).click();
    },
    { selector: productCanvas },
  );
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      // collectionActions.items
      const swatch = inks.getByRole("textbox").last();
      await swatch.fill("#cc3333");
      await swatch.press("Enter");
    },
    { selector: productCanvas },
  );
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      // collectionActions.remove
      await page.getByRole("button", { name: "Remove ink" }).click();
    },
    { selector: productCanvas },
  );
});

test("browser: frame handle reframes the source crop", async ({ page }) => {
  await page.goto("/");
  await expectToolcraftProductObservableToChange(page, () => uploadSource(page), {
    selector: productCanvas,
  });
  await dragToolcraftSliderByLabel(page, "Zoom", 0.8);
  await expectNoForbiddenCanvasUi(page);
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);
  await expectToolcraftProductObservableToChange(
    page,
    () => dragCanvasHandle(page, "ascii-frame-handle", { x: 48, y: -24 }),
    { selector: productCanvas },
  );
  await expectExportExcludesCanvasHandles(page, async () => {
    // browser: frame handle stays out of export
    await page.getByRole("button", { name: "Export PNG" }).click();
  });
});

test("browser: frame handle stays out of export", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await expectNoForbiddenCanvasUi(page);
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);
  await expectExportExcludesCanvasHandles(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
  });
});

test("browser: imports transforms and clears source image", async ({ page }) => {
  await page.goto("/");
  await expectToolcraftProductObservableToChange(page, () => uploadSource(page), {
    selector: productCanvas,
  });

  for (const actionName of ["90° Right", "Flip horizontal", "Flip vertical"]) {
    await test.step(actionName, async () => {
      await expectToolcraftProductObservableToChange(
        page,
        () => page.getByRole("button", { name: actionName }).click(),
        { selector: productCanvas },
      );
    });
  }

  await expectToolcraftProductObservableToChange(
    page,
    () => page.getByRole("button", { name: "Remove image" }).click(),
    { selector: productCanvas },
  );
  await expect(page.getByRole("img", { name: "source.svg" })).toHaveCount(0);

  await uploadSource(page);
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.getByRole("img", { name: "source.svg" })).toHaveCount(0);
});

test("browser: loads Paper inbox image", async ({ page }) => {
  const inboxFile = "paper-inbox-test.svg";
  const inboxPath = path.join(inboxDir, inboxFile);
  await mkdir(inboxDir, { recursive: true });
  await writeFile(inboxPath, sourceSvg, "utf8");

  try {
    await page.goto("/");
    await selectToolcraftOption(page, "Paper inbox", inboxFile);
    await expectToolcraftProductObservableToChange(
      page,
      () => page.getByRole("button", { name: "Load selected" }).click(),
      { selector: productCanvas },
    );
    await expect(page.getByRole("img", { name: inboxFile })).toBeVisible();
  } finally {
    await rm(inboxPath, { force: true });
    await page.waitForTimeout(500);
  }
});

test("browser: exports and assigns ASCII journal output", async ({ page }) => {
  const entryId = "ascii-studio-test";
  const entryPath = path.join(entriesDir, `2099-01-01-${entryId}.json`);
  const mediaPath = path.join(mediaDir, `${entryId}.png`);
  const platePath = path.join(mediaDir, `${entryId}.plate.json`);
  await writeFile(
    entryPath,
    `${JSON.stringify(
      {
        id: entryId,
        date: "2099-01-01",
        title: "ASCII studio test",
        summary: "Temporary browser acceptance fixture.",
        hidden: true,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    await page.goto("/");
    await expectToolcraftProductObservableToChange(
      page,
      () => uploadSource(page),
      { selector: productCanvas },
    );

    await selectToolcraftOption(page, "Format", "PNG");
    await selectToolcraftOption(page, "Resolution", "2K");
    const pngDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const pngDownload = await pngDownloadPromise;
    const pngPath = await pngDownload.path();
    expect(pngPath).not.toBeNull();
    const pngBytes = await readFile(pngPath!);
    expect(await decodedDimensions(page, pngBytes, "image/png")).toEqual({
      height: 1024,
      width: 2048,
    });
    await expect(page.getByRole("img", { name: "source.svg" })).toBeVisible();

    await selectToolcraftOption(page, "Format", "JPG");
    await selectToolcraftOption(page, "Resolution", "4K");
    const jpgDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const jpgDownload = await jpgDownloadPromise;
    const jpgPath = await jpgDownload.path();
    expect(jpgPath).not.toBeNull();
    const jpgBytes = await readFile(jpgPath!);
    expect(await decodedDimensions(page, jpgBytes, "image/jpeg")).toEqual({
      height: 2048,
      width: 4096,
    });
    await expect(page.getByRole("img", { name: "source.svg" })).toBeVisible();

    await selectToolcraftOption(page, "Entry", "2099-01-01 — ASCII studio test");
    const altField = await getToolcraftFieldByLabel(page, "Alt text");
    await altField.getByRole("textbox").fill("Black ASCII marks form a circle.");
    await altField.getByRole("textbox").blur();
    await expect(altField.getByRole("textbox")).toHaveValue(
      "Black ASCII marks form a circle.",
    );
    await expect(page.getByRole("img", { name: "source.svg" })).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/journal/assign") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Assign to post" }).click();
    await expect((await responsePromise).ok()).toBe(true);

    const entry = JSON.parse(await readFile(entryPath, "utf8")) as {
      media?: { alt?: string; plate?: string; src?: string; type?: string };
    };
    expect(entry.media).toEqual({
      alt: "Black ASCII marks form a circle.",
      plate: `/media/${entryId}.plate.json`,
      src: `/media/${entryId}.png`,
      type: "plate",
    });
    expect((await readFile(mediaPath)).byteLength).toBeGreaterThan(1024);
    expect((await readFile(platePath)).byteLength).toBeGreaterThan(64);

    const include = (
      await getToolcraftFieldByLabel(page, "Include")
    ).getByRole("switch");
    const before = await getToolcraftProductObservableSnapshot(page, {
      selector: productCanvas,
    });
    await include.click();
    const after = await getToolcraftProductObservableSnapshot(page, {
      selector: productCanvas,
    });
    expect(after).not.toEqual(before);
  } finally {
    await rm(entryPath, { force: true });
    await rm(mediaPath, { force: true });
    await rm(platePath, { force: true });
  }
});

test("browser: edits canvas size and keeps ASCII output stable", async ({
  page,
}) => {
  await page.goto("/");
  await uploadSource(page);

  const before = await getToolcraftProductObservableSnapshot(page, {
    selector: productCanvas,
  });
  const widthField = await getToolcraftFieldByLabel(page, "Canvas width");
  await widthField.getByRole("textbox").fill("1600");
  await widthField.getByRole("textbox").press("Enter");
  const heightField = await getToolcraftFieldByLabel(page, "Canvas height");
  await heightField.getByRole("textbox").fill("900");
  await heightField.getByRole("textbox").press("Enter");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Center canvas" }).click();

  const after = await getToolcraftProductObservableSnapshot(page, {
    selector: productCanvas,
  });
  expect(after).not.toEqual(before);
  await expect(page.locator(productCanvas)).toBeVisible();
});

test("browser: timeline playback transport controls runtime time", async ({
  page,
}) => {
  await page.goto("/");
  await uploadSource(page);

  const before = await getToolcraftProductObservableSnapshot(page, {
    selector: productCanvas,
  });
  const play = page.getByRole("button", { name: /Play playback|Pause playback/ });
  if (await play.getByText("Pause playback").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Pause playback" }).click();
  }
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const durationBox = page.getByRole("textbox", { name: "timeline duration" });
  await durationBox.fill("4");
  await durationBox.press("Enter");
  const scrubber = page.locator("[aria-valuemax]").first();
  await expect(scrubber).toHaveAttribute("aria-valuemax", /4|4\.0/);
  await page.getByRole("button", { name: "Play playback" }).click();
  await page.waitForTimeout(400);
  const after = await getToolcraftProductObservableSnapshot(page, {
    selector: productCanvas,
  });
  expect(after).not.toEqual(before);
});

async function selectLastToolcraftOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  const field = page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .last();
  await expect(field).toBeVisible();
  await field.getByRole("combobox").click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("browser: exports looping plate video", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);

  await selectLastToolcraftOption(page, "Format", "WebM");
  await selectLastToolcraftOption(page, "Resolution", "Current");
  const currentDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const currentDownload = await currentDownloadPromise;
  const currentPath = await currentDownload.path();
  expect(currentPath).not.toBeNull();
  const currentBytes = await readFile(currentPath!);
  const currentDuration = await page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("video")), {
        once: true,
      });
    });
    const duration = video.duration;
    URL.revokeObjectURL(url);
    return duration;
  }, currentBytes.toString("base64"));
  expect(currentDuration).toBeGreaterThan(2);
  expect(currentDuration).toBeLessThan(5);

  await selectLastToolcraftOption(page, "Resolution", "4K");
  const fourKDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Video" }).click();
  const fourKDownload = await fourKDownloadPromise;
  const fourKPath = await fourKDownload.path();
  expect(fourKPath).not.toBeNull();
  const fourKBytes = await readFile(fourKPath!);
  const fourKSize = await page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("video")), {
        once: true,
      });
    });
    const size = { height: video.videoHeight, width: video.videoWidth };
    URL.revokeObjectURL(url);
    return size;
  }, fourKBytes.toString("base64"));
  expect(fourKSize.width).toBeGreaterThan(1000);
  expect(fourKSize.width).toBeLessThanOrEqual(3840);
  expect(fourKSize.height).toBeGreaterThan(500);
  expect(fourKSize.height).toBeLessThanOrEqual(2160);
});

