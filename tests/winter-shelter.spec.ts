import { expect, test } from "@playwright/test";
import { action, cabinStages } from "./controls";

for (const site of ["Open site", "Wooded site"]) {
  test(`a new First winter player can compare sites and complete shelter at the ${site}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("link", { name: "First winter" }).click();
    await action(page, /^Build menu · Compare cabin sites/);
    const menu = page.locator("#plan-menu");
    await expect(menu).toContainText("Clear the wooded site at D4");
    await expect(menu).toContainText("longer haul to the open site at K4");
    await action(page, /^Wooded site$/);
    await expect(menu).toContainText("D4 · Tree");
    await expect(menu).toContainText("E5 · Raw rock");
    const tree = page.getByRole("button", { name: "D4", exact: true });
    await expect(tree).toHaveAccessibleDescription("Tree blocks this footprint");
    await expect(page.getByRole("button", { name: "Reserve footprint" })).toBeDisabled();
    await expect(page.locator("#clock")).toHaveText("6h 00m");
    await expect(page.locator("#load")).toHaveText("Empty (0/2)");
    await expect(page.locator("#purse")).toHaveText("4 coins");
    if (site === "Wooded site") {
      await page.clock.install();
      await action(page, /^Mark storage at G6$/);
      await action(page, /^Clear area$/);
      await page.clock.runFor(15000);
      await expect(page.locator("#haul")).toContainText("Ready to reserve");
      await action(page, /^Build menu/);
      await expect(tree).toHaveAccessibleDescription("");
    } else {
      await action(page, /^Open site$/);
    }
    await expect(menu).toContainText("Footprint clear");
    await action(page, /^Reserve footprint$/);
    const guide = page.locator("#cabin-guide");
    await expect(guide).toContainText(`Cabin at ${site === "Open site" ? "K4" : "D4"}`);
    const next = guide.getByRole("button");
    await expect(next).toBeFocused();
    for (const stage of cabinStages) {
      await expect(guide.getByRole("heading")).toHaveText(stage);
      for (let step = 0; step < 12 && !(await next.textContent())?.startsWith(stage); step++) {
        await next.click();
      }
      await expect(next).toContainText(stage);
      await next.click();
    }
    await expect(guide.getByRole("heading")).toHaveText("Cabin complete");
    await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
  });
}
