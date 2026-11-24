import { Cabin } from "./cabin";
import { Haul } from "./haul";
import { Spring } from "./spring";
import { freshStock, Homestead } from "./world";

export const saveKey = "the-cabin.first-harvest";

function snapshot(game: Homestead, spring: Spring, haul?: Haul) {
  return {
    version: 1,
    spring,
    position: game.position,
    selected: game.selected,
    daylight: game.daylight,
    plots: game.plots,
    load: game.load,
    cabins: game.cabins.map(({ origin, delivered, stage, hearth }) => ({
      origin,
      delivered,
      stage,
      hearth,
    })),
    haul:
      haul && !haul.finished
        ? {
            source: haul.source,
            cabin: game.cabins.indexOf(haul.cabin),
            material: haul.material,
          }
        : null,
  };
}

export function saveSpring(game: Homestead, spring: Spring, haul?: Haul) {
  localStorage.setItem(saveKey, JSON.stringify(snapshot(game, spring, haul)));
}

export function resumeSpring(encoded: string) {
  const data: ReturnType<typeof snapshot> = JSON.parse(encoded);
  if (data.version !== 1) throw Error("Unsupported save version");
  const game = new Homestead();
  const spring = new Spring();
  spring.day = data.spring.day;
  spring.seeds = data.spring.seeds;
  game.position = data.position;
  game.selected = data.selected;
  game.daylight = data.daylight;
  game.plots = data.plots.map((plot) => ({ ...plot, stock: { ...freshStock(), ...plot.stock } }));
  game.load = { ...freshStock(), ...data.load };
  game.cabins = data.cabins.map((record) => {
    const cabin = new Cabin(record.origin);
    cabin.delivered = record.delivered;
    cabin.stage = record.stage;
    Object.assign(cabin.hearth, record.hearth);
    return cabin;
  });
  let haul: Haul | undefined;
  if (data.haul) {
    haul = new Haul(data.haul.source, game.cabins[data.haul.cabin], data.haul.material);
    haul.paused = true;
  }
  game.message = "Spring day resumed.";
  return { game, spring, haul };
}
