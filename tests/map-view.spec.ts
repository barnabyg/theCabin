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
  // Sample the centre of L4, away from the settler and the selected tile.
  const p = project([11.5, 0, 3.68]);
  const clip = {
    x: Math.round(bounds.x + (p.x * bounds.width) / view.width) - 5,
    y: Math.round(bounds.y + (p.y * bounds.height) / view.height) - 5,
    width: 10,
    height: 10,
  };
  const exterior = await page.screenshot({ clip });
  await walkTo(page, "K4");
  expect(await page.screenshot({ clip })).not.toEqual(exterior);
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#tile-title")).toContainText("K3");
  expect(await page.screenshot({ clip })).toEqual(exterior);
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
  for (const width of [1440, 680]) {
    await page.setViewportSize({ width, height: 980 });
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
