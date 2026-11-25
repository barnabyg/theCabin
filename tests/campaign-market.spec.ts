import { chromium, expect, test } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

test("trade a fur for food, resume at the merchant, and fill the home pantry", async ({
  baseURL,
}, info) => {
  const launch = () => chromium.launchPersistentContext(info.outputPath("trader"), { baseURL });
  let browser = await launch();
  try {
    let page = browser.pages()[0];
    await page.goto("/?scenario=winter");
    await action(page, /^Build menu/);
    await action(page, /^Pantry$/);
    await selectTile(page, "F6");
    await action(page, /^Reserve pantry/);
    await walkTo(page, "C4");
    await action(page, /^Fell tree/);
    await action(page, /^Pick up logs/);
    await walkTo(page, "F6");
    await action(page, /^Deliver to pantry/);
    await action(page, /^Finish pantry/);

    await walkTo(page, "I7");
    await action(page, /^Collect 1 fur/);
    await walkTo(page, "P6");
    await action(page, /^Walk to town/);
    await expect(page.locator("#town")).toContainText("8 food portions in stock");
    await expect(page.locator("#town")).toContainText("Walk home with food · 60 min");
    await action(page, /^Buy 1 turnip seed/);
    await action(page, /^Buy 1 food portion · 2 coins/);
    await expect(page.getByRole("status")).toContainText("Need 2 coins");
    await expect(page.locator("#town")).toContainText("8 food portions in stock");
    await expect(page.locator("#purse")).toHaveText("1 coin");
    await expect(page.locator("#load")).toHaveText("1 fur (1/2)");

    await action(page, /^Sell 1 fur/);
    await action(page, /^Buy 1 food portion/);
    await expect(page.locator("#purse")).toHaveText("2 coins");
    await expect(page.locator("#load")).toHaveText("1 food (1/2)");
    await action(page, /^Save First winter/);
    await browser.close();
    browser = await launch();
    page = browser.pages()[0];
    await page.goto("/");
    await page.getByRole("link", { name: "Resume First winter" }).click();
    await expect(page.locator("#purse")).toHaveText("2 coins");
    await expect(page.locator("#load")).toHaveText("1 food (1/2)");
    await expect(page.locator("#town")).toContainText("7 food portions in stock");
    await action(page, /^Buy 1 food portion/);
    await expect(page.locator("#purse")).toHaveText("0 coins");
    await expect(page.locator("#load")).toHaveText("2 food (2/2)");
    await expect(page.locator("#town")).toContainText("6 food portions in stock");
    await expect(page.getByRole("button", { name: /^Buy 1 food portion/ })).toBeDisabled();
    await action(page, /^Walk home · 60 min/);
    await walkTo(page, "F6");
    await action(page, /^Store harvest/);
    await expect(page.locator("#inspect")).toContainText("Stored · 2 portions");
    await expect(page.locator("#load")).toHaveText("Empty (0/2)");
  } finally {
    await browser.close();
  }
});
