import { footprint } from "./cabin";
import { groundCorners, project, view, type Vertex } from "./map-camera";
import { COLS, openSite, wooded } from "./world";

export function groundPath(ctx: CanvasRenderingContext2D, vertices: Vertex[]) {
  ctx.beginPath();
  for (const [i, vertex] of vertices.entries()) {
    const p = project(vertex);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

export function markGround(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  width: number,
  depth: number,
  fill: string,
  stroke: string,
  line = 2,
) {
  groundPath(ctx, groundCorners(x, z, width, depth));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = line;
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, x: number, z: number, text: string) {
  const p = project([x, 0, z]);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  const width = ctx.measureText(text).width + 12;
  ctx.fillStyle = "rgba(47,66,52,.88)";
  ctx.fillRect(p.x - width / 2, p.y - 9, width, 18);
  ctx.fillStyle = "#ffefd0";
  ctx.fillText(text, p.x, p.y + 4);
}

export function paintTerrain(ctx: CanvasRenderingContext2D) {
  let seed = 1791;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const meadow = ctx.createLinearGradient(0, 0, 0, view.height);
  meadow.addColorStop(0, "#8aafa0");
  meadow.addColorStop(0.25, "#9eae80");
  meadow.addColorStop(0.72, "#bbc28c");
  meadow.addColorStop(1, "#bdc58d");
  ctx.fillStyle = meadow;
  ctx.fillRect(0, 0, view.width, view.height);

  // Layer the far bank, wooded ridges and mist into the meadow.
  ctx.fillStyle = "#e8e3c9";
  ctx.fillRect(0, 0, view.width, 92);
  for (const [layer, color] of ["#b5c6b4", "#8ea99a", "#769583", "#889f80"].entries()) {
    ctx.beginPath();
    ctx.moveTo(0, 105);
    for (let x = 0; x <= view.width + 4; x += 3) {
      const y =
        18 + layer * 18 + Math.sin(x / 150 + layer * 1.7) * 13 + Math.sin(x / 79 + layer) * 5;
      ctx.lineTo(x, y - (layer ? random() * 6 : 0));
    }
    ctx.lineTo(view.width + 4, 105);
    const haze = ctx.createLinearGradient(0, 65, 0, 105);
    haze.addColorStop(0, color);
    haze.addColorStop(1, "#99aa82");
    ctx.fillStyle = haze;
    ctx.fill();
  }
  for (let i = 0; i < 320; i++) {
    const x = random() * view.width,
      y = 110 + random() * 390;
    ctx.fillStyle = i % 3 ? "rgba(99,131,78,.065)" : "rgba(236,212,150,.12)";
    ctx.beginPath();
    ctx.ellipse(x, y, 12 + random() * 52, 2 + random() * 9, 0, 0, 2 * Math.PI);
    ctx.fill();
  }

  const bank = (x: number) => 7.22 + 0.1 * Math.sin(x * 1.6) + 0.07 * Math.cos(x * 2.6);
  const trail = (x: number) => 5.45 + 0.3 * Math.sin(x / 1.7);
  function ribbon(edge: (x: number) => number, offset: number, width: number, color: string) {
    const points: Vertex[] = [];
    for (let x = -6; x <= 22; x += 0.125) points.push([x, 0, edge(x) + offset]);
    groundPath(ctx, [...points, ...points.reverse().map(([x, h, z]): Vertex => [x, h, z + width])]);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ribbon(trail, -0.19, 0.38, "#cbb88b");
  ribbon(trail, -0.07, 0.13, "#d4c498");
  ribbon(bank, 0, 0.24, "#d8ca9e");
  ribbon(bank, 0.19, 0.2, "#9eac91");
  ribbon(bank, 0.27, 8, "#81aa9d");
  ribbon(bank, 0.34, 8, "#68978e");

  for (let i = 0; i < 3700; i++) {
    const x = random() * 22 - 3,
      z = random() * 15 - 4;
    const p = project([x, 0, z]);
    if (p.y < 105 || p.y > view.height) continue;
    if (z > bank(x) + 0.3) {
      const length = 3 + random() * 18;
      ctx.strokeStyle = i % 4 ? "rgba(193,216,183,.65)" : "rgba(66,119,114,.58)";
      ctx.lineWidth = 0.7 + random() * 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + length * 0.5, p.y + 2, p.x + length, p.y);
      ctx.stroke();
    } else if (Math.abs(z - trail(x)) < 0.21 || z > bank(x)) {
      ctx.fillStyle = "#aea27e";
      ctx.fillRect(p.x, p.y, 1 + random() * 3, 1);
    } else {
      ctx.strokeStyle = i % 3 ? "rgba(84,106,68,.35)" : "rgba(235,223,165,.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - 2, p.y - 2);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + 2, p.y - 2 - random() * 3);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(63,84,56,.21)";
  for (let x = 0; x <= COLS; x++) {
    groundPath(ctx, [
      [x, 0, 0],
      [x, 0, 7],
    ]);
    ctx.stroke();
  }
  for (let z = 0; z <= 7; z++) {
    groundPath(ctx, [
      [0, 0, z],
      [COLS, 0, z],
    ]);
    ctx.stroke();
  }
  for (const site of [wooded, openSite]) {
    markGround(
      ctx,
      site.x,
      site.y,
      footprint.width,
      footprint.height,
      "rgba(243,224,167,.23)",
      "#897951",
    );
  }
  // Put the map references on the banks, outside the tile hit regions.
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#3d5641";
  for (let x = 0; x < COLS; x++) {
    const p = project([x + 0.5, 0, 7.16]);
    ctx.fillText(String.fromCharCode(65 + x), p.x, p.y + 2);
  }
  for (let z = 0; z < 7; z++) {
    const p = project([-0.18, 0, z + 0.52]);
    ctx.fillText(String(z + 1), p.x, p.y + 4);
  }
  label(ctx, wooded.x + 1.7, wooded.y - 0.15, "WOODED SITE");
  label(ctx, openSite.x + 1.5, openSite.y - 0.15, "OPEN SITE");
  label(ctx, 14, 8.65, "RIVER TO TOWN →");
}
