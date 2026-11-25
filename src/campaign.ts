import { growGardens } from "./garden";
import type { Haul } from "./haul";
import { Market, marketRules } from "./market";
import { takeNightlyRations } from "./rations";
import { dailyMinutes, Spring } from "./spring";
import { Homestead } from "./world";

export const campaignKey = "the-cabin.first-winter";
export const winterDay = 7;
export const finalDay = 10;

export class Campaign {
  constructor(readonly market: Market) {
    market.foodStock ??= marketRules.foodStock;
  }
  readonly rations = { hungry: false, thirsty: false };
  retreat: "hunger" | "thirst" | undefined;

  get ended() {
    return !!this.retreat || this.market.spring.ended;
  }

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
    if (this.ended) return;
    if (spring.day >= winterDay) this.retreat = takeNightlyRations(game, this.rations);
    if (this.retreat) {
      game.daylight = 0;
      game.planning = false;
      return;
    }
    growGardens(game.plots);
    spring.rest();
    game.planning = false;
    game.daylight = spring.ended ? 0 : dailyMinutes;
  }

  save(haul?: Haul) {
    localStorage.setItem(
      campaignKey,
      JSON.stringify({
        version: 1,
        market: this.market.record(haul),
        rations: this.rations,
        retreat: this.retreat,
      }),
    );
  }

  static resume(encoded: string) {
    const data = JSON.parse(encoded);
    if (data.version !== 1) throw Error("Unknown campaign save");
    const { market, haul } = Market.restore(data.market, finalDay);
    const campaign = new Campaign(market);
    if (data.rations !== undefined) {
      if (typeof data.rations?.hungry !== "boolean" || typeof data.rations?.thirsty !== "boolean")
        throw Error("Invalid ration history");
      campaign.rations.hungry = data.rations.hungry;
      campaign.rations.thirsty = data.rations.thirsty;
    }
    if (data.retreat !== undefined && data.retreat !== "hunger" && data.retreat !== "thirst")
      throw Error("Invalid retreat");
    campaign.retreat = data.retreat;
    return { campaign, haul };
  }
}
