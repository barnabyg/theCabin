import { chromium, expect, test } from "@playwright/test";
import { action, reserveOpen, selectTile, walkTo } from "./controls";

test("autumn rain spoils loose fuel while covered firewood survives reopening and feeds the hearth", async ({
  baseURL,
}, info) => {
  const launch = () => chromium.launchPersistentContext(info.outputPath("woodpile"), { baseURL });
  let context = await launch();
  try {
    let page = context.pages()[0];
    await page.goto("/?scenario=winter");
    await reserveOpen(page);
    await action(page, /^Build menu/);
    await expect(page.getByRole("button", { name: "Covered woodpile", exact: true })).toBeVisible();
    await action(page, /^Covered woodpile$/);
    await selectTile(page, "D4");
    await expect(page.getByRole("button", { name: /^Reserve covered woodpile/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "D4", exact: true })).toHaveAccessibleDescription(
      "Tree blocks this footprint",
    );
    await selectTile(page, "H6");
    await action(page, /^Reserve covered woodpile/);
    await walkTo(page, "D4");
    await action(page, /^Fell tree/);
    await action(page, /^Pick up logs/);
    await walkTo(page, "H6");
    await action(page, /^Deliver to covered woodpile/);
    await expect(page.locator("#inspect")).toContainText("Delivered · 2 logs");
    await expect(page.getByRole("button", { name: /^Store firewood/ })).toHaveCount(0);
    await action(page, /^Finish covered woodpile/);
    await walkTo(page, "D4");
    await action(page, /^Split 2 logs/);
    await action(page, /^Pick up firewood/);
    await walkTo(page, "H6");
    await action(page, /^Store firewood/);
    await expect(page.locator("#load")).toContainText("Empty");
    await expect(page.locator("#inspect")).toContainText("2 pieces · 2 ordinary nights");
    await walkTo(page, "C4");
    await action(page, /^Fell tree/);
    for (const [tile, pickup] of [
      ["C4", /^Pick up logs/],
      ["C4", /^Pick up logs/],
      ["E5", /^Pick up stone/],
    ] as const) {
      await walkTo(page, tile);
      await action(page, pickup);
      await walkTo(page, "K4");
      await action(page, /^Deliver materials/);
    }
    for (const job of [/^Lay floor/, /^Raise walls/, /^Fit roof and hearth/])
      await action(page, job);
    for (let day = 1; day < 6; day++) await action(page, /^Rest until tomorrow/);
    await expect(page.locator("#night")).toContainText("Rain tonight");
    await selectTile(page, "D4");
    await expect(page.locator("#inspect")).toContainText("2 firewood");
    await action(page, /^Save First winter/);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First winter" }).click();
    await expect(page.locator("#night")).toContainText("Rain tonight");
    await action(page, /^Rest until tomorrow/);
    await expect(page.locator("#inspect")).toContainText("1 firewood");
    await walkTo(page, "H6");
    await expect(page.locator("#inspect")).toContainText("2 pieces · 2 ordinary nights");
    await action(page, /^Withdraw 1 firewood/);
    await expect(page.locator("#inspect")).toContainText("1 piece · 1 ordinary night");
    await expect(page.locator("#load")).toContainText("1 firewood");
    await expect(page.locator("#night")).toContainText(
      "Covered woodpiles · 1 piece · 1 ordinary night. In hearths · 0 firewood.",
    );
    await walkTo(page, "K4");
    await action(page, /^Add firewood/);
    await action(page, /^Light hearth/);
    await expect(page.locator("#inspect")).toContainText("Hearth · 1 firewood · Lit");
    await expect(page.locator("#load")).toContainText("Empty");
    await expect(page.locator("#night")).toContainText(
      "Covered woodpiles · 1 piece · 1 ordinary night. In hearths · 1 firewood.",
    );
    await action(page, /^Rest until tomorrow/);
    await selectTile(page, "H6");
    await expect(page.locator("#inspect")).toContainText("1 piece · 1 ordinary night");
    await expect(page.locator("#night")).toContainText("2 firewood tonight (1 extra)");
    await expect(page.locator("#night")).toContainText("In hearths · 0 firewood.");
  } finally {
    await context.close();
  }
});
