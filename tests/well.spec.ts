import { chromium, expect, test } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

test("finish a well after reopening with two of its four stone delivered", async ({
  baseURL,
}, testInfo) => {
  const launch = () =>
    chromium.launchPersistentContext(testInfo.outputPath("settler"), { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/?scenario=harvest");
    await action(page, /^Build menu/);
    await expect(page.getByRole("button", { name: "Well", exact: true })).toBeVisible();
    await action(page, /^Well$/);
    await selectTile(page, "H6");
    await expect(page.locator("#plan-menu")).toContainText(
      "Delivered · 0 stone · Outstanding · 4 stone",
    );
    await action(page, /^Reserve well/);
    await walkTo(page, "F3");
    await action(page, /^Work rock with pickaxe/);
    await action(page, /^Pick up stone/);
    await walkTo(page, "H6");
    await action(page, /^Deliver to well/);
    await expect(page.getByRole("button", { name: /^Draw well water/ })).toHaveCount(0);
    await action(page, /^Save spring day/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/?scenario=harvest");
    await expect(page.locator("#inspect")).toContainText("Delivered · 2 stone");
    await expect(page.locator("#inspect")).toContainText("Outstanding · 2 stone");
    await walkTo(page, "F3");
    await expect(page.locator("#inspect")).toContainText("2 stone");
    await action(page, /^Pick up stone/);
    await walkTo(page, "H6");
    await action(page, /^Deliver to well/);
    await action(page, /^Finish well/);
    await action(page, /^Draw well water/);
    await expect(page.locator("#load")).toContainText("1 water");
    await selectTile(page, "G6");
    await expect(page.getByRole("button", { name: /^Walk here/ })).toHaveText("Walk here · 2 min");
  } finally {
    await context.close();
  }
});
