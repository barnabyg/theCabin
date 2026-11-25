import { buildingMaterials, footprintTiles, type Cabin, type BuildingMaterial } from "./cabin";
import {
  CAPACITY,
  minutes,
  coordinate,
  distance,
  quantity,
  pickup,
  timberJob,
  type Homestead,
  type Job,
  type Point,
} from "./world";

function stepToward(game: Homestead, target: Point): Job | undefined {
  if (!distance(game.position, target)) return;
  const { x, y } = game.position;
  return {
    label: `Walking toward ${coordinate(target)}`,
    minutes: game.pace,
    run: () => {
      game.position = {
        x: x + Math.sign(target.x - x),
        y: y + (target.x === x ? Math.sign(target.y - y) : 0),
      };
    },
  };
}

abstract class Order {
  paused = false;
  finished = false;
  abstract next(game: Homestead): Job | undefined;
  advance(game: Homestead) {
    if (this.paused || this.finished) return;
    const job = this.next(game);
    if (!job) {
      this.finished = true;
      return;
    }
    if (game.daylight < job.minutes || job.enabled === false) {
      this.paused = true;
      game.message =
        job.enabled === false
          ? "Make room in the pack to resume."
          : "Insufficient daylight for the next haul step.";
      return;
    }
    game.commit(job);
    game.selected = { ...game.position };
    this.finished = !this.next(game);
  }
}

export type WorkOrder = Haul | ClearArea;

export class Haul extends Order {
  constructor(
    readonly source: Point,
    readonly cabin: Cabin,
    readonly material: BuildingMaterial,
  ) {
    super();
  }
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
    const step = stepToward(game, target);
    if (step) return step;
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
}

export class ClearArea extends Order {
  constructor(
    readonly origin: Point,
    readonly storage: Point,
  ) {
    super();
  }

  next(game: Homestead): Job | undefined {
    if (buildingMaterials.some((m) => game.load[m])) {
      return (
        stepToward(game, this.storage) ?? {
          label: "Store building materials",
          minutes: minutes.transfer,
          run: () => {
            const pile = game.plot(this.storage).stock;
            for (const material of buildingMaterials) {
              pile[material] += game.load[material];
              game.load[material] = 0;
            }
          },
        }
      );
    }
    for (const tile of footprintTiles(this.origin)) {
      const plot = game.plot(tile);
      const timber = timberJob(plot);
      const material = buildingMaterials.find((m) => plot.stock[m]);
      const job = timber ?? (material && pickup(game.load, plot.stock, material));
      if (job) return stepToward(game, tile) ?? job;
    }
  }
}
