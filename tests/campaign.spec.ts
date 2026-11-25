import { chromium, expect, test } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

test("buy a first sowing from bare ground and reopen the planted campaign", async ({
  baseURL,
}, info) => {
  const launch = () => chromium.launchPersistentContext(info.outputPath("campaign"), { baseURL });
  let browser = await launch();
  try {
    let page = browser.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "First winter" }).click({ timeout: 10000 });
    await expect(page.locator("#objective")).toContainText("thaw");
    await expect(page.locator("#purse")).toHaveText("4 coins");
    await expect(page.locator("#seeds")).toContainText("0 turnip");
    await walkTo(page, "P6");
    await action(page, /^Walk to town/);
    await action(page, /^Buy 1 turnip seed/);
    await action(page, /^Walk home/);
    await action(page, /^Build menu/);
    await action(page, /^Garden$/);
    await selectTile(page, "G6");
    await action(page, /^Prepare garden/);
    await action(page, /^Sow turnip/);
    await action(page, /^Save First winter/);
    await browser.close();
    browser = await launch();
    page = browser.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First winter" }).click();
    await expect(page.locator("#inspect")).toContainText("Turnip · 0/2");
    await expect(page.locator("#calendar")).toContainText("Day 1");
    await expect(page.locator("#purse")).toHaveText("1 coin");
  } finally {
    await browser.close();
  }
});
