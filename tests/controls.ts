import type { Page } from "@playwright/test";
export const action = (page: Page, name: RegExp) => page.getByRole("button", { name }).click();
export const selectTile = (page: Page, code: string) =>
  page.getByRole("button", { name: code, exact: true }).click();
export async function walkTo(page: Page, code: string) {
  await selectTile(page, code);
  const walk = page.getByRole("button", { name: /^Walk here/ });
  if (await walk.count()) await walk.click();
}
export const cabinStages = [
  "Set footings and sills",
  "Raise wall posts",
  "Frame and shingle roof",
  "Daub joints and fit door",
  "Build hearth and chimney",
] as const;

export async function finishDeliveredCabin(page: Page) {
  for (const stage of cabinStages) await action(page, new RegExp(`^${stage}`));
}

export async function reserveOpen(page: Page) {
  await action(page, /^Build menu/);
  await action(page, /^Open site/);
  await action(page, /^Reserve footprint/);
}
