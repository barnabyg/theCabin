import { ordinaryNightFuel, autumnRainDay, soakExposedFirewood } from "./firewood";
import { growGardens } from "./garden";
import type { WorkOrder } from "./haul";
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
  unheated = false;
  retreat: "hunger" | "thirst" | "cold" | undefined;

  get fuelTonight() {
    return this.market.spring.day === winterDay + 1 ? ordinaryNightFuel * 2 : ordinaryNightFuel;
  }

  get shelter() {
    return this.market.inTown ? undefined : this.market.game.shelter;
  }

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
    if (spring.day >= winterDay) {
      this.retreat = takeNightlyRations(game, this.rations);
      let warm = false;
      const shelter = this.shelter;
      for (const cabin of game.cabins) {
        const heated = cabin.hearth.burn(this.fuelTonight);
        if (cabin === shelter) warm = heated;
      }
      if (!warm && this.unheated && !this.retreat) this.retreat = "cold";
      this.unheated = !warm;
    }
    if (this.retreat) {
      game.daylight = 0;
      game.planning = false;
      return;
    }
    if (spring.day === autumnRainDay) soakExposedFirewood(game);
    growGardens(game.plots);
    spring.rest();
    game.planning = false;
    game.daylight = spring.ended ? 0 : spring.day >= winterDay ? dailyMinutes / 2 : dailyMinutes;
  }

  save(haul?: WorkOrder) {
    localStorage.setItem(
      campaignKey,
      JSON.stringify({
        version: 1,
        market: this.market.record(haul),
        rations: this.rations,
        retreat: this.retreat,
        unheated: this.unheated,
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
    if (data.unheated !== undefined && typeof data.unheated !== "boolean")
      throw Error("Invalid warmth history");
    campaign.unheated = data.unheated ?? false;
    if (data.retreat !== undefined && !["hunger", "thirst", "cold"].includes(data.retreat))
      throw Error("Invalid retreat");
    campaign.retreat = data.retreat;
    market.game.message = "First winter resumed.";
    return { campaign, haul };
  }
}
