import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { action, walkTo } from "./controls";

// Browser saves captured through player controls in a54285f (harvest) and c49fe2b (market).
const saved = JSON.parse(readFileSync("tests/fixtures/v1-browser-saves.json", "utf8"));
test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw Error("Browser tests require a game URL");
    await use({ cookies: [], origins: [{ origin: baseURL, localStorage: saved }] });
  },
});

test("resume older harvest and market saves with their original goods", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Resume First harvest" }).click();
  await expect(page.locator("#calendar")).toContainText("Day 2");
  await expect(page.locator("#tile-title")).toContainText("E5");
  await expect(page.locator("#load")).toHaveText("2 stone (2/2)");
  await page.getByRole("link", { name: "Resume Market day" }).click();
  await expect(page.locator("#town")).toContainText("Food portions purchased · 1");
  await expect(page.locator("#town")).toContainText("Furs purchased · 0");
  await expect(page.getByRole("button", { name: /^Take order/ })).toBeVisible();
  await expect(page.locator("#purse")).toHaveText("3 coins");
  await expect(page.locator("#load")).toHaveText("1 food (1/2)");
  await action(page, /^Walk home/);
  await walkTo(page, "K4");
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
  await expect(page.locator("#inspect")).toContainText("Outstanding · 0 logs, 0 stone");
});

// Both saves were made via the original build controls on a89dbaff, before any stone was delivered.
for (const [stage, logs, nextStage] of [
  ["floor", 2, "Raise wall posts"],
  ["walls", 4, "Frame and shingle roof"],
] as const) {
  test.describe(`legacy ${stage} stage`, () => {
    const value = readFileSync(`tests/fixtures/v1-cabin-${stage}.json`, "utf8");
    test.use({
      storageState: async ({ baseURL }, use) => {
        if (!baseURL) throw Error("Browser tests require a game URL");
        await use({
          cookies: [],
          origins: [
            { origin: baseURL, localStorage: [{ name: "the-cabin.first-harvest", value }] },
          ],
        });
      },
    });
    test("keeps delivered timber, completes the cabin and reopens", async ({ page, context }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Resume First harvest" }).click();
      await expect(page.locator("#inspect")).toContainText(`Delivered · ${logs} logs, 0 stone`);
      await expect(page.locator("#cabin-heading")).toHaveText(nextStage);
      const next = page.locator("#cabin-next");
      for (let step = 0; step < 16 && (await next.isVisible()); step++) await next.click();
      await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
      await action(page, /^Save spring day/);
      const reopened = await context.newPage();
      await page.close();
      await reopened.goto("/");
      await reopened.getByRole("link", { name: "Resume First harvest" }).click();
      await expect(reopened.locator("#inspect")).toContainText("Stone hearth ready");
      await expect(reopened.locator("#inspect")).toContainText("Delivered · 4 logs, 2 stone");
    });
  });
}
