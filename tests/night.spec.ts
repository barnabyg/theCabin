import { expect, test, type Page } from "@playwright/test";
import { action, reserveOpen, selectTile, walkTo } from "./controls";

async function furnish(page: Page, site: "K4" | "D4") {
  await page.goto("/");
  if (site === "K4") await reserveOpen(page);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  if (site === "D4") {
    await action(page, /^Clear stump/);
    await walkTo(page, "E5");
    await action(page, /^Work rock with pickaxe/);
    await action(page, /^Pick up stone/);
    await action(page, /^Build menu/);
    await action(page, /^Wooded site/);
    await action(page, /^Reserve footprint/);
    await walkTo(page, site);
    await action(page, /^Deliver materials/);
  }
  for (let trip = 0; trip < 2; trip++) {
    await walkTo(page, "D4");
    await action(page, /^Pick up logs/);
    if (site === "K4") {
      await selectTile(page, site);
      await expect(page.getByRole("button", { name: /Walk here/ })).toHaveText(
        "Walk here · 14 min",
      );
    }
    await walkTo(page, site);
    await action(page, /^Deliver materials/);
  }
  if (site === "K4") {
    await walkTo(page, "E5");
    await action(page, /^Work rock with pickaxe/);
    await action(page, /^Pick up stone/);
    await walkTo(page, site);
    await action(page, /^Deliver materials/);
  }
  for (const job of [/^Lay floor/, /^Raise walls/, /^Fit roof and hearth/]) await action(page, job);
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
}
async function restart(page: Page) {
  await action(page, /Start again/);
  await expect(page.locator("#clock")).toHaveText("6h 00m");
  await expect(page.locator("#load")).toContainText("Empty");
  await expect(page.getByText("4 coins", { exact: true })).toBeVisible();
  await selectTile(page, "D4");
  await expect(page.locator("#inspect")).toContainText("Tree");
  await expect(page.locator("#inspect")).not.toContainText("Delivered");
  await selectTile(page, "E5");
  await expect(page.locator("#inspect")).toContainText("2 stone");
  await selectTile(page, "K4");
  await expect(page.locator("#inspect")).not.toContainText("Delivered");
}
for (const site of ["K4", "D4"] as const)
  test(`survive until dawn at ${site} and restore the clearing`, async ({ page }) => {
    await furnish(page, site);
    await walkTo(page, "C4");
    await action(page, /^Fell tree/);
    await action(page, /^Pick up logs/);
    await walkTo(page, site);
    await expect(page.locator("#night")).toContainText("Short by 4 firewood");
    await action(page, /^Split 2 logs/);
    await expect(page.locator("#night")).toContainText("Enough fuel for all four watches");
    await action(page, /^Add firewood/);
    await action(page, /^Light hearth/);
    await action(page, /^Wait for nightfall/);
    await expect(page.locator("#night")).toContainText("Low fuel");
    await action(page, /^Add firewood/);
    await action(page, /^Keep watch/);
    await expect(page.locator("#night")).toContainText("Hearth · 1 firewood");
    await expect(page.locator("#night")).toContainText("−3 °C");
    await expect(page.locator("#night")).toContainText("Warmth · 3/3");
    await action(page, /^Add firewood/);
    await action(page, /^Add firewood/);
    for (let i = 0; i < 3; i++) await action(page, /^Keep watch/);
    await expect(page.getByRole("heading", { name: "Dawn at the cabin" })).toBeVisible();
    await restart(page);
  });
test("retreat from a completed but cold cabin and restore daybreak", async ({ page }) => {
  await furnish(page, "K4");
  await action(page, /^Wait for nightfall/);
  await expect(page.locator("#night")).toContainText("Cold hearth");
  await action(page, /^Keep watch/);
  await expect(page.locator("#night")).toContainText("Warmth · 1/3");
  await action(page, /^Keep watch/);
  await expect(page.getByRole("heading", { name: "Retreat to town" })).toBeVisible();
  await expect(page.locator("#night")).toContainText("cold forced you to leave");
  await restart(page);
});
