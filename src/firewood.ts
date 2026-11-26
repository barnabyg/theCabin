import { COLS, type Homestead, type Job, type Stock } from "./world";

export const ordinaryNightFuel = 1;
export const autumnRainDay = 6;

export function fuelCoverage(pieces: number) {
  const nights = Math.floor(pieces / ordinaryNightFuel);
  return `${pieces} ${pieces === 1 ? "piece" : "pieces"} · ${nights} ordinary ${nights === 1 ? "night" : "nights"}`;
}

export function soakExposedFirewood(game: Homestead) {
  for (const [index, plot] of game.plots.entries()) {
    if (!plot.stock.firewood) continue;
    const tile = { x: index % COLS, y: Math.floor(index / COLS) };
    if (!game.cabins.some((cabin) => cabin.complete && cabin.contains(tile))) plot.stock.firewood--;
  }
}

const piecesPerLog = 2;
const minutesPerLog = 4;

export function splitJobs(load: Stock, ground: Stock): Job[] {
  if (!load.logs && !ground.logs) return [];
  return [1, 2].map((logs) => ({
    label: `Split ${logs} ${logs === 1 ? "log" : "logs"} → ${logs * piecesPerLog} firewood`,
    minutes: logs * minutesPerLog,
    get enabled() {
      return load.logs + ground.logs >= logs;
    },
    run() {
      const fromPack = Math.min(load.logs, logs);
      load.logs -= fromPack;
      ground.logs -= logs - fromPack;
      ground.firewood += logs * piecesPerLog;
    },
  }));
}
