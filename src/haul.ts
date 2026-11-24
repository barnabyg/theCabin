import type { Cabin, BuildingMaterial } from "./cabin";
import {
  CAPACITY,
  minutes,
  coordinate,
  distance,
  quantity,
  type Homestead,
  type Job,
  type Point,
} from "./world";

export class Haul {
  paused = false;
  finished = false;
  constructor(
    readonly source: Point,
    readonly cabin: Cabin,
    readonly material: BuildingMaterial,
  ) {}
  get firstTripMinutes() {
    return 2 * minutes.transfer + distance(this.source, this.cabin.origin) * minutes.loadedStep;
  }
  get repeatTripMinutes() {
    return this.firstTripMinutes + distance(this.source, this.cabin.origin) * minutes.emptyStep;
  }
  next(game: Homestead): Job | undefined {
    const needed = this.cabin.remaining(this.material);
    if (needed === 0) return;
    const loaded = game.load[this.material] > 0;
    const target = loaded ? this.cabin.origin : this.source;
    if (
      !loaded &&
      (game.plot(this.source).stock[this.material] === 0 || quantity(game.load) >= CAPACITY)
    )
      return;
    if (distance(game.position, target)) {
      const { x, y } = game.position;
      const step = {
        x: x + Math.sign(target.x - x),
        y: y + (target.x === x ? Math.sign(target.y - y) : 0),
      };
      return {
        label: `Hauling toward ${coordinate(target)}`,
        minutes: game.pace,
        run: () => {
          game.position = step;
        },
      };
    }
    if (loaded) return this.cabin.delivery(game.load);
    const pile = game.plot(this.source).stock;
    const amount = Math.min(CAPACITY - quantity(game.load), needed, pile[this.material]);
    return {
      label: `Load ${this.material}`,
      minutes: minutes.transfer,
      run: () => {
        game.load[this.material] += amount;
        pile[this.material] -= amount;
      },
    };
  }
  advance(game: Homestead) {
    if (this.paused || this.finished) return;
    const job = this.next(game);
    if (!job) {
      this.finished = true;
      return;
    }
    if (game.daylight < job.minutes) {
      this.paused = true;
      game.message = "Insufficient daylight for the next haul step.";
      return;
    }
    game.commit(job);
    game.selected = { ...game.position };
    if (!this.next(game)) this.finished = true;
  }
}
