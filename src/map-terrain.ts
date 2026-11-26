import type { Campaign } from "./campaign";
import { paintSeason } from "./season-art";
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

export function paintTerrain(
  ctx: CanvasRenderingContext2D,
  clearing?: HTMLImageElement,
  season?: Campaign["season"],
) {
  if (clearing) {
    ctx.drawImage(clearing, 0, 0, view.width, view.height);
  } else {
    ctx.fillStyle = "#a4ad7a";
    ctx.fillRect(0, 0, view.width, view.height);
    const shore = project([8, 0, 7.24]).y;
    ctx.fillStyle = "#688d82";
    ctx.fillRect(0, shore, view.width, view.height - shore);
  }
  if (season) paintSeason(ctx, season);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(54,54,32,.37)";
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
  ctx.fillStyle = "#fff3ce";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#475239";
  for (let x = 0; x < COLS; x++) {
    const p = project([x + 0.5, 0, 7.16]);
    const letter = String.fromCharCode(65 + x);
    ctx.strokeText(letter, p.x, p.y + 2);
    ctx.fillText(letter, p.x, p.y + 2);
  }
  for (let z = 0; z < 7; z++) {
    const p = project([-0.18, 0, z + 0.52]);
    ctx.strokeText(String(z + 1), p.x, p.y + 4);
    ctx.fillText(String(z + 1), p.x, p.y + 4);
  }
  label(ctx, wooded.x + 1.7, wooded.y - 0.15, "WOODED SITE");
  label(ctx, openSite.x + 1.5, openSite.y - 0.15, "OPEN SITE");
  label(ctx, 14, 8.65, "RIVER TO TOWN →");
}
