import { chromium, expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";

test("price seed, resume at the merchant and walk home", async ({ baseURL }, testInfo) => {
  const profile = testInfo.outputPath("market-player");
  const launch = () => chromium.launchPersistentContext(profile, { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Market day" })).toBeVisible();
    await page.getByRole("link", { name: "Market day" }).click();
    await expect(page.locator("#objective")).toContainText("3 portions");
    await expect(page.locator("#seeds")).toHaveText("0 turnip");
    await walkTo(page, "P6");
    await action(page, /^Walk to town · 30 min/);
    await expect(page.getByRole("heading", { name: "River town merchant" })).toBeVisible();
    await action(page, /^Buy 1 turnip seed · 3 coins/);
    await expect(page.getByRole("status")).toContainText("Need 3 coins");
    await expect(page.locator("#purse")).toHaveText("1 coin");
    await expect(page.locator("#seeds")).toHaveText("0 turnip");
    await expect(page.locator("#town")).toContainText("2 turnip seeds in stock");
    await expect(page.locator("#clock")).toHaveText("3h 21m");
    await action(page, /^Save market day/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume Market day" }).click();
    await expect(page.locator("#town")).toContainText("2 turnip seeds in stock");
    await expect(page.locator("#purse")).toHaveText("1 coin");
    await expect(page.locator("#clock")).toHaveText("3h 21m");
    await action(page, /^Walk home · 30 min/);
    await expect(page.locator("#tile-title")).toContainText("P6");
    await expect(page.locator("#clock")).toHaveText("2h 51m");
  } finally {
    await context.close();
  }
});
