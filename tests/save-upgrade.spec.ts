import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

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
});
