import { chromium, expect, test } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

test("carry stream water, resume a growing turnip bed and gather its yield once", async ({
  baseURL,
}, testInfo) => {
  const launch = () =>
    chromium.launchPersistentContext(testInfo.outputPath("settler"), { baseURL });
  let context = await launch();
  try {
    const page = context.pages()[0];
    await page.goto("/?scenario=harvest");
    await action(page, /^Build menu/);
    await action(page, /^Garden$/);
    await selectTile(page, "D4");
    await expect(page.getByRole("button", { name: "Prepare garden" })).toBeDisabled();
    await selectTile(page, "G6");
    await action(page, /^Prepare garden/);
    await expect(page.locator("#inspect")).toContainText("2 watered days");
    await action(page, /^Sow turnip/);
    await expect(page.locator("#seeds")).toContainText("1 turnip");
    await walkTo(page, "G7");
    await action(page, /^Draw stream water/);
    await selectTile(page, "G6");
    await expect(page.getByRole("button", { name: /^Walk here/ })).toHaveText("Walk here · 2 min");
    await walkTo(page, "G6");
    await action(page, /^Water crop/);
    await action(page, /^Rest until tomorrow/);
    await action(page, /^Save spring day/);
    await context.close();
    context = await launch();
    const resumed = context.pages()[0];
    await resumed.goto("/?scenario=harvest");
    await expect(resumed.locator("#calendar")).toContainText("Day 2");
    await expect(resumed.locator("#inspect")).toContainText("Turnip · 1/2 watered days");
    await walkTo(resumed, "G7");
    await action(resumed, /^Draw stream water/);
    await walkTo(resumed, "G6");
    await action(resumed, /^Water crop/);
    await action(resumed, /^Rest until tomorrow/);
    await action(resumed, /^Harvest turnip/);
    await expect(resumed.locator("#inspect")).toContainText("2 food");
    await expect(resumed.getByRole("button", { name: /^Harvest turnip/ })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
