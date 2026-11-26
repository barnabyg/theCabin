import { expect, test, type Page } from "@playwright/test";
import { project, view } from "../src/map-camera";
import { walkTo } from "./controls";

async function openPaintedMap(page: Page, url: string) {
  await page.goto(url);
  // The river is flat-coloured until the bundled artwork has decoded and painted.
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement)) return 0;
        const context = canvas.getContext("2d");
        if (!context) return 0;
        const sample = context.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height * 0.91),
          16,
          16,
        );
        return new Set(new Uint32Array(sample.data.buffer)).size;
      }),
    )
    .toBeGreaterThan(32);
}

test("the cabin opens on entry and restores its roof on exit", async ({ page }) => {
  await openPaintedMap(page, "/?scenario=market");
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Map is hidden");
  // Check the roof over L4 and the upper chimney independently.
  const clips = [project([11.5, 0, 3.68]), project([12.47, 1.95, 3.53])].map((p) => ({
    x: Math.round(bounds.x + (p.x * bounds.width) / view.width) - 2,
    y: Math.round(bounds.y + (p.y * bounds.height) / view.height) - 2,
    width: 4,
    height: 4,
  }));
  const sample = () => Promise.all(clips.map((clip) => page.screenshot({ clip })));
  const exterior = await sample();
  await walkTo(page, "K4");
  const interior = await sample();
  for (const [i, patch] of interior.entries()) expect(patch).not.toEqual(exterior[i]);
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#tile-title")).toContainText("K3");
  expect(await sample()).toEqual(exterior);
});

test("the near roof hides the settler standing behind the cabin", async ({ page }) => {
  await openPaintedMap(page, "/?scenario=market");
  const feet = project([11.5, 0, 2.57]);
  const sample = () =>
    page.locator("canvas").evaluate(
      (node, point) => {
        if (!(node instanceof HTMLCanvasElement)) throw new Error("Map is hidden");
        const ctx = node.getContext("2d");
        if (!ctx) throw new Error("Missing map");
        return Array.from(
          ctx.getImageData(point.x * node.width - 2, point.y * node.height - 2, 4, 4).data,
        );
      },
      { x: feet.x / view.width, y: feet.y / view.height },
    );
  const roof = await sample();
  await walkTo(page, "L3");
  await expect(page.locator("#tile-title")).toContainText("L3");
  const after = await sample();
  // Allow rounding from the antialiased edges of individual shakes.
  expect(Math.max(...after.map((value, i) => Math.abs(value - roof[i])))).toBeLessThan(8);
});

test("the QHD clearing uses desktop space and keeps its controls in view", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await openPaintedMap(page, "/");
  const board = await page.locator(".board").boundingBox();
  const notes = await page.locator("#field-notes").boundingBox();
  if (!board || !notes) throw new Error("The map and Field Notes must be visible");
  expect(board.width).toBeGreaterThan(1800);
  expect(board.width / board.height).toBeCloseTo(16 / 9, 2);
  expect(notes.x).toBeGreaterThan(board.x + board.width);
  await expect(page.locator(".controls")).toBeInViewport({ ratio: 1 });
});

test("the projected clearing keeps edge tiles, planning and the river aligned after resize", async ({
  page,
}) => {
  await openPaintedMap(page, "/");
  const board = page.locator(".board");
  async function clickGround(x: number, z: number) {
    const p = project([x, 0, z]);
    const bounds = await board.boundingBox();
    if (!bounds) throw new Error("Map is hidden");
    await board.click({
      position: { x: (p.x * bounds.width) / view.width, y: (p.y * bounds.height) / view.height },
    });
  }
  for (const width of [2560, 1440, 680]) {
    await page.setViewportSize({ width, height: width === 2560 ? 1440 : 980 });
    for (const [x, z, name] of [
      [0.1, 0.1, "A1"],
      [15.9, 0.1, "P1"],
      [0.1, 6.9, "A7"],
      [15.9, 6.9, "P7"],
    ] as const) {
      await clickGround(x, z);
      await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await clickGround(7.5, 8);
    await expect(page.locator("#tile-title")).toContainText("P7");
  }
  await page.getByRole("button", { name: "Build menu" }).click();
  await clickGround(3.5, 3.5);
  await expect(page.locator("#plan-menu")).toContainText("Footprint · D4");
  await clickGround(10.5, 3.5);
  await expect(page.locator("#plan-menu")).toContainText("Footprint · K4");
  await page.getByRole("button", { name: "Return to clearing" }).click();
  await page.getByRole("button", { name: "D4", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tile-title")).toContainText("D4");
  await expect(page.locator("#clock")).toHaveText("6h 00m");
});

test("a click on an overhanging pine selects its tree until it is felled", async ({ page }) => {
  await openPaintedMap(page, "/");
  const board = page.locator(".board");
  const bounds = await board.boundingBox();
  if (!bounds) throw new Error("Map is hidden");
  const crown = project([3.5, 1.02, 3.72]);
  const position = {
    x: (crown.x * bounds.width) / view.width,
    y: (crown.y * bounds.height) / view.height,
  };
  await board.click({ position });
  await expect(page.locator("#tile-title")).toContainText("D4");
  await page.getByRole("button", { name: /Walk here/ }).click();
  await page.getByRole("button", { name: /Fell tree/ }).click();
  await board.click({ position });
  await expect(page.locator("#tile-title")).toContainText("D3");
});
