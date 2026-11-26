import { expect, test } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";
import { buildPantry, rest } from "./winter-route";

test("compare two pantry meals with a shorter and then a longer covered fuel reserve before winter", async ({
  page,
}) => {
  await page.goto("/?scenario=winter");
  await buildPantry(page);
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Buy 1 food portion/);
  await action(page, /^Buy 1 food portion/);
  await action(page, /^Walk home/);
  await walkTo(page, "F6");
  await action(page, /^Store harvest/);
  await expect(page.locator("#inspect")).toContainText("2 portions · 2 winter meals");
  await rest(page);
  await action(page, /^Build menu/);
  await action(page, /^Covered woodpile$/);
  await selectTile(page, "H6");
  await walkTo(page, "C4");
  await action(page, /^Pick up logs/);
  await walkTo(page, "H6");
  await action(page, /^Deliver to covered woodpile/);
  await action(page, /^Finish covered woodpile/);
  const reserves = page.locator("#night");
  await expect(reserves).toContainText("2 meals");
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  await action(page, /^Split 2 logs/);
  for (let trip = 0; trip < 2; trip++) {
    await walkTo(page, "D4");
    await action(page, /^Pick up firewood/);
    await walkTo(page, "H6");
    await action(page, /^Store firewood/);
    if (trip === 0) {
      await action(page, /^Withdraw 1 firewood/);
      await expect(reserves).toContainText("2 meals");
      await expect(reserves).toContainText("Covered woodpiles · 1 piece · 1 ordinary night");
      await action(page, /^Store firewood/);
    }
  }
  await expect(page.locator("#calendar")).toContainText("Spring · Day 2");
  await expect(reserves).toContainText("2 meals");
  await expect(reserves).toContainText("Covered woodpiles · 4 pieces · 4 ordinary nights");
  await expect(page.locator("#inspect")).toContainText("4 pieces · 4 ordinary nights");
});
