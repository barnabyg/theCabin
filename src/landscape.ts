import type { Campaign } from "./campaign";
import {
  Cabin,
  cabinStageCount,
  footprint,
  footprintTiles,
  obstructionAt,
  planSize,
} from "./cabin";
import { project, view } from "./map-camera";
import { groundPath, markGround, paintMapCoordinates, paintTerrain } from "./map-terrain";
import { cabinModel, pine, plotModel, settler, siteModel } from "./map-models";
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
  const path = new Path2D();
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    const p = project([x + radius * Math.cos(angle), height, z + depth * Math.sin(angle)]);
    if (i === 0) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  }
  path.closePath();
  ctx.fillStyle = color;
  ctx.fill(path);
  return path;
}

function finishedCabinModel(origin: Point) {
  const cabin = new Cabin(origin);
  cabin.stage = cabinStageCount;
  return cabinModel(cabin, false);
}

export function startLandscape(
  game: Homestead,
  currentSeason: () => Campaign["season"] | undefined,
) {
  const terrain = document.getElementById("terrain");
  if (!terrain) throw new Error("Missing terrain container");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  terrain.append(canvas);
  const ctx = canvas.getContext("2d");
  const background = document.createElement("canvas");
  const ground = background.getContext("2d");
  if (!ctx || !ground) throw new Error("Canvas drawing is unavailable");
  const ghost = document.createElement("canvas");
  ghost.width = view.width;
  ghost.height = view.height;
  let preview: { allowed: boolean; showModel: boolean } | undefined;
  const scene = document.createElement("canvas");
  const sceneContext = scene.getContext("2d");
  const hitRegions: { outline: Path2D; tile?: Point }[] = [];
  let art: MapArt | undefined;
  let paintedArt: MapArt | undefined;
  let paintedSeason: Campaign["season"] | undefined;

  function paint() {
    if (!ctx || !ground || !canvas.clientWidth) return;
    const scale = (canvas.clientWidth * window.devicePixelRatio) / view.width;
    const width = Math.max(1, Math.round(view.width * scale)),
      height = Math.max(1, Math.round(view.height * scale));
    const season = currentSeason();
    if (
      background.width !== width ||
      background.height !== height ||
      paintedArt !== art ||
      paintedSeason !== season
    ) {
      background.width = canvas.width = width;
      background.height = canvas.height = height;
      ground.setTransform(width / view.width, 0, 0, height / view.height, 0, 0);
      paintTerrain(ground, art?.clearing, season);
      paintedSeason = season;
      paintedArt = art;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(background, 0, 0);
    ctx.setTransform(width / view.width, 0, 0, height / view.height, 0, 0);
    const objects: { south: number; draw: () => Path2D; tile?: Point }[] = [];
    if (game.storage)
      markGround(ctx, game.storage.x, game.storage.y, 1, 1, "rgba(93,180,187,.38)", "#94e1dc", 3);
    let floor = 0;
    let settlerDepth = Infinity;
    for (const cabin of game.cabins) {
      const { x, y: z } = cabin.origin;
      if (cabin.stage) {
        const inside = cabin.contains(game.position);
        if (inside) floor = 0.13;
        groundDisc(ctx, x + 1.6, z + 1.14, 0, 1.54, 0.96, "rgba(54,70,50,.23)");
        const south = z + footprint.height - 0.12;
        if (
          cabin.walled &&
          game.position.y < z &&
          game.position.x >= x &&
          game.position.x < x + footprint.width
        )
          settlerDepth = Math.min(settlerDepth, south);
        objects.push({
          south,
          draw: () => cabinModel(cabin, inside).draw(ctx, art?.materials),
        });
      } else {
        markGround(ctx, x, z, footprint.width, footprint.height, "rgba(72,99,96,.38)", "#f5e5b6");
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
      if (
        plot.rawStone ||
        plot.site ||
        plot.timber === "Stump" ||
        Object.values(plot.stock).some(Boolean)
      ) {
        const cabin = game.cabins.find(
          (c) => c.stage && c.contains({ x: Math.floor(x), y: Math.floor(z) }),
        );
        if (cabin?.roofed && !cabin.contains(game.position)) continue;
        const south = cabin ? cabin.origin.y + footprint.height - 0.1 : z + 0.32;
        objects.push({
          south,
          draw: () => plotModel(plot, x, z, cabin ? 0.13 : 0).draw(ctx, art?.materials),
        });
      }
    }
    if (!game.planning) {
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
    const x = game.position.x + 0.5,
      z = game.position.y + 0.57;
    // A stable sort draws the settler immediately before a nearer cabin, after intervening pines.
    objects.unshift({
      south: settlerDepth,
      tile: game.position,
      draw: () => {
        // The locator selects the settler. Plots behind the upright figure remain targetable.
        const locator = groundDisc(ctx, x, z, floor, 0.235, 0.17, "#ffe8a9");
        groundDisc(ctx, x, z, floor + 0.005, 0.19, 0.12, "#726c49");
        if (art) art.settler.draw(ctx, x, z, 0.84, floor + 0.01);
        else settler(x, z, floor + 0.01).draw(ctx);
        return locator;
      },
    });
    hitRegions.length = 0;
    for (const { draw, tile } of objects.sort((a, b) => a.south - b.south))
      hitRegions.push({ outline: draw(), tile });

    paintMapCoordinates(ctx);
    hitRegions.reverse();
    if (game.planning && sceneContext) {
      if (scene.width !== width || scene.height !== height) {
        scene.width = width;
        scene.height = height;
      }
      sceneContext.drawImage(canvas, 0, 0);
      drawPreview();
    }
  }
  function redraw() {
    if (!ctx || !game.planning || !scene.width) return;
    ctx.drawImage(scene, 0, 0, view.width, view.height);
    drawPreview();
  }
  function setPreview(allowed: boolean | undefined, showModel: boolean) {
    preview = allowed === undefined ? undefined : { allowed, showModel };
    const brush = ghost.getContext("2d");
    if (!preview || !showModel || !brush) return;
    const kind = game.planKind;
    const { x, y } = game.preview;
    const mesh =
      kind === "Cabin"
        ? finishedCabinModel(game.preview)
        : siteModel({ kind, complete: true, delivered: 0, stored: 0 }, x + 0.5, y + 0.5);
    brush.clearRect(0, 0, ghost.width, ghost.height);
    const outline = mesh.draw(brush);
    brush.fillStyle = preview.allowed ? "rgba(98,255,166,.60)" : "rgba(255,96,77,.65)";
    brush.fill(outline);
  }
  function drawPreview() {
    if (ctx && preview) {
      const size = planSize(game.planKind);
      markGround(
        ctx,
        game.preview.x,
        game.preview.y,
        size.width,
        size.height,
        preview.allowed ? "rgba(97,223,146,.22)" : "rgba(212,70,52,.24)",
        preview.allowed ? "#a8ffcb" : "#ff9687",
        3,
      );
      for (const tile of footprintTiles(game.preview, size)) {
        if (!obstructionAt(game, tile)) continue;
        markGround(ctx, tile.x, tile.y, 1, 1, "rgba(164,66,35,.45)", "#ffe5c0");
        for (const dx of [0.15, 0.85]) {
          groundPath(ctx, [
            [tile.x + dx, 0, tile.y + 0.15],
            [tile.x + 1 - dx, 0, tile.y + 0.85],
          ]);
          ctx.stroke();
        }
      }
      if (preview.showModel) {
        ctx.save();
        ctx.globalAlpha = 0.68;
        ctx.shadowColor = preview.allowed ? "#afffd1" : "#ff998c";
        ctx.shadowBlur = 3;
        ctx.drawImage(ghost, 0, 0);
        ctx.restore();
      }
    }
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
  return { paint, pickObject, setPreview, redraw };
}
