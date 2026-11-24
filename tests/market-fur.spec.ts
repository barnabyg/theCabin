import { chromium, expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";

test("resume with a collected fur and fund sowing without opening the pantry", async ({
  baseURL,
}, testInfo) => {
  const profile = testInfo.outputPath("trapline-player");
  const launch = () => chromium.launchPersistentContext(profile, { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/?scenario=market");
    await walkTo(page, "I7");
    await expect(page.getByRole("button", { name: /^Collect 1 fur/ })).toBeVisible();
    await action(page, /^Collect 1 fur/);
    await action(page, /^Collect 1 fur/);
    await expect(page.locator("#load")).toHaveText("2 fur (2/2)");
    await expect(page.getByRole("button", { name: /^Collect 1 fur/ })).toBeDisabled();
    await action(page, /^Save market day/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/?scenario=market");
    await expect(page.locator("#load")).toHaveText("2 fur (2/2)");
    await walkTo(page, "P6");
    await action(page, /^Walk to town/);
    await action(page, /^Sell 1 fur · 3 coins/);
    await expect(page.locator("#load")).toHaveText("1 fur (1/2)");
    await expect(page.locator("#purse")).toHaveText("4 coins");
    await action(page, /^Sell 1 fur/);
    await expect(page.getByRole("button", { name: /^Sell 1 fur/ })).toBeDisabled();
    await expect(page.locator("#purse")).toHaveText("7 coins");
    await action(page, /^Buy 1 turnip seed/);
    await action(page, /^Walk home/);
    await walkTo(page, "G6");
    await action(page, /^Sow turnip/);
    await walkTo(page, "F6");
    await expect(page.locator("#inspect")).toContainText("Stored · 4 portions");
    await action(page, /^Wait until sundown/);
    await expect(page.getByRole("heading", { name: "Sowing secured" })).toBeVisible();
  } finally {
    await context.close();
  }
});
