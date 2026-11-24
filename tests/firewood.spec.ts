import { expect, test } from "@playwright/test";

test("split part of the gathered timber and haul the resulting firewood", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "D4", exact: true }).click();
  await page.getByRole("button", { name: /Walk here/ }).click();
  await page.getByRole("button", { name: /Fell tree/ }).click();
  await page.getByRole("button", { name: /Pick up logs/ }).click();
  await expect(page.locator("#clock")).toHaveText("5h 42m");
  const splitOne = page.getByRole("button", { name: "Split 1 log → 2 firewood · 4 min" });
  const splitPair = page.getByRole("button", { name: "Split 2 logs → 4 firewood · 8 min" });
  await expect(splitOne).toBeEnabled();
  await splitOne.click();
  await expect(page.locator("#load")).toContainText("1 log (1/2)");
  await expect(page.locator("#inspect")).toContainText("2 logs, 2 firewood");
  await expect(page.locator("#clock")).toHaveText("5h 38m");
  await splitPair.click();
  await expect(page.locator("#load")).toContainText("Empty");
  await expect(page.locator("#inspect")).toContainText("1 log, 6 firewood");
  await expect(splitPair).toBeDisabled();
  await expect(page.locator("#clock")).toHaveText("5h 30m");
  await page.getByRole("button", { name: /Pick up firewood/ }).click();
  await expect(page.locator("#load")).toContainText("2 firewood (2/2)");
  await expect(page.locator("#inspect")).toContainText("1 log, 4 firewood");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: /Set down load/ }).click();
  await expect(page.locator("#inspect")).toContainText("On the ground · 2 firewood");
  await expect(page.locator("#load")).toContainText("Empty");
});
