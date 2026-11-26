import type { Point } from "./world";

// X runs east, Z runs south, and height is measured in tiles above the clearing.
export type Vertex = [x: number, height: number, z: number];
export const view = { width: 1200, height: 675 };
// Calibrated in the clearing artwork's 1200 x 675 view. The distant meadow
// meets the trees at y=102 and the nearest buildable row ends at the bank.
const horizonY = 102;
const bank = { z: 7, y: 480, pixelsPerTile: 70 };
const focalLength = 740;
const cameraZ = bank.z + focalLength / bank.pixelsPerTile;
const eyeHeight = (bank.y - horizonY) / bank.pixelsPerTile;

export function project([x, height, z]: Vertex): Point {
  const scale = focalLength / (cameraZ - z);
  return {
    x: view.width / 2 + (x - 8) * scale,
    y: horizonY + (eyeHeight - height) * scale,
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
