import { project, type Vertex } from "./map-camera";
import type { Point } from "./world";

type Material = "log" | "shake" | "stone" | "plank";
type Face = {
  vertices: Vertex[];
  color: string;
  layer: number;
  depth: number;
  material?: Material;
};
type RingPoint = [x: number, z: number];

// Map a swatch onto each visible face. Its long axis follows the timber; a
// world-position offset breaks up the grain across neighbouring logs and shakes.
function textureFace(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  material: Material,
  path: Path2D,
  points: Point[],
  vertices: Vertex[],
) {
  const [a, b, , d] = points;
  const [origin, edge, , end] = vertices;
  const distance = (p: Vertex) => Math.hypot(p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]);
  let u = b,
    v = d,
    length = distance(edge),
    width = distance(end);
  if (material !== "stone" && width > length) {
    [u, v] = [v, u];
    [length, width] = [width, length];
  }
  const size = atlas.width / 2;
  const span =
    material === "stone" ? Math.min(1, length * 1.4) : Math.min(0.9, 0.18 + length * 0.42);
  const cross = Math.min(1, Math.max(0.05, (span * width) / length));
  const variation = Math.abs(Math.sin(origin[0] * 17.3 + origin[1] * 21.4 + origin[2] * 7.3));
  const sx = (Number(material === "shake" || material === "plank") + variation * (1 - span)) * size;
  const sy =
    (Number(material === "stone" || material === "plank") + (1 - variation) * (1 - cross)) * size;
  ctx.save();
  ctx.clip(path);
  ctx.transform(u.x - a.x, u.y - a.y, v.x - a.x, v.y - a.y, a.x, a.y);
  ctx.globalAlpha = 0.56;
  ctx.drawImage(atlas, sx, sy, span * size, cross * size, 0, 0, 1, 1);
  ctx.restore();
}

function litColor(color: number, light: number) {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 255) * light));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

// Closed solids use clockwise rings as seen from above. Cull their back faces and
// paint their visible surfaces from far to near along the fixed camera axis.
export class Mesh {
  private faces: Face[] = [];
  private layer = 0;

  // Long intersecting solids can overlap even when their centre depths sort correctly.
  // Finish a surface before drawing components known to cover it from this camera.
  nextLayer() {
    this.layer++;
  }

  face(color: number, vertices: Vertex[], material?: Material) {
    const [a, b, c] = vertices;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nx = v[1] * u[2] - v[2] * u[1],
      ny = v[2] * u[0] - v[0] * u[2],
      nz = v[0] * u[1] - v[1] * u[0];
    const length = Math.hypot(nx, ny, nz);
    if (!length) return;
    const sunlight = (-0.47 * nx + 0.78 * ny + 0.41 * nz) / length;
    this.faces.push({
      vertices,
      layer: this.layer,
      material,
      color: litColor(color, 0.78 + 0.28 * sunlight),
      depth: vertices.reduce((sum, p) => sum + p[1] + p[2], 0) / vertices.length,
    });
  }

  private solid(color: number, bottom: Vertex[], top: Vertex[], material?: Material) {
    this.face(color, top, material);
    for (let i = 0; i < bottom.length; i++) {
      const j = (i + 1) % bottom.length;
      this.face(color, [bottom[i], bottom[j], top[j], top[i]], material);
    }
  }

  box(
    color: number,
    x: number,
    z: number,
    base: number,
    width: number,
    depth: number,
    height: number,
    material?: Material,
  ) {
    const ring: RingPoint[] = [
      [x, z],
      [x + width, z],
      [x + width, z + depth],
      [x, z + depth],
    ];
    this.solid(
      color,
      ring.map(([x, z]) => [x, base, z]),
      ring.map(([x, z]) => [x, base + height, z]),
      material,
    );
  }

  round(
    color: number,
    x: number,
    z: number,
    base: number,
    lower: number,
    upper: number,
    height: number,
    sides = 8,
    rotation = 0,
    material?: Material,
  ) {
    const ring: RingPoint[] = Array.from({ length: sides }, (_, i) => {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      return [Math.cos(angle), Math.sin(angle)];
    });
    this.solid(
      color,
      ring.map(([dx, dz]) => [x + lower * dx, base, z + lower * dz]),
      ring.map(([dx, dz]) => [x + upper * dx, base + height, z + upper * dz]),
      material,
    );
  }

  roof(
    x: number,
    z: number,
    width: number,
    depth: number,
    eaves: number,
    rise: number,
    color: number,
  ) {
    const ridge = x + width / 2,
      back = z + depth,
      peak = eaves + rise;
    // Individual shakes follow the pitched roof and stagger their end joints.
    const courses = Math.max(2, Math.round(width / 0.4));
    const shakes = Math.max(2, Math.round(depth / 0.17));
    for (let row = 0; row < courses * 2; row++) {
      const heightAt = (edge: number) => eaves + rise * (1 - Math.abs(edge / courses - 1));
      const left = x + (row * width) / (courses * 2),
        right = x + ((row + 1) * width) / (courses * 2);
      for (let i = 0; i <= shakes; i++) {
        const start = Math.max(0, i - (row % 2) / 2),
          end = Math.min(shakes, i + 1 - (row % 2) / 2);
        if (end <= start) continue;
        const z0 = z + (depth * start) / shakes,
          z1 = z + (depth * end) / shakes;
        const grain = ((row * 5 + i * 11 + row * i) % 7) - 3;
        this.face(
          color + 0x030302 * grain,
          [
            [left, heightAt(row), z0],
            [right, heightAt(row + 1), z0],
            [right, heightAt(row + 1), z1],
            [left, heightAt(row), z1],
          ],
          "shake",
        );
      }
    }
    const rows = Math.max(2, Math.round(rise / 0.12));
    for (let i = 0; i < rows; i++) {
      const inset = (width * i) / (2 * rows),
        next = (width * (i + 1)) / (2 * rows);
      const base = eaves + (rise * i) / rows,
        top = eaves + (rise * (i + 1)) / rows;
      this.face(
        i % 2 ? 0x8d6846 : 0xa37b53,
        [
          [x + width - inset, base, back],
          [x + inset, base, back],
          [x + next, top, back],
          [x + width - next, top, back],
        ],
        "log",
      );
    }
    this.face(0xae8052, [
      [x, eaves, z],
      [x + width, eaves, z],
      [ridge, peak, z],
    ]);
    this.box(0x796249, ridge - 0.047, z - 0.02, peak - 0.025, 0.094, depth + 0.04, 0.065, "shake");
  }

  log(x: number, z: number, base: number, length: number, radius: number, alongX: boolean) {
    const ring = (offset: number): Vertex[] =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5,
          u = radius * Math.cos(a),
          v = radius * Math.sin(a);
        return alongX
          ? [x + offset, base + radius - u, z + v]
          : [x + u, base + radius - v, z + offset];
      });
    const start = ring(0),
      end = ring(length);
    this.solid(0x94704f, start, end, "log");
    this.face(0xc39162, end);
    this.face(0xb08258, start.reverse());
  }

  draw(ctx: CanvasRenderingContext2D, atlas?: HTMLImageElement) {
    const silhouette = new Path2D();
    for (const { vertices, color, material } of this.faces.sort(
      (a, b) => a.layer - b.layer || a.depth - b.depth,
    )) {
      const points = vertices.map(project);
      const [a, b, c] = points;
      if ((b.x - a.x) * (c.y - a.y) <= (b.y - a.y) * (c.x - a.x)) continue;
      const face = new Path2D();
      face.moveTo(a.x, a.y);
      for (const p of points.slice(1)) face.lineTo(p.x, p.y);
      face.closePath();
      silhouette.addPath(face);
      ctx.fillStyle = ctx.strokeStyle = color;
      ctx.fill(face);
      ctx.lineWidth = 0.55;
      ctx.stroke(face);
      if (material && atlas && points.length === 4)
        textureFace(ctx, atlas, material, face, points, vertices);
    }
    return silhouette;
  }
}
