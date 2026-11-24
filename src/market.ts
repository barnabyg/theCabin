import { Cabin, recipe } from "./cabin";
import { Spring } from "./spring";
import { restoreSpring, snapshot } from "./spring-save";
import { Homestead, openSite } from "./world";

export const marketKey = "the-cabin.market-day";
export const marketRules = { daylight: 240, reserve: 3, seedPrice: 3, roadMinutes: 30 };
export const road = { x: 15, y: 5 };
export const pantry = { x: 5, y: 5 };

export class Market {
  coins = 1;
  seedStock = 2;
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
    market.inTown = data.inTown;
    game.message = "Market day resumed.";
    return market;
  }
}
