import { chromium, expect, test } from "@playwright/test";
import { action } from "./controls";
import { harvestStores, rest } from "./winter-route";

test("recover during a cold spell and reach thaw on the harvest after reopening", async ({
  baseURL,
}, info) => {
  const launch = () => chromium.launchPersistentContext(info.outputPath("winter"), { baseURL });
  let browser = await launch();
  try {
    let page = browser.pages()[0];
    await page.goto("/?scenario=winter");
    await harvestStores(page);
    await expect(page.locator("#clock")).toContainText("2h");
    await rest(page);
    await expect(page.locator("#night")).toContainText("Cold spell");
    await expect(page.locator("#night")).toContainText("2 firewood");
    await expect(page.locator("#night")).toContainText("unheated");
    await action(page, /^Light hearth/);
    const before = await Promise.all(
      ["#clock", "#calendar", "#inspect", "#night"].map((id) => page.locator(id).textContent()),
    );
    await action(page, /^Save First winter/);
    await browser.close();
    browser = await launch();
    page = browser.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First winter" }).click();
    for (const [i, id] of ["#clock", "#calendar", "#inspect", "#night"].entries())
      await expect(page.locator(id)).toHaveText(before[i] ?? "");
    await rest(page);
    await expect(page.locator("#inspect")).toContainText("3 firewood · Lit");
    await rest(page);
    await rest(page);
    await expect(page.getByRole("heading", { name: "Spring thaw" })).toBeVisible();
    await action(page, /^Start a fresh First winter/);
    await expect(page.locator("#calendar")).toContainText("Spring · Day 1");
    await expect(page.locator("#purse")).toHaveText("4 coins");
  } finally {
    await browser.close();
  }
});

test("two unheated nights force a retreat despite sufficient food and water", async ({ page }) => {
  await page.goto("/?scenario=winter");
  await harvestStores(page, 1);
  await action(page, /^Light hearth/);
  await rest(page);
  await expect(page.locator("#inspect")).toContainText("0 firewood · Unlit");
  await rest(page);
  await expect(page.locator("#night")).toContainText("unheated");
  await rest(page);
  await expect(page.getByRole("heading", { name: "Retreat to town" })).toBeVisible();
  await expect(page.locator("#night")).toContainText("cold");
});
