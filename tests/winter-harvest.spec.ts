import { chromium, expect, test } from "@playwright/test";
import { action, selectTile } from "./controls";
import { harvestStores, rest } from "./winter-route";

test("recover during a cold spell and reach thaw on the harvest after reopening", async ({
  baseURL,
}, info) => {
  const launch = () => chromium.launchPersistentContext(info.outputPath("winter"), { baseURL });
  let browser = await launch();
  try {
    let page = browser.pages()[0];
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "One cold night" })).toBeVisible();
    await page.getByRole("link", { name: "First winter" }).click();
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
    const frozen = await page.locator("#terrain").screenshot();
    const winterSound = await page.locator("audio").getAttribute("src");
    await rest(page);
    await expect(page.getByRole("heading", { name: "Spring thaw" })).toBeVisible();
    expect((await page.locator("#terrain").screenshot()).equals(frozen)).toBe(false);
    const audio = page.locator("audio");
    await expect(audio).not.toHaveAttribute("src", winterSound ?? "");
    await expect
      .poll(() =>
        audio.evaluate((player) => player instanceof HTMLAudioElement && player.currentTime > 0),
      )
      .toBe(true);
    await action(page, /^Start a fresh First winter/);
    await expect(page.locator("#calendar")).toContainText("Spring · Day 1");
    await expect(page.locator("#purse")).toHaveText("4 coins");
    await expect(page.locator("#clock")).toHaveText("6h 00m");
    await expect(page.locator("#load")).toHaveText("Empty (0/2)");
    await expect(page.locator("#seeds")).toHaveText("0 turnip · 0 squash");
    await expect(page.locator("#night")).toContainText("0 meals · 0 drinks");
    await expect(page.locator("#night")).toContainText("In hearths · 0 firewood");
    await expect(page.locator("#tile-title")).toContainText("G6");
    await expect(page.locator("#inspect")).not.toContainText("Garden");
    await selectTile(page, "D4");
    await expect(page.locator("#inspect")).toContainText("Tree");
    await selectTile(page, "E5");
    await expect(page.locator("#inspect")).toContainText("Raw rock · Yields 2 stone");
    await selectTile(page, "F6");
    await expect(page.locator("#inspect")).not.toContainText("Pantry");
    await selectTile(page, "K4");
    await expect(page.locator("#inspect")).not.toContainText("Hearth");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "First winter", exact: true })).toBeVisible();
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
