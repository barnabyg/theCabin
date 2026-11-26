import { expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";
import {
  buildCabin,
  buildPantry,
  prepareHearth,
  rest,
  spendDaylight,
  storeWater,
} from "./winter-route";

test("trade furs and haul four purchased meals home to reach thaw without a crop", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "First winter" }).click();
  await buildPantry(page);
  await walkTo(page, "I7");
  await spendDaylight(page, /^Collect 1 fur/, 15);
  await spendDaylight(page, /^Collect 1 fur/, 15);
  await expect(page.locator("#load")).toContainText("2 fur");
  for (let trip = 0; trip < 2; trip++) {
    await walkTo(page, "P6");
    await spendDaylight(page, /^Walk to town/, trip === 0 ? 60 : 30);
    if (trip === 0) {
      await action(page, /^Sell 1 fur · 3 coins/);
      await action(page, /^Sell 1 fur · 3 coins/);
      await expect(page.locator("#purse")).toHaveText("10 coins");
    }
    await action(page, /^Buy 1 food portion · 2 coins/);
    await action(page, /^Buy 1 food portion · 2 coins/);
    await expect(page.locator("#purse")).toHaveText(trip === 0 ? "6 coins" : "2 coins");
    await expect(page.locator("#load")).toContainText("2 food");
    await spendDaylight(page, /^Walk home/, 60);
    await walkTo(page, "F6");
    await action(page, /^Store harvest/);
    await rest(page);
  }
  await expect(page.locator("#purse")).toHaveText("2 coins");
  await expect(page.locator("#night")).toContainText("4 meals");
  await buildCabin(page);
  await rest(page);
  await prepareHearth(page);
  await rest(page);
  await storeWater(page);
  await rest(page);
  await walkTo(page, "K4");
  await action(page, /^Light hearth/);
  await rest(page);
  await expect(page.locator("#calendar")).toContainText("Winter · Day 7");
  for (let meals = 4; meals > 0; meals--) {
    await expect(page.locator("#night")).toContainText(`${meals} meal`);
    await rest(page);
  }
  await expect(page.getByRole("heading", { name: "Spring thaw" })).toBeVisible();
  await expect(page.locator("#seeds")).toHaveText("0 turnip · 0 squash");
});
