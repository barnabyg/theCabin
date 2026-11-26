import { chromium, expect, test } from "@playwright/test";
import { action, reserveOpen, walkTo } from "./controls";

test("restart after frost when browser storage is disabled", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage disabled", "SecurityError");
      },
    });
  });
  await page.goto("/?scenario=harvest");
  for (let i = 0; i < 6; i++) await action(page, /^Rest until tomorrow/);
  await action(page, /^Start a fresh spring/);
  await expect(page.locator("#calendar")).toContainText("Day 1");
});

test("resume the spring cabin on the same day with the load and delivery intact", async ({
  baseURL,
}, testInfo) => {
  const profile = testInfo.outputPath("player");
  const launch = () => chromium.launchPersistentContext(profile, { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "First harvest" }).click();
    await expect(page.getByRole("heading", { name: "First harvest" })).toBeVisible();
    await expect(page.locator("#seeds")).toContainText("2 turnip");
    await reserveOpen(page);
    await walkTo(page, "D4");
    await action(page, /^Fell tree/);
    await action(page, /^Pick up logs/);
    await walkTo(page, "K4");
    await action(page, /^Deliver materials/);
    await action(page, /^Rest until tomorrow/);
    await walkTo(page, "E5");
    await action(page, /^Work rock with pickaxe/);
    await action(page, /^Pick up stone/);
    await expect(page.locator("#clock")).toHaveText("5h 46m");
    await action(page, /^Save spring day/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First harvest" }).click();
    await expect(page.locator("#calendar")).toContainText("Day 2");
    await expect(page.locator("#clock")).toHaveText("5h 46m");
    await expect(page.locator("#tile-title")).toContainText("E5");
    await expect(page.locator("#inspect")).toContainText("Settler is here");
    await expect(page.locator("#load")).toContainText("2 stone");
    await expect(page.locator("#cabin-heading")).toHaveText("Lay floor");
    await expect(page.locator("#cabin-next")).toContainText("Walk to the cabin at K4");
    await walkTo(page, "K4");
    await expect(page.locator("#inspect")).toContainText("Delivered · 2 logs, 0 stone");
    await action(page, /^Deliver materials/);
    await walkTo(page, "D4");
    await expect(page.locator("#inspect")).toContainText("Stump");
    await action(page, /^Pick up logs/);
    await walkTo(page, "K4");
    await action(page, /^Deliver materials/);
    for (const job of [/^Lay floor/, /^Raise walls/, /^Fit roof and hearth/])
      await action(page, job);
    await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
    for (let day = 2; day <= 6; day++) await action(page, /^Rest until tomorrow/);
    await expect(page.getByText(/Frost arrived with no harvest in the pantry/)).toBeVisible();
    await action(page, /^Start a fresh spring/);
    await expect(page.locator("#calendar")).toContainText("Day 1");
    await expect(page.locator("#load")).toContainText("Empty");
  } finally {
    await context.close();
  }
});
