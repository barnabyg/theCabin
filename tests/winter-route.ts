import { expect, type Page } from "@playwright/test";
import { action, selectTile, walkTo } from "./controls";

export const rest = (page: Page) => action(page, /^Rest until tomorrow/);

async function deliver(page: Page, material: string, source: string, target: string, job: RegExp) {
  await walkTo(page, source);
  await action(page, new RegExp(`^Pick up ${material}`));
  await walkTo(page, target);
  await action(page, job);
}

export async function buildPantry(page: Page) {
  await action(page, /^Build menu/);
  await action(page, /^Pantry$/);
  await selectTile(page, "F6");
  await action(page, /^Reserve pantry/);
  await walkTo(page, "C4");
  await action(page, /^Fell tree/);
  await deliver(page, "logs", "C4", "F6", /^Deliver to pantry/);
  await action(page, /^Finish pantry/);
}

export async function buildCabin(page: Page) {
  await action(page, /^Build menu/);
  await action(page, /^Cabin$/);
  await action(page, /^Open site/);
  await action(page, /^Reserve footprint/);
  await walkTo(page, "D4");
  await action(page, /^Fell tree/);
  for (let load = 0; load < 2; load++)
    await deliver(page, "logs", "D4", "K4", /^Deliver materials/);
  await deliver(page, "stone", "E5", "K4", /^Deliver materials/);
  await action(page, /^Lay floor/);
  await action(page, /^Raise walls/);
  await action(page, /^Fit roof and hearth/);
}

export async function prepareHearth(page: Page, pieces = 5) {
  await walkTo(page, "B5");
  await action(page, /^Fell tree/);
  while (pieces > 0) {
    await deliver(page, "logs", "B5", "K4", /^Split 2 logs/);
    const batch = Math.min(pieces, 4);
    pieces -= batch;
    for (let piece = 0; piece < batch; piece++) await action(page, /^Add firewood/);
  }
}

export async function storeWater(page: Page) {
  for (let load = 0; load < 2; load++) {
    await walkTo(page, "G7");
    await action(page, /^Draw stream water/);
    await action(page, /^Draw stream water/);
    await walkTo(page, "F6");
    await action(page, /^Store drinking water/);
  }
}

export async function sowSquash(page: Page) {
  await walkTo(page, "P6");
  await action(page, /^Walk to town/);
  await expect(page.getByRole("button", { name: /^Buy 1 squash seed/ })).toBeVisible();
  await action(page, /^Buy 1 squash seed/);
  await action(page, /^Walk home/);
  await action(page, /^Build menu/);
  await action(page, /^Garden$/);
  await selectTile(page, "G6");
  await action(page, /^Prepare garden/);
  await action(page, /^Sow squash/);
}

export async function waterAndRest(page: Page) {
  await walkTo(page, "G7");
  await action(page, /^Draw stream water/);
  await walkTo(page, "G6");
  await action(page, /^Water crop/);
  await rest(page);
}

export async function harvestStores(page: Page, pieces = 5) {
  await sowSquash(page);
  await waterAndRest(page);
  await buildPantry(page);
  await waterAndRest(page);
  await buildCabin(page);
  await waterAndRest(page);
  await prepareHearth(page, pieces);
  await waterAndRest(page);
  await action(page, /^Harvest squash/);
  for (let load = 0; load < 3; load++) await deliver(page, "food", "G6", "F6", /^Store harvest/);
  await storeWater(page);
  await rest(page);
  await rest(page);
  await expect(page.locator("#calendar")).toContainText("Winter · Day 7");
  await walkTo(page, "K4");
}
