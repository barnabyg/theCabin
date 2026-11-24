import { expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";

for (const portions of [1, 2]) {
  test(`sow with ${portions === 1 ? "an intact" : "a depleted"} pantry reserve`, async ({
    page,
  }) => {
    await page.goto("/?scenario=market");
    await walkTo(page, "F6");
    await expect(page.getByRole("button", { name: /^Withdraw 1 portion/ })).toBeVisible();
    for (let n = 0; n < portions; n++) await action(page, /^Withdraw 1 portion/);
    await expect(page.locator("#inspect")).toContainText(`Stored · ${4 - portions} portions`);
    await walkTo(page, "P6");
    await action(page, /^Walk to town · 60 min/);
    for (let n = 0; n < portions; n++) await action(page, /^Sell 1 food · 2 coins/);
    await expect(page.locator("#town")).toContainText(`Food portions purchased · ${portions}`);
    await expect(page.locator("#load")).toContainText("Empty");
    await expect(page.locator("#purse")).toHaveText(`${1 + 2 * portions} coins`);
    await expect(page.getByRole("button", { name: /^Sell 1 food/ })).toBeDisabled();
    await action(page, /^Buy 1 turnip seed/);
    await expect(page.locator("#seeds")).toHaveText("1 turnip");
    await expect(page.locator("#town")).toContainText("1 turnip seed in stock");
    await action(page, /^Walk home · 30 min/);
    await walkTo(page, "G6");
    await action(page, /^Sow turnip/);
    await expect(page.locator("#inspect")).toContainText("Turnip · 0/2 watered days");
    await expect(page.locator("#seeds")).toHaveText("0 turnip");
    await action(page, /^Wait until sundown/);
    await expect(
      page.getByRole("heading", { name: portions === 1 ? "Sowing secured" : "Retreat to town" }),
    ).toBeVisible();
    if (portions === 2)
      await expect(page.locator("#night")).toContainText("only 2 of the required 3 portions");
    await action(page, /^Start a fresh market day/);
    await expect(page.locator("#clock")).toHaveText("4h 00m");
  });
}
test("four minutes left is too late to finish sowing before sundown", async ({ page }) => {
  await page.goto("/?scenario=market");
  await walkTo(page, "F6");
  await action(page, /^Withdraw 1 portion/);
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Sell 1 food/);
  await action(page, /^Buy 1 turnip seed/);
  await action(page, /^Walk home/);
  await walkTo(page, "G6");
  await walkTo(page, "H6");
  await action(page, /^Draw well water/);
  await action(page, /^Set down load/);
  await walkTo(page, "G6");
  for (let trip = 0; trip < 5; trip++) {
    await walkTo(page, "O3");
    await walkTo(page, "G6");
  }
  await expect(page.locator("#clock")).toHaveText("0h 04m");
  await expect(page.getByRole("button", { name: /^Sow turnip/ })).toBeDisabled();
  await expect(page.locator("#inspect")).toContainText("Too late to finish sowing before sundown");
  await action(page, /^Wait until sundown/);
  await expect(page.locator("#night")).toContainText("The garden was still unsown at sundown");
});

test("reach the deadline in town with the garden unsown", async ({ page }) => {
  await page.goto("/?scenario=market");
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Wait until sundown/);
  await expect(page.locator("#night")).toContainText("The garden was still unsown at sundown");
  await expect(page.getByRole("button", { name: /^Buy 1/ })).toHaveCount(0);
});
