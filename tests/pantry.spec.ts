import { chromium, expect, test, type Page } from "@playwright/test";
import { finishDeliveredCabin, action, reserveOpen, selectTile, walkTo } from "./controls";

async function plan(page: Page, kind: "Well" | "Garden" | "Pantry", tile: string) {
  await action(page, /^Build menu/);
  await expect(page.getByRole("button", { name: kind, exact: true })).toBeVisible();
  await action(page, new RegExp(`^${kind}$`));
  await selectTile(page, tile);
}

async function deliver(
  page: Page,
  resource: string,
  source: string,
  target: string,
  delivery: RegExp,
) {
  await walkTo(page, source);
  if (resource === "stone" && (await page.getByRole("button", { name: /^Work rock/ }).count()))
    await action(page, /^Work rock/);
  await action(page, new RegExp(`^Pick up ${resource}`));
  await walkTo(page, target);
  await action(page, delivery);
}

test("win First harvest from bare ground after reopening a partial well", async ({
  baseURL,
}, testInfo) => {
  const launch = () =>
    chromium.launchPersistentContext(testInfo.outputPath("settler"), { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/?scenario=harvest");
    await reserveOpen(page);
    await walkTo(page, "D4");
    await action(page, /^Fell tree/);
    for (let i = 0; i < 2; i++) await deliver(page, "logs", "D4", "K4", /^Deliver materials/);
    await deliver(page, "stone", "E5", "K4", /^Deliver materials/);
    await finishDeliveredCabin(page);
    await plan(page, "Well", "H6");
    await deliver(page, "stone", "F3", "H6", /^Deliver to well/);
    await action(page, /^Save spring day/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First harvest" }).click();
    await expect(page.locator("#inspect")).toContainText("Outstanding · 2 stone");
    await deliver(page, "stone", "F3", "H6", /^Deliver to well/);
    await action(page, /^Finish well/);
    await plan(page, "Garden", "G6");
    await action(page, /^Sow turnip/);
    for (let i = 0; i < 2; i++) {
      await walkTo(page, "H6");
      await action(page, /^Draw well water/);
      await walkTo(page, "G6");
      await action(page, /^Water crop/);
      await action(page, /^Rest until tomorrow/);
    }
    await action(page, /^Harvest turnip/);
    await plan(page, "Pantry", "F6");
    await walkTo(page, "C4");
    await action(page, /^Fell tree/);
    await deliver(page, "logs", "C4", "F6", /^Deliver to pantry/);
    await action(page, /^Finish pantry/);
    await deliver(page, "food", "G6", "F6", /^Store harvest/);
    await expect(page.getByRole("heading", { name: "Harvest secured" })).toBeVisible();
    await expect(page.locator("#night")).toContainText("2 portions");
    await action(page, /^Save spring day/);
    await page.reload();
    await expect(page.locator("#night")).toContainText("2 portions");
    await action(page, /^Start a fresh spring/);
    await expect(page.locator("#calendar")).toContainText("Day 1");
  } finally {
    await context.close();
  }
});

test("carried harvest does not count as a pantry reserve at frost", async ({ page }) => {
  await page.goto("/?scenario=harvest");
  await plan(page, "Pantry", "F6");
  await walkTo(page, "C4");
  await action(page, /^Fell tree/);
  await deliver(page, "logs", "C4", "F6", /^Deliver to pantry/);
  await action(page, /^Finish pantry/);
  await plan(page, "Garden", "G6");
  await action(page, /^Sow turnip/);
  for (let i = 0; i < 2; i++) {
    await walkTo(page, "G7");
    await action(page, /^Draw stream water/);
    await walkTo(page, "G6");
    await action(page, /^Water crop/);
    await action(page, /^Rest until tomorrow/);
  }
  await action(page, /^Harvest turnip/);
  await action(page, /^Pick up food/);
  await expect(page.locator("#load")).toContainText("2 food");
  for (let i = 3; i <= 6; i++) await action(page, /^Rest until tomorrow/);
  await expect(page.locator("#night")).toContainText("Frost arrived with no harvest in the pantry");
  await action(page, /^Start a fresh spring/);
  await expect(page.locator("#load")).toContainText("Empty");
});
