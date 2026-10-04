import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftCanvasViewportStable,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftFieldByLabel,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";

const productCanvas =
  '[data-toolcraft-product-output="ascii-journal-canvas"]';
const sourceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160">
  <rect width="3840" height="2160" fill="#fafafa"/>
  <rect width="1536" height="2160" fill="#111111"/>
  <circle cx="2600" cy="1080" r="680" fill="#777777"/>
</svg>`;

async function uploadSource(page: Page, name = "performance-4k.svg") {
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(sourceSvg),
    mimeType: "image/svg+xml",
    name,
  });
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function chooseOption(page: Page, label: string, option: string) {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.getByRole("combobox").click();
  await page.getByText(option, { exact: true }).last().click();
}

async function setRenderScale(page: Page, value: unknown) {
  const scale = Number(value);
  const slider = page.getByRole("slider", { name: "Resolution scale" });
  await expect(slider).toBeVisible();
  await slider.press(scale >= 2 ? "End" : "Home");
}

test.describe.configure({ timeout: 60_000 });

test("browser perf: worst-case ASCII preview stays under budget", async ({
  page,
}) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "ascii-preview-stress",
    {
      columns: async (value) => {
        await dragToolcraftSliderByLabel(page, "Columns", Number(value) / 220);
      },
      renderScale: async (value) => {
        await setRenderScale(page, value);
      },
      sourceMedia: async () => {
        await uploadSource(page);
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    productCanvas,
    2,
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.72);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "ascii-preview-stress",
  );
});

test("browser perf: maximum ASCII columns stay under budget", async ({
  page,
}) => {
  await page.goto("/");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "ascii-columns-max",
    {
      renderScale: async (value) => {
        await setRenderScale(page, value);
      },
      sourceMedia: async () => {
        await uploadSource(page);
      },
    },
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Columns",
      appPerformance,
      "ascii-columns-max",
    );
    await dragToolcraftSliderByLabel(page, "Columns", 1);
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    productCanvas,
    2,
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "ascii-columns-max",
  );
});

test("browser perf: source.image workload stays responsive", async ({
  page,
}) => {
  await page.goto("/");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-source-image",
    {
      columns: async (value) => {
        await dragToolcraftSliderByLabel(page, "Columns", Number(value) / 220);
      },
      renderScale: async (value) => {
        await setRenderScale(page, value);
      },
    },
  );
  getToolcraftPerformanceStressValue(
    appPerformance,
    "workload-source-image",
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Reset Source section" }).click();
    await uploadSource(page);
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    productCanvas,
    2,
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "workload-source-image",
  );
});

test("browser perf: 4K source import stays responsive", async ({ page }) => {
  await page.goto("/");
  getToolcraftPerformanceStressValue(appPerformance, "source-media-import");
  const result = await measureToolcraftInteraction(page, async () => {
    await uploadSource(page, "source-import-4k.svg");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "source-media-import",
  );
});

test(
  "browser perf: export.image.resolution workload stays responsive",
  async ({ page }) => {
    await page.goto("/");
    await applyToolcraftPerformanceWorkloadFixture(
      page,
      appPerformance,
      "workload-export-image-resolution",
      {
        columns: async (value) => {
          await dragToolcraftSliderByLabel(page, "Columns", Number(value) / 220);
        },
        sourceMedia: async () => {
          await uploadSource(page);
        },
      },
    );
    getToolcraftPerformanceStressValue(
      appPerformance,
      "workload-export-image-resolution",
    );
    const result = await measureToolcraftInteraction(page, async () => {
      await chooseOption(page, "Resolution", "8K");
      await page.getByRole("button", { name: "Export PNG" }).click({
        trial: true,
      });
    });
    await expect(page.locator(productCanvas)).toBeVisible();
    expectToolcraftScenarioPerformanceBudget(
      result,
      appPerformance,
      "workload-export-image-resolution",
    );
  },
);

test("browser perf: 4K ASCII export stays under budget", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  getToolcraftPerformanceStressValue(appPerformance, "image-export-4k");
  await chooseOption(page, "Resolution", "4K");
  const download = page.waitForEvent("download");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
    await download;
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    { ...result, exportMs: result.durationMs },
    appPerformance,
    "image-export-4k",
  );
});

test("browser perf: ASCII viewport stays stable", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.76);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "ascii-viewport-stability",
  );
});

test("browser perf: dense ASCII viewport zoom remains smooth", async ({
  page,
}) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "ascii-viewport-zoom-stress",
    {
      columns: async (value) => {
        await dragToolcraftSliderByLabel(page, "Columns", Number(value) / 220);
      },
      renderScale: async (value) => {
        await setRenderScale(page, value);
      },
    },
  );
  await uploadSource(page);
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    productCanvas,
    2,
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 2);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "ascii-viewport-zoom-stress",
  );
});

test("browser perf: source.inboxItem remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseOption(page, "Paper inbox", "Inbox is empty");
    await page.getByRole("button", { name: "Refresh list" }).click();
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-source-inboxItem",
  );
});

test("browser perf: source.inboxActions remains responsive", async ({
  page,
}) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Refresh list" }).click();
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-source-inboxActions",
  );
});

test("browser perf: ascii.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseOption(page, "Character set", "Blocks");
    await page.getByRole("button", { name: "Reset Illustration section" }).click({
      trial: true,
    });
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-ascii-preset",
  );
});

test("browser perf: ascii.characters remains responsive", async ({ page }) => {
  await page.goto("/");
  await chooseOption(page, "Character set", "Custom");
  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Custom ramp");
    await field.getByRole("textbox").fill("#+- ");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-ascii-characters",
  );
});

test("browser perf: ascii.contrast remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.84);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-ascii-contrast",
  );
});

test("browser perf: ascii.invert remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Invert");
    await field.getByRole("switch").click();
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-ascii-invert",
  );
});

test("browser perf: appearance.inks remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Inks");
    await field.getByRole("textbox").first().fill("#334455");
    await field.getByRole("textbox").first().press("Enter");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-appearance-inks",
  );
});

test("browser perf: journal.entryId remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Entry");
    await field.getByRole("combobox").click();
    await page.getByRole("option").last().click();
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-journal-entryId",
  );
});

test("browser perf: journal.alt remains responsive", async ({ page }) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    const field = await getToolcraftFieldByLabel(page, "Alt text");
    await field.getByRole("textbox").fill("ASCII illustration");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-journal-alt",
  );
});

test(
  "browser perf: export.includeBackground remains responsive",
  async ({ page }) => {
    await page.goto("/");
    const result = await measureToolcraftInteraction(page, async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      await field.getByRole("switch").click();
    });
    await expect(page.locator(productCanvas)).toBeVisible();
    expectToolcraftScenarioPerformanceBudget(
      result,
      appPerformance,
      "responsive-export-includeBackground",
    );
  },
);

test(
  "browser perf: appearance.background remains responsive",
  async ({ page }) => {
    await page.goto("/");
    const result = await measureToolcraftInteraction(page, async () => {
      const field = await getToolcraftFieldByLabel(page, "Background");
      await field.getByRole("textbox").fill("#eeeeee");
      await field.getByRole("textbox").press("Enter");
    });
    await expect(page.locator(productCanvas)).toBeVisible();
    expectToolcraftScenarioPerformanceBudget(
      result,
      appPerformance,
      "responsive-appearance-background",
    );
  },
);

test("browser perf: export.image.format remains responsive", async ({
  page,
}) => {
  await page.goto("/");
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseOption(page, "Format", "JPG");
    await page.getByRole("button", { name: "Export PNG" }).click({
      trial: true,
    });
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "responsive-export-image-format",
  );
});
