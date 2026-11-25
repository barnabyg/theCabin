import type { Point } from "./world";

// X runs east, Z runs south, and height is measured in tiles above the clearing.
export type Vertex = [x: number, height: number, z: number];
export const view = { width: 1200, height: 675 };
const pitch = Math.PI / 4;
const sin = Math.sin(pitch);
const cos = Math.cos(pitch);

export function project([x, height, z]: Vertex): Point {
  const south = z - 3.8;
  const scale = 1510 / (24 - south * cos - height * sin);
  return {
    x: view.width / 2 + (x - 8) * scale,
    y: 326 + (south * sin - height * cos) * scale,
  };
}

export function groundCorners(x: number, z: number, width = 1, depth = 1): Vertex[] {
  return [
    [x, 0, z],
    [x + width, 0, z],
    [x + width, 0, z + depth],
    [x, 0, z + depth],
  ];
}

// Keep native focusable buttons. Their clipped hit regions share the camera's ground polygons.
export function positionTile(button: HTMLButtonElement, tile: Point) {
  const corners = groundCorners(tile.x, tile.y).map(project);
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const left = Math.min(...xs),
    top = Math.min(...ys);
  const width = Math.max(...xs) - left,
    height = Math.max(...ys) - top;
  Object.assign(button.style, {
    left: `${(100 * left) / view.width}%`,
    top: `${(100 * top) / view.height}%`,
    width: `${(100 * width) / view.width}%`,
    height: `${(100 * height) / view.height}%`,
    clipPath: `polygon(${corners.map((p) => `${(100 * (p.x - left)) / width}% ${(100 * (p.y - top)) / height}%`).join(",")})`,
  });
}
