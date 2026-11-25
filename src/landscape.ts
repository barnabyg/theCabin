import { footprint } from "./cabin";
import { view, type Vertex } from "./map-camera";
import { groundPath, markGround, paintTerrain } from "./map-terrain";
import { cabinModel, pine, plotModel, settler } from "./map-models";
import { loadMapArt, type MapArt } from "./map-art";
import { COLS, type Homestead, type Point } from "./world";

function groundDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  height: number,
  radius: number,
  depth: number,
  color: string,
) {
  const points: Vertex[] = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI) / 12;
    return [x + radius * Math.cos(angle), height, z + depth * Math.sin(angle)];
  });
  groundPath(ctx, points);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function startLandscape(game: Homestead) {
  const terrain = document.getElementById("terrain");
  if (!terrain) throw new Error("Missing terrain container");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  terrain.append(canvas);
  const ctx = canvas.getContext("2d");
  const background = document.createElement("canvas");
  const ground = background.getContext("2d");
  if (!ctx || !ground) throw new Error("Canvas drawing is unavailable");
  const hitRegions: { outline: Path2D; tile?: Point }[] = [];
  let art: MapArt | undefined;
  let paintedArt: MapArt | undefined;

  function paint() {
    if (!ctx || !ground || !canvas.clientWidth) return;
    const scale = (canvas.clientWidth * window.devicePixelRatio) / view.width;
    const width = Math.max(1, Math.round(view.width * scale)),
      height = Math.max(1, Math.round(view.height * scale));
    if (background.width !== width || background.height !== height || paintedArt !== art) {
      background.width = canvas.width = width;
      background.height = canvas.height = height;
      ground.setTransform(width / view.width, 0, 0, height / view.height, 0, 0);
      paintTerrain(ground, art?.clearing);
      paintedArt = art;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(background, 0, 0);
    ctx.setTransform(width / view.width, 0, 0, height / view.height, 0, 0);
    const objects: { south: number; draw: () => Path2D; tile?: Point }[] = [];
    let floor = 0;
    for (const cabin of game.cabins) {
      const { x, y: z } = cabin.origin;
      markGround(ctx, x, z, footprint.width, footprint.height, "rgba(72,99,96,.38)", "#f5e5b6");
      if (cabin.stage) {
        const inside = cabin.contains(game.position);
        if (inside) floor = 0.13;
        groundDisc(ctx, x + 1.6, z + 1.14, 0, 1.54, 0.96, "rgba(54,70,50,.23)");
        objects.push({
          south: z + footprint.height - 0.12,
          draw: () => cabinModel(cabin, inside).draw(ctx, art?.materials),
        });
      } else {
        for (const [left, right] of [
          [x, x + footprint.width],
          [x + footprint.width, x],
        ]) {
          groundPath(ctx, [
            [left, 0, z],
            [right, 0, z + footprint.height],
          ]);
          ctx.stroke();
        }
      }
    }
    for (const [i, plot] of game.plots.entries()) {
      const x = (i % COLS) + 0.5,
        z = Math.floor(i / COLS) + 0.5;
      if (plot.timber === "Tree") {
        groundDisc(ctx, x + 0.14, z + 0.25, 0, 0.43, 0.26, "rgba(53,75,55,.26)");
        objects.push({
          south: z + 0.22,
          draw: () =>
            art
              ? art.pines[i % 3].draw(ctx, x, z + 0.22, 1.24 + (i % 5) * 0.036)
              : pine(x, z + 0.22, i).draw(ctx),
          tile: { x: Math.floor(x), y: Math.floor(z) },
        });
      }
      if (plot.site && plot.site.kind !== "Garden" && !plot.site.complete)
        markGround(ctx, x - 0.4, z - 0.38, 0.8, 0.76, "rgba(72,99,96,.38)", "#f5e5b6");
      if (plot.site || plot.timber === "Stump" || Object.values(plot.stock).some(Boolean)) {
        const cabin = game.cabins.find(
          (c) => c.stage && c.contains({ x: Math.floor(x), y: Math.floor(z) }),
        );
        if (cabin?.complete && !cabin.contains(game.position)) continue;
        const south = cabin ? cabin.origin.y + footprint.height - 0.1 : z + 0.32;
        objects.push({
          south,
          draw: () => plotModel(plot, x, z, cabin ? 0.13 : 0).draw(ctx, art?.materials),
        });
      }
    }
    hitRegions.length = 0;
    for (const { draw, tile } of objects.sort((a, b) => a.south - b.south))
      hitRegions.push({ outline: draw(), tile });

    if (game.planning) {
      const size = game.planKind === "Cabin" ? footprint : { width: 1, height: 1 };
      markGround(
        ctx,
        game.preview.x,
        game.preview.y,
        size.width,
        size.height,
        "rgba(255,226,143,.24)",
        "#ffe4a0",
        3,
      );
    } else {
      ctx.setLineDash([6, 4]);
      markGround(
        ctx,
        game.selected.x,
        game.selected.y,
        1,
        1,
        "rgba(255,237,181,.09)",
        "#fff0b7",
        2.5,
      );
      ctx.setLineDash([]);
    }
    // Draw the locator and settler last so either stays legible beneath a canopy.
    const x = game.position.x + 0.5,
      z = game.position.y + 0.57;
    groundDisc(ctx, x, z, floor, 0.235, 0.17, "#ffe8a9");
    groundDisc(ctx, x, z, floor + 0.005, 0.19, 0.12, "#726c49");
    const figure = art
      ? art.settler.draw(ctx, x, z, 0.84, floor + 0.01)
      : settler(x, z, floor + 0.01).draw(ctx);
    hitRegions.push({ outline: figure, tile: game.position });
    hitRegions.reverse();
  }
  new ResizeObserver(paint).observe(canvas);
  void loadMapArt()
    .then((loaded) => {
      art = loaded;
      paint();
    })
    .catch(() => {
      // The geometry and tile controls remain usable when bitmap decoding fails.
    });
  function pickObject(event: MouseEvent) {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) * canvas.width) / bounds.width;
    const y = ((event.clientY - bounds.top) * canvas.height) / bounds.height;
    return hitRegions.find((region) => ctx?.isPointInPath(region.outline, x, y))?.tile;
  }
  return { paint, pickObject };
}
