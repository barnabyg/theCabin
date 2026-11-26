import type { Campaign } from "./campaign";
import { project, view } from "./map-camera";

// Change the ground beneath buildings and map markings so controls keep their usual contrast.
const palette = {
  Spring: { wash: "rgba(162,193,108,.10)", detail: ["#e3d9b8", "#e7cb82"] },
  Summer: { wash: "rgba(133,147,45,.19)", detail: ["#839351", "#c2ba66"] },
  Autumn: { wash: "rgba(180,111,47,.33)", detail: ["#996832", "#d69b4f"] },
  Winter: { wash: "rgba(227,238,242,.76)", detail: ["#f4f7f4", "#c2d3d9"] },
  Thaw: { wash: "rgba(154,175,144,.22)", detail: ["#d4e0d8", "#97b3b1"] },
};

export function paintSeason(ctx: CanvasRenderingContext2D, season: Campaign["season"]) {
  const { wash, detail } = palette[season];
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, view.width, view.height);
  // A fixed seed keeps flowers, fallen leaves and drifts still while the map is repainted.
  let seed = 1750;
  function scatter() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 120; i++) {
    const { x, y } = project([scatter() * 16, 0, scatter() * 7]);
    const size = 0.6 + scatter();
    ctx.fillStyle = detail[i % detail.length];
    ctx.beginPath();
    if (season === "Summer") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4 * size, y - 6 * size);
      ctx.lineTo(x + 2 * size, y);
    } else {
      const snow = season === "Winter" || season === "Thaw";
      const width = snow ? 9 : season === "Autumn" ? 3.8 : 1.8;
      ctx.ellipse(
        x,
        y,
        width * size,
        (snow ? 2.2 : 1.4) * size,
        snow ? 0 : size - 1,
        0,
        Math.PI * 2,
      );
    }
    ctx.fill();
  }
}
