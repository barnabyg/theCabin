import { expect, test } from "@playwright/test";
import { project, view } from "../src/map-camera";
import { action, reserveOpen, walkTo } from "./controls";

test("the cabin outline follows the pointer and one click reserves its footprint", async ({
  page,
}) => {
  await page.goto("/");
  await action(page, /^Build menu/);
  const menu = page.locator("#plan-menu");
  const tile = (name: string) => page.getByRole("button", { name, exact: true });
  const roof = project([11.5, 1.46, 3.3]);
  const roofPixels = () =>
    page.locator("canvas").evaluate(
      (canvas, { roof, view }) => {
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("Missing canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Missing map");
        return Array.from(
          ctx.getImageData(
            (roof.x * canvas.width) / view.width,
            (roof.y * canvas.height) / view.height,
            4,
            4,
          ).data,
        );
      },
      { roof, view },
    );
  await tile("D4").click();
  await expect(menu).toContainText("D4 · Tree");
  await tile("P7").click();
  await expect(menu).toContainText("Outside buildable land");
  await tile("K4").hover();
  await expect(menu).toContainText("Footprint · K4");
  const withRoof = await roofPixels();
  await tile("H4").hover();
  await expect(menu).toContainText("Footprint · H4");
  expect(await roofPixels()).not.toEqual(withRoof);
  await tile("K4").hover();
  expect(await roofPixels()).toEqual(withRoof);
  await tile("K4").click();
  await expect(menu).toBeHidden();
  await expect(page.locator("#inspect")).toContainText("Blueprint · K4");
  await expect(page.locator("#clock")).toHaveText("6h 00m");
});

test("escape cancels a preview and keyboard placement uses the focused tile", async ({ page }) => {
  await page.goto("/?scenario=harvest");
  const tile = page.getByRole("button", { name: "H6", exact: true });
  await action(page, /^Build menu/);
  await action(page, /^Pantry$/);
  await tile.hover();
  await page.keyboard.press("Escape");
  await tile.click();
  await expect(page.locator("#inspect")).not.toContainText("Blueprint");
  await action(page, /^Build menu/);
  await action(page, /^Well$/);
  await tile.focus();
  await expect(page.locator("#plan-menu")).toContainText("Well · H6");
  await page.keyboard.press("Enter");
  await expect(page.locator("#inspect")).toContainText("Well · Blueprint");
});
test("reserve open ground immediately and reject an overlapping plan", async ({ page }) => {
  await page.goto("/");
  await reserveOpen(page);
  await expect(page.getByText("Blueprint · K4", { exact: true })).toBeVisible();
  await action(page, /^Build menu/);
  await action(page, /^Open site/);
  await expect(page.locator("#plan-menu")).toContainText("K4 · Reserved blueprint");
  await expect(page.getByRole("button", { name: /Reserve footprint/ })).toBeDisabled();
  await expect(page.locator("#clock")).toHaveText("6h 00m");
});
test("keep the wooded footprint while clearing the tree, stump and stone", async ({ page }) => {
  await page.goto("/");
  await action(page, /^Build menu/);
  await action(page, /^Wooded site/);
  const menu = page.locator("#plan-menu");
  await expect(menu).toContainText("D4 · Tree");
  await expect(menu).toContainText("E5 · Raw rock");
  await expect(page.getByRole("button", { name: /Reserve footprint/ })).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#clock")).toHaveText("6h 00m");
  await action(page, /^Return to clearing/);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  await action(page, /^Build menu/);
  await expect(menu).toContainText("D4 · Stump");
  await action(page, /^Return to clearing/);
  await action(page, /^Clear stump/);
  await walkTo(page, "E5");
  await expect(page.getByRole("button", { name: /^Pick up stone/ })).toHaveCount(0);
  await action(page, /^Work rock with pickaxe · 2 stone · 6 min/);
  await expect(page.locator("#inspect")).toContainText("On the ground · 2 stone");
  await expect(page.getByRole("button", { name: /^Work rock/ })).toHaveCount(0);
  await action(page, /^Pick up stone/);
  await action(page, /^Build menu/);
  await expect(menu).toContainText("Footprint clear");
  await action(page, /^Reserve footprint/);
  await expect(page.getByText("Blueprint · D4", { exact: true })).toBeVisible();
});
