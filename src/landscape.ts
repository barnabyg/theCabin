import Phaser from "phaser";
import { COLS, ROWS, TILE, openSite, wooded, type Homestead } from "./world";
const W = COLS * TILE,
  H = ROWS * TILE;
type Graphics = Phaser.GameObjects.Graphics;
function polygon(g: Graphics, color: number, points: number[][]) {
  g.fillStyle(color).fillPoints(
    points.map(([x, y]) => ({ x, y })),
    true,
  );
}
function pine(g: Graphics, x: number, y: number, tint: number) {
  g.fillStyle(0x455c44, 0.33).fillEllipse(x + 8, y + 14, 43, 13);
  g.fillStyle(0x68513b).fillRect(x - 3, y - 4, 6, 19);
  for (const [dy, w] of [
    [7, 23],
    [-4, 19],
    [-14, 13],
  ]) {
    polygon(g, 0x344d3d, [
      [x, y + dy - 22],
      [x - w, y + dy + 4],
      [x - 6, y + dy + 2],
      [x - 1, y + dy + 7],
      [x + w, y + dy + 3],
    ]);
    polygon(g, tint, [
      [x, y + dy - 22],
      [x - w, y + dy + 3],
      [x - 7, y + dy],
      [x - 2, y + dy + 3],
      [x + 3, y + dy - 1],
    ]);
  }
}
function bank(x: number) {
  return 415 + Math.sin(x / 102) * 12 + Math.cos(x / 48) * 6;
}
export class Landscape extends Phaser.Scene {
  private ground?: Graphics;
  private objects?: Graphics;
  constructor(private homestead: Homestead) {
    super("clearing");
  }
  create() {
    const g = this.add.graphics();
    this.ground = g;
    this.objects = this.add.graphics();
    g.fillStyle(0xa3af80).fillRect(0, 0, W, H);
    let seed = 1791;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 280; i++) {
      const x = random() * W,
        y = random() * H;
      g.fillStyle(i % 2 ? 0x84996d : 0xc7bf8a, 0.22).fillEllipse(
        x,
        y,
        20 + random() * 65,
        10 + random() * 30,
      );
    }
    // The track crosses the clearing and follows the bank toward town.
    for (let x = -10; x < W + 10; x += 4) {
      const y = 306 + Math.sin(x / 138) * 24;
      g.fillStyle(0xc4b389).fillEllipse(x, y, 22, 19);
    }
    for (let i = 0; i < 2100; i++) {
      const x = random() * W,
        y = random() * H;
      g.lineStyle(1, i % 3 ? 0x667f55 : 0xe0d3a2, 0.52).lineBetween(
        x,
        y,
        x + 2,
        y - 2 - random() * 3,
      );
    }
    for (let x = 0; x < W; x++) {
      const y = bank(x);
      g.fillStyle(0xcac198).fillRect(x, y - 4, 1, H - y + 4);
      g.fillStyle(0x64958a).fillRect(x, y, 1, H - y);
    }
    for (let i = 0; i < 300; i++) {
      const x = random() * W,
        y = bank(x) + 4 + random() * 85;
      g.lineStyle(i % 4 ? 1 : 2, i % 2 ? 0xa4c3a7 : 0x477e77, 0.7).lineBetween(
        x,
        y,
        x + 3 + random() * 15,
        y,
      );
    }
    for (const p of [wooded, openSite]) {
      const x = p.x * TILE,
        y = p.y * TILE;
      g.fillStyle(0xf3e7aa, 0.14).fillRect(x, y, TILE * 3, TILE * 2);
      g.lineStyle(2, 0x736e4f, 0.8).strokeRect(x + 1, y + 1, TILE * 3 - 2, TILE * 2 - 2);
      const label = this.add.text(x + 3, y - 17, p === wooded ? "WOODED SITE" : "OPEN SITE", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#faf5d8",
        backgroundColor: "#485c45",
        padding: { x: 5, y: 2 },
      });
      label.setDepth(2);
    }
    for (let x = 0; x <= COLS; x++)
      g.lineStyle(1, 0x536548, 0.13).lineBetween(x * TILE, 0, x * TILE, 7 * TILE);
    for (let y = 0; y <= 7; y++)
      g.lineStyle(1, 0x536548, 0.13).lineBetween(0, y * TILE, W, y * TILE);
    this.add
      .text(W - 16, H - 24, "~ RIVER TO TOWN →", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#e4ecce",
      })
      .setOrigin(1, 0);
    this.paint();
  }
  paint() {
    if (!this.ground || !this.objects) return;
    const g = this.objects;
    g.clear();
    for (const cabin of this.homestead.cabins) {
      const x = cabin.origin.x * TILE,
        y = cabin.origin.y * TILE;
      g.fillStyle(0x344e53, 0.52).fillRect(x + 3, y + 3, TILE * 3 - 6, TILE * 2 - 6);
      g.lineStyle(3, 0xf2e5c0).strokeRect(x + 7, y + 7, TILE * 3 - 14, TILE * 2 - 14);
      g.lineBetween(x + 8, y + 8, x + TILE * 3 - 8, y + TILE * 2 - 8).lineBetween(
        x + 8,
        y + TILE * 2 - 8,
        x + TILE * 3 - 8,
        y + 8,
      );
    }
    for (const cabin of this.homestead.cabins) {
      if (!cabin.stage) continue;
      const x = cabin.origin.x * TILE + 12,
        y = cabin.origin.y * TILE + 13,
        w = 3 * TILE - 24,
        h = 2 * TILE - 26;
      g.fillStyle(0x886d4c).fillRect(x, y, w, h);
      for (let row = 2; row < h; row += 8)
        g.lineStyle(2, 0xb7986c).lineBetween(x + 2, y + row, x + w - 2, y + row);
      if (cabin.stage >= 2) {
        g.lineStyle(9, 0x654d37).strokeRect(x + 3, y + 3, w - 6, h - 6);
        g.fillStyle(0x8a7050).fillRect(x + w / 2 - 12, y + h - 10, 24, 12);
      }
      if (cabin.complete) {
        polygon(g, 0x654735, [
          [x - 6, y - 3],
          [x + w + 6, y - 3],
          [x + w - 4, y + h / 2],
          [x + 4, y + h / 2],
        ]);
        polygon(g, 0x9a6949, [
          [x + 4, y + h / 2],
          [x + w - 4, y + h / 2],
          [x + w + 6, y + h + 3],
          [x - 6, y + h + 3],
        ]);
        for (let i = 8; i < w; i += 12)
          g.lineStyle(2, 0x775540).lineBetween(x + i, y + h / 2 + 2, x + i - 4, y + h + 1);
        g.fillStyle(0x596258).fillRect(x + w - 29, y + 8, 16, 21);
        g.fillStyle(0xb4ad98).fillRect(x + w - 31, y + 5, 20, 7);
      }
    }
    if (this.homestead.planning) {
      const p = this.homestead.preview;
      g.fillStyle(0xfbe6a9, 0.3).fillRect(p.x * TILE, p.y * TILE, TILE * 3, TILE * 2);
      g.lineStyle(3, 0xffeba9).strokeRect(
        p.x * TILE + 2,
        p.y * TILE + 2,
        TILE * 3 - 4,
        TILE * 2 - 4,
      );
    }
    for (const [i, plot] of this.homestead.plots.entries()) {
      const x = ((i % COLS) + 0.5) * TILE,
        y = (Math.floor(i / COLS) + 0.5) * TILE;
      if (plot.timber === "Tree") pine(g, x, y, i % 2 ? 0x597649 : 0x4d7052);
      if (plot.timber === "Stump") {
        g.fillStyle(0x6f573a).fillRect(x - 8, y - 4, 16, 12);
        g.fillStyle(0xc79b61).fillEllipse(x, y - 4, 18, 8);
        g.lineStyle(1, 0x87663f).strokeEllipse(x, y - 4, 11, 5);
      }
      if (plot.stock.logs) {
        for (let j = 0; j < Math.min(plot.stock.logs, 4); j++) {
          const dx = x + 8 + (j % 2) * 6,
            dy = y + 8 + Math.floor(j / 2) * 5;
          g.lineStyle(6, 0x73583d).lineBetween(dx, dy, dx + 11, dy - 7);
          g.fillStyle(0xd8ae73).fillCircle(dx, dy, 3);
        }
      }
      for (let piece = 0; piece < Math.min(plot.stock.firewood, 6); piece++) {
        const dx = x - 20 + (piece % 3) * 4,
          dy = y + 12 - Math.floor(piece / 3) * 4;
        g.lineStyle(4, 0x855b36).lineBetween(dx, dy, dx + 9, dy - 7);
        g.lineStyle(2, 0xe6bd77).lineBetween(dx, dy - 1, dx + 9, dy - 8);
      }
      if (plot.stock.stone) {
        for (const [dx, dy, s] of [
          [-9, 3, 10],
          [7, 7, 8],
          [3, -5, 7],
        ]) {
          polygon(g, 0x6c776d, [
            [x + dx - s, y + dy + 3],
            [x + dx - 4, y + dy - s],
            [x + dx + 4, y + dy - s + 1],
            [x + dx + s, y + dy + 4],
          ]);
          g.lineStyle(2, 0xbac0a7).lineBetween(
            x + dx - s + 2,
            y + dy + 1,
            x + dx - 4,
            y + dy - s + 1,
          );
        }
      }
    }
    const x = (this.homestead.position.x + 0.5) * TILE,
      y = (this.homestead.position.y + 0.5) * TILE;
    g.fillStyle(0x314737, 0.4).fillEllipse(x + 3, y + 13, 23, 8);
    g.lineStyle(3, 0xffecb5).strokeEllipse(x, y + 10, 29, 13);
    g.fillStyle(0x433d32)
      .fillRect(x - 6, y + 5, 5, 9)
      .fillRect(x + 2, y + 5, 5, 9);
    g.fillStyle(0xa24c32).fillRoundedRect(x - 7, y - 6, 14, 15, 3);
    g.fillStyle(0xe2bc85).fillCircle(x, y - 8, 6);
    g.fillStyle(0x594936)
      .fillEllipse(x, y - 12, 19, 5)
      .fillRoundedRect(x - 5, y - 18, 10, 6, 2);
  }
}
export function startLandscape(homestead: Homestead) {
  const scene = new Landscape(homestead);
  new Phaser.Game({
    type: Phaser.CANVAS,
    width: W,
    height: H,
    parent: "terrain",
    scene,
    audio: { noAudio: true },
    banner: false,
    render: { antialias: true },
    fps: { target: 30 },
  });
  return () => scene.paint();
}
