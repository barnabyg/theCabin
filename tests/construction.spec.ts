import { expect, test } from "@playwright/test";
import { action, reserveOpen, selectTile, walkTo } from "./controls";
test("build from a reservation by following the cabin's next action", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await reserveOpen(page);
  const guide = page.locator("#cabin-guide");
  const next = guide.getByRole("button");
  await expect(next).toBeFocused();
  await expect(guide).toContainText("Cabin at K4");
  await selectTile(page, "B7");
  const steps = [
    "Walk to the tree",
    "Fell tree",
    "Pick up logs",
    "Walk to the cabin",
    "Deliver materials",
    "Walk to the rock",
    "Work rock with pickaxe",
    "Pick up stone",
    "Walk to the cabin",
    "Deliver materials",
    "Set footings and sills",
    "Walk to the logs",
    "Pick up logs",
    "Walk to the cabin",
    "Deliver materials",
    "Raise wall posts",
    "Frame and shingle roof",
    "Daub joints and fit door",
    "Build hearth and chimney",
  ];
  for (const step of steps) {
    await expect(next).toContainText(step);
    await next.click();
  }
  await expect(guide.getByRole("heading")).toHaveText("Cabin complete");
  await expect(next).toBeHidden();
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
});

test("interrupt a repeat haul, preserve its load, then finish the cabin in stages", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T12:01:00Z"));
  await page.goto("/");
  await reserveOpen(page);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  await action(page, /^Repeat haul · logs to K4/);
  await expect(page.locator("#cabin-guide")).toBeHidden();
  const pause = page.getByRole("button", { name: "Pause haul" });
  await pause.focus();
  const advanceToLoad = (label: string) =>
    expect
      .poll(
        async () => {
          await page.clock.runFor(400);
          return page.locator("#load").textContent();
        },
        { intervals: [0] },
      )
      .toContain(label);
  await advanceToLoad("Empty");
  await expect(pause).toBeFocused();
  await advanceToLoad("2 logs");
  await action(page, /^Pause haul/);
  await expect(page.locator("#haul")).toContainText("Paused");
  await expect(page.locator("#load")).toContainText("2 logs");
  await selectTile(page, "K4");
  await expect(page.locator("#inspect")).toContainText("Delivered · 2 logs, 0 stone");
  await action(page, /^Resume haul/);
  await page.clock.resume();
  await expect(page.locator("#haul")).toContainText("Haul complete", { timeout: 25000 });
  await expect(pause).toBeHidden();
  await expect(page.locator("#inspect")).toContainText("Delivered · 4 logs, 0 stone");
  await expect(page.getByRole("button", { name: /^Set footings/ })).toBeDisabled();
  await expect(page.locator("#load")).toContainText("Empty");
  await walkTo(page, "E5");
  await action(page, /^Work rock with pickaxe/);
  await action(page, /^Pick up stone/);
  await walkTo(page, "K4");
  await expect(page.locator("#inspect")).toContainText("Blueprint");
  await action(page, /^Deliver materials/);
  await expect(page.locator("#inspect")).toContainText("Outstanding · 0 logs, 0 stone");
  await expect(page.getByRole("button", { name: /Deliver materials/ })).toHaveCount(0);
  await action(page, /^Set footings/);
  await expect(page.locator("#inspect")).toContainText("Sills set");
  await action(page, /^Raise wall posts/);
  await expect(page.locator("#inspect")).toContainText("Wall posts raised");
  await action(page, /^Frame and shingle roof/);
  await expect(page.locator("#inspect")).toContainText("Roof shingled");
  await action(page, /^Daub joints/);
  await expect(page.locator("#inspect")).toContainText("Walls sealed");
  await action(page, /^Build hearth/);
  await expect(page.locator("#inspect")).toContainText("Stone hearth ready");
  await expect(page.getByRole("button", { name: /Split 1 log/ })).toHaveCount(0);
});
