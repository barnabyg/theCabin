import clearingUrl from "./art/clearing.webp";
import materialsUrl from "./art/materials.webp";
import pinesUrl from "./art/pines.webp";
import settlerUrl from "./art/settler.webp";
import { project } from "./map-camera";

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function spriteFrames(atlas: HTMLImageElement, count: number) {
  const frameWidth = atlas.naturalWidth / count;
  // Compile silhouettes once in normalized frame coordinates. Transparent gaps
  // between the boughs leave the ground underneath available for selection.
  const mask = document.createElement("canvas");
  mask.width = 56;
  mask.height = 84;
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas drawing is unavailable");
  return Array.from({ length: count }, (_, i) => {
    ctx.clearRect(0, 0, mask.width, mask.height);
    ctx.drawImage(
      atlas,
      i * frameWidth,
      0,
      frameWidth,
      atlas.height,
      0,
      0,
      mask.width,
      mask.height,
    );
    const { data } = ctx.getImageData(0, 0, mask.width, mask.height);
    const outline = new Path2D();
    for (let y = 0; y < mask.height; y++) {
      let start = 0;
      for (let x = 0; x <= mask.width; x++) {
        if (x < mask.width && data[(y * mask.width + x) * 4 + 3] >= 40) continue;
        if (x > start)
          outline.rect(
            start / mask.width,
            y / mask.height,
            (x - start) / mask.width,
            1 / mask.height,
          );
        start = x + 1;
      }
    }
    return {
      draw(ctx: CanvasRenderingContext2D, x: number, z: number, height: number, base = 0) {
        const root = project([x, base, z]),
          tip = project([x, base + height, z]);
        const h = root.y - tip.y,
          w = (h * frameWidth) / atlas.height;
        const left = (root.x + tip.x) / 2 - w / 2;
        ctx.drawImage(atlas, i * frameWidth, 0, frameWidth, atlas.height, left, tip.y, w, h);
        const path = new Path2D();
        path.addPath(outline, new DOMMatrix([w, 0, 0, h, left, tip.y]));
        return path;
      },
    };
  });
}

export async function loadMapArt() {
  const [clearing, materials, foliage, settler] = await Promise.all(
    [clearingUrl, materialsUrl, pinesUrl, settlerUrl].map(loadImage),
  );
  return {
    clearing,
    materials,
    pines: spriteFrames(foliage, 3),
    settler: spriteFrames(settler, 1)[0],
  };
}
export type MapArt = Awaited<ReturnType<typeof loadMapArt>>;
