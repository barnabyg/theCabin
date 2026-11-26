import { expect, test, type Page } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

async function sow(page: Page, tile: string, variety: "turnip" | "squash") {
  await action(page, /^Build menu/);
  await action(page, /^Garden$/);
  await selectTile(page, tile);
  await expect(page.locator("#inspect")).toContainText("Squash · 2 seeds · 4 watered days");
  await action(page, new RegExp(`^Sow ${variety}`));
}

async function water(page: Page, tiles: string[]) {
  await walkTo(page, "G7");
  for (const _ of tiles) await action(page, /^Draw stream water/);
  for (const tile of tiles) {
    await walkTo(page, tile);
    await action(page, /^Water crop/);
  }
  await action(page, /^Rest until tomorrow/);
}

test("an early squash bed resumes its variety and yields six portions", async ({ page }) => {
  await page.goto("/?scenario=harvest");
  await sow(page, "G6", "squash");
  await water(page, ["G6"]);
  await action(page, /^Save spring day/);
  await page.reload();
  await expect(page.locator("#inspect")).toContainText("Squash · 1/4 watered days");
  for (let i = 0; i < 3; i++) await water(page, ["G6"]);
  await action(page, /^Harvest squash/);
  await expect(page.locator("#inspect")).toContainText("6 food");
});

test("a day-four sowing gives turnips time to mature before frost", async ({ page }) => {
  await page.goto("/?scenario=harvest");
  for (let i = 0; i < 3; i++) await action(page, /^Rest until tomorrow/);
  await sow(page, "G6", "turnip");
  await sow(page, "H6", "squash");
  await water(page, ["G6", "H6"]);
  await water(page, ["G6", "H6"]);
  await expect(page.locator("#calendar")).toContainText("Day 6");
  await expect(page.locator("#inspect")).toContainText("Squash · 2/4 watered days");
  await walkTo(page, "G6");
  await action(page, /^Harvest turnip/);
  await expect(page.locator("#inspect")).toContainText("2 food");
  await water(page, ["H6"]);
  await expect(page.locator("#calendar")).toHaveText("First frost");
  await expect(page.getByRole("button", { name: /^Harvest squash/ })).toHaveCount(0);
});
