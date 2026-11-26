import { expect, test, type Page } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";
import { buildPantry } from "./winter-route";

async function restToWinter(page: Page, fromDay: number) {
  for (let day = fromDay; day < 7; day++) await action(page, /^Rest until tomorrow/);
  await expect(page.locator("#calendar")).toContainText("Winter · Day 7");
}

async function growTurnips(page: Page) {
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await action(page, /^Buy 1 turnip seed/);
  await action(page, /^Walk home/);
  await action(page, /^Build menu/);
  await action(page, /^Garden$/);
  await selectTile(page, "G6");
  await action(page, /^Prepare garden/);
  await action(page, /^Sow turnip/);
  for (let day = 1; day <= 2; day++) {
    await walkTo(page, "G7");
    await action(page, /^Draw stream water/);
    await walkTo(page, "G6");
    await action(page, /^Water crop/);
    await action(page, /^Rest until tomorrow/);
  }
  await action(page, /^Harvest turnip/);
}

async function stockMeals(page: Page) {
  await walkTo(page, "G6");
  await action(page, /^Pick up food/);
  await walkTo(page, "F6");
  await action(page, /^Store harvest/);
}

async function stockWater(page: Page) {
  await walkTo(page, "G7");
  await action(page, /^Draw stream water/);
  await action(page, /^Draw stream water/);
  await walkTo(page, "F6");
  await action(page, /^Store drinking water/);
  await expect(page.locator("#load")).toContainText("Empty");
}

async function prepareHearth(page: Page) {
  await action(page, /^Build menu/);
  await action(page, /^Cabin$/);
  await action(page, /^Open site/);
  await action(page, /^Reserve footprint/);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  for (const [source, material] of [
    ["D4", "logs"],
    ["D4", "logs"],
    ["E5", "stone"],
  ]) {
    await walkTo(page, source);
    if (material === "stone") await action(page, /^Work rock/);
    await action(page, new RegExp(`^Pick up ${material}`));
    await walkTo(page, "K4");
    await action(page, /^Deliver materials/);
  }
  for (const job of [/^Lay floor/, /^Raise walls/, /^Fit roof and hearth/]) await action(page, job);
  await walkTo(page, "C4");
  await action(page, /^Pick up logs/);
  await walkTo(page, "K4");
  await action(page, /^Split 2 logs/);
  for (let i = 0; i < 4; i++) await action(page, /^Add firewood/);
  await action(page, /^Light hearth/);
}

test("recover after missing a winter meal and drink by bringing both back to the pantry", async ({
  page,
}) => {
  await page.goto("/?scenario=winter");
  await growTurnips(page);
  await buildPantry(page);
  await prepareHearth(page);
  for (let day = 3; day < 6; day++) await action(page, /^Rest until tomorrow/);
  await expect(page.locator("#night")).toContainText("Winter starts tomorrow");
  await expect(page.locator("#night")).toContainText("first meal and drink");
  await action(page, /^Rest until tomorrow/);
  await action(page, /^Rest until tomorrow/);
  await expect(page.locator("#night")).toContainText("Hungry");
  await expect(page.locator("#night")).toContainText("Thirsty");
  await action(page, /^Save First winter/);
  await page.reload();
  await expect(page.locator("#night")).toContainText("Hungry");
  await stockMeals(page);
  await stockWater(page);
  await expect(page.locator("#night")).toContainText("2 meals");
  await expect(page.locator("#night")).toContainText("2 drinks");
  await walkTo(page, "K4");
  await action(page, /^Rest until tomorrow/);
  await expect(page.locator("#calendar")).toContainText("Day 9");
  await expect(page.locator("#night")).toContainText("1 meal");
  await expect(page.locator("#night")).toContainText("1 drink");
  await expect(page.locator("#night")).not.toContainText("Hungry");
  await expect(page.locator("#night")).not.toContainText("Thirsty");
});

for (const cause of ["hunger", "thirst"]) {
  test(`retreat after two nights of ${cause}`, async ({ page }) => {
    await page.goto("/?scenario=winter");
    if (cause === "thirst") await growTurnips(page);
    await buildPantry(page);
    if (cause === "hunger") await stockWater(page);
    else await stockMeals(page);
    await restToWinter(page, cause === "thirst" ? 3 : 1);
    await action(page, /^Rest until tomorrow/);
    await expect(page.locator("#night")).toContainText(cause === "hunger" ? "Hungry" : "Thirsty");
    await action(page, /^Rest until tomorrow/);
    await expect(page.getByRole("heading", { name: "Retreat to town" })).toBeVisible();
    await expect(page.locator("#night")).toContainText(cause);
    await expect(page.getByRole("button", { name: /^Rest until tomorrow/ })).toHaveCount(0);
    await action(page, /^Save First winter/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Retreat to town" })).toBeVisible();
    await expect(page.locator("#night")).toContainText(cause);
  });
}
