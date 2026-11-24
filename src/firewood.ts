import type { Job, Stock } from "./world";

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
