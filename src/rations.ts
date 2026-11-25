import type { Pantry } from "./outbuilding";
import type { Homestead, Job } from "./world";

export interface MissedRations {
  hungry: boolean;
  thirsty: boolean;
}

function pantries(game: Homestead): Pantry[] {
  return game.plots.flatMap(({ site }) => (site?.kind === "Pantry" && site.complete ? [site] : []));
}

export function pantryReserves(game: Homestead) {
  let meals = 0;
  let drinks = 0;
  for (const pantry of pantries(game)) {
    meals += pantry.stored;
    drinks += pantry.water ?? 0;
  }
  return { meals, drinks };
}

export function storeDrinkingWater(game: Homestead): Job[] {
  const pantry = game.plot(game.position).site;
  if (pantry?.kind !== "Pantry" || !pantry.complete) return [];
  return [
    {
      label: "Store drinking water",
      minutes: 1,
      enabled: game.load.water > 0,
      run: () => {
        pantry.water = (pantry.water ?? 0) + game.load.water;
        game.load.water = 0;
      },
    },
  ];
}

export function takeNightlyRations(game: Homestead, missed: MissedRations) {
  const stores = pantries(game);
  const meal = stores.find((pantry) => pantry.stored > 0);
  const drink = stores.find((pantry) => (pantry.water ?? 0) > 0);
  if (meal) meal.stored--;
  if (drink) drink.water = (drink.water ?? 0) - 1;
  const cause = !meal && missed.hungry ? "hunger" : !drink && missed.thirsty ? "thirst" : undefined;
  missed.hungry = !meal;
  missed.thirsty = !drink;
  return cause;
}
