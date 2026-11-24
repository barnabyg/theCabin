import { expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";

test("a penniless settler fulfils the firewood order and sows before sundown", async ({ page }) => {
  await page.goto("/?scenario=market");
  await expect(page.getByRole("button", { name: "Start with an empty purse" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await action(page, /^Start with an empty purse/);
  await expect(page.locator("#purse")).toHaveText("0 coins");
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Take order · 2 firewood for 3 coins · no fee/);
  await expect(page.locator("#purse")).toHaveText("0 coins");
  await expect(page.getByRole("button", { name: /^Deliver 2 firewood/ })).toBeDisabled();
  await action(page, /^Walk home/);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  await action(page, /^Split 1 log/);
  await action(page, /^Pick up firewood/);
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Deliver 2 firewood · receive 3 coins/);
  await expect(page.locator("#load")).toHaveText("Empty (0/2)");
  await expect(page.locator("#purse")).toHaveText("3 coins");
  await action(page, /^Save market day/);
  await page.reload();
  await expect(page.locator("#town")).toContainText("Order paid");
  await expect(page.getByRole("button", { name: /^(Deliver 2 firewood|Take order)/ })).toHaveCount(
    0,
  );
  await expect(page.locator("#purse")).toHaveText("3 coins");
  await action(page, /^Buy 1 turnip seed/);
  await expect(page.locator("#purse")).toHaveText("0 coins");
  await action(page, /^Walk home/);
  await walkTo(page, "G6");
  await action(page, /^Sow turnip/);
  await action(page, /^Wait until sundown/);
  await expect(page.getByRole("heading", { name: "Sowing secured" })).toBeVisible();
});
