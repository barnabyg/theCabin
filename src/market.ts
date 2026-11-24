import { Cabin, recipe } from "./cabin";
import { Spring } from "./spring";
import { restoreSpring, snapshot } from "./spring-save";
import { CAPACITY, Homestead, distance, openSite, quantity, type Job } from "./world";

export const marketKey = "the-cabin.market-day";
export const marketRules = {
  daylight: 240,
  reserve: 3,
  salePrices: { food: 2, fur: 3 },
  seedPrice: 3,
  roadMinutes: 30,
};
export const trapline = { x: 8, y: 6 };
export const road = { x: 15, y: 5 };
export const pantry = { x: 5, y: 5 };

export class Market {
  coins = 1;
  seedStock = 2;
  purchased = { food: 0, fur: 0 };
  inTown = false;
  constructor(
    readonly game: Homestead,
    readonly spring: Spring,
  ) {}

  static start() {
    const game = new Homestead();
    const spring = new Spring();
    spring.seeds = { turnip: 0, squash: 0 };
    game.daylight = marketRules.daylight;
    const cabin = new Cabin({ ...openSite });
    cabin.delivered = { ...recipe };
    cabin.stage = 3;
    game.cabins.push(cabin);
    game.plot(pantry).site = { kind: "Pantry", complete: true, delivered: 2, stored: 4 };
    game.plot(game.position).site = { kind: "Garden" };
    game.plot({ x: 7, y: 5 }).site = { kind: "Well", complete: true, delivered: 4 };
    return new Market(game, spring);
  }

  get roadMinutes() {
    return marketRules.roadMinutes * this.game.pace;
  }

  travel() {
    if (this.game.daylight < this.roadMinutes) return;
    this.game.daylight -= this.roadMinutes;
    this.inTown = !this.inTown;
    this.game.message = this.inTown ? "Arrived at the river town." : "Back on the homestead road.";
  }

  jobs(): Job[] {
    const { game } = this;
    if (!distance(game.position, trapline))
      return [
        {
          label: "Collect 1 fur from the trapline",
          minutes: 15,
          enabled: quantity(game.load) < CAPACITY,
          run: () => {
            game.load.fur++;
          },
        },
      ];
    const site = game.plot(game.position).site;
    if (site?.kind !== "Pantry" || !site.complete) return [];
    return [
      {
        label: "Withdraw 1 portion",
        minutes: 1,
        enabled: site.stored > 0 && quantity(game.load) < CAPACITY,
        run: () => {
          site.stored--;
          game.load.food++;
        },
      },
    ];
  }

  sell(material: keyof typeof marketRules.salePrices) {
    if (this.game.load[material] < 1) return;
    this.game.load[material]--;
    this.purchased[material]++;
    this.coins += marketRules.salePrices[material];
  }

  get outcome() {
    const site = this.game.plot(pantry).site;
    const stored = site?.kind === "Pantry" ? site.stored : 0;
    const sown = this.game.plots.some(({ site }) => site?.kind === "Garden" && site.crop);
    const reasons: string[] = [];
    if (!sown) reasons.push("The garden was still unsown at sundown.");
    if (stored < marketRules.reserve)
      reasons.push(
        `The pantry held only ${stored} of the required ${marketRules.reserve} portions.`,
      );
    return reasons;
  }

  buySeed() {
    if (!this.seedStock) return "The merchant has sold the last seed.";
    if (this.coins < marketRules.seedPrice)
      return `Need ${marketRules.seedPrice} coins for one seed.`;
    this.coins -= marketRules.seedPrice;
    this.seedStock--;
    this.spring.seeds.turnip++;
    return "Bought one turnip seed.";
  }

  save() {
    const { coins, seedStock, inTown } = this;
    localStorage.setItem(
      marketKey,
      JSON.stringify({
        version: 1,
        coins,
        purchased: this.purchased,
        seedStock,
        inTown,
        homestead: snapshot(this.game, this.spring),
      }),
    );
  }

  static resume(encoded: string) {
    const data = JSON.parse(encoded);
    if (
      data.version !== 1 ||
      typeof data.inTown !== "boolean" ||
      !Number.isSafeInteger(data.coins) ||
      data.coins < 0 ||
      !Number.isSafeInteger(data.seedStock) ||
      data.seedStock < 0 ||
      data.seedStock > 2
    )
      throw Error("Invalid market save");
    const { game, spring } = restoreSpring(data.homestead);
    const market = new Market(game, spring);
    market.coins = data.coins;
    market.seedStock = data.seedStock;
    for (const material of ["food", "fur"] as const) {
      const bought = data.purchased?.[material] ?? (material === "food" ? data.foodBought : 0) ?? 0;
      if (!Number.isSafeInteger(bought) || bought < 0) throw Error("Invalid merchant stock");
      market.purchased[material] = bought;
    }
    market.inTown = data.inTown;
    game.message = "Market day resumed.";
    return market;
  }
}
