import { growGardens } from "./garden";
import type { Haul } from "./haul";
import { Market } from "./market";
import { dailyMinutes, Spring } from "./spring";
import { Homestead } from "./world";

export const campaignKey = "the-cabin.first-winter";
export const winterDay = 7;
export const finalDay = 10;

export class Campaign {
  constructor(readonly market: Market) {}

  static start() {
    const spring = new Spring(finalDay);
    spring.seeds = { turnip: 0, squash: 0 };
    const market = new Market(new Homestead(), spring);
    market.coins = 4;
    return new Campaign(market);
  }

  get season() {
    const day = this.market.spring.day;
    if (day > finalDay) return "Thaw";
    if (day >= winterDay) return "Winter";
    return day <= 3 ? "Spring" : day <= 5 ? "Summer" : "Autumn";
  }

  rest() {
    const { game, spring } = this.market;
    if (spring.ended) return;
    growGardens(game.plots);
    spring.rest();
    game.planning = false;
    game.daylight = spring.ended ? 0 : dailyMinutes;
  }

  save(haul?: Haul) {
    localStorage.setItem(
      campaignKey,
      JSON.stringify({ version: 1, market: this.market.record(haul) }),
    );
  }

  static resume(encoded: string) {
    const data = JSON.parse(encoded);
    if (data.version !== 1) throw Error("Unknown campaign save");
    const { market, haul } = Market.restore(data.market, finalDay);
    return { campaign: new Campaign(market), haul };
  }
}
