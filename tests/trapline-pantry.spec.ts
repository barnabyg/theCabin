import { expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";
import { buildPantry } from "./winter-route";

test("withdraw a ration and collect a fur at a trapline pantry", async ({ page }) => {
  await page.goto("/?scenario=winter");
  await buildPantry(page, "I7");
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Buy 1 food portion/);
  await action(page, /^Walk home/);
  await walkTo(page, "I7");
  await action(page, /^Store harvest/);
  await expect(page.getByRole("button", { name: /^Withdraw 1 portion/ })).toBeEnabled();
  await action(page, /^Withdraw 1 portion/);
  await action(page, /^Collect 1 fur/);
  await expect(page.locator("#inspect")).toContainText("Stored · 0 portions");
  await expect(page.locator("#load")).toHaveText("1 food, 1 fur (2/2)");
});
