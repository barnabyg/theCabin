import type { Cabin } from "./cabin";
import type { Job, Stock } from "./world";

export class Hearth {
  fuel = 0;
  lit = false;
  tending(load: Stock, stacks: Stock[], minutes: number): Job[] {
    const source = [load, ...stacks].find((stock) => stock.firewood > 0);
    const jobs: Job[] = [
      {
        label: "Add firewood · 1 piece",
        minutes,
        enabled: !!source,
        run: () => {
          if (source && source.firewood > 0) {
            source.firewood--;
            this.fuel++;
          }
        },
      },
    ];
    if (!this.lit)
      jobs.push({
        label: "Light hearth",
        minutes,
        enabled: this.fuel > 0,
        run: () => {
          this.lit = this.fuel > 0;
        },
      });
    return jobs;
  }
}
const temperatures = [0, -3, -6, -9];
export class Night {
  watch = 0;
  warmth = 3;
  outcome: "dawn" | "retreat" | undefined;
  constructor(readonly shelter: Cabin | undefined) {}
  get temperature() {
    return temperatures[Math.min(this.watch, temperatures.length - 1)];
  }
  get watchesLeft() {
    return temperatures.length - this.watch;
  }
  keepWatch() {
    if (this.outcome) return;
    const hearth = this.shelter?.hearth;
    if (hearth?.lit && hearth.fuel > 0) {
      hearth.fuel--;
      if (!hearth.fuel) hearth.lit = false;
      this.warmth = Math.min(3, this.warmth + 1);
    } else this.warmth = Math.max(0, this.warmth - 2);
    this.watch++;
    if (!this.warmth) this.outcome = "retreat";
    else if (!this.watchesLeft) this.outcome = "dawn";
  }
}
