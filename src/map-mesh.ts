import { project, type Vertex } from "./map-camera";

type Face = { vertices: Vertex[]; color: string; depth: number };
type RingPoint = [x: number, z: number];

function litColor(color: number, light: number) {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 255) * light));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

// Closed solids use clockwise rings as seen from above. Cull their back faces and
// paint their visible surfaces from far to near along the fixed camera axis.
export class Mesh {
  private faces: Face[] = [];

  face(color: number, vertices: Vertex[]) {
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
      color: litColor(color, 0.78 + 0.28 * sunlight),
      depth: vertices.reduce((sum, p) => sum + p[1] + p[2], 0) / vertices.length,
    });
  }

  private solid(color: number, bottom: Vertex[], top: Vertex[]) {
    this.face(color, top);
    for (let i = 0; i < bottom.length; i++) {
      const j = (i + 1) % bottom.length;
      this.face(color, [bottom[i], bottom[j], top[j], top[i]]);
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
  ) {
    const ring: RingPoint[] = Array.from({ length: sides }, (_, i) => {
      const angle = rotation + (i * 2 * Math.PI) / sides;
      return [Math.cos(angle), Math.sin(angle)];
    });
    this.solid(
      color,
      ring.map(([dx, dz]) => [x + lower * dx, base, z + lower * dz]),
      ring.map(([dx, dz]) => [x + upper * dx, base + height, z + upper * dz]),
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
    const courses = Math.max(2, Math.round(width / 0.6));
    const shakes = Math.max(2, Math.round(depth / 0.26));
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
        const grain = ((row * 7 + i * 11 + row * i) % 7) - 3;
        this.face(color + 0x030302 * grain, [
          [left, heightAt(row), z0],
          [right, heightAt(row + 1), z0],
          [right, heightAt(row + 1), z1],
          [left, heightAt(row), z1],
        ]);
      }
    }
    this.face(0xae8052, [
      [x + width, eaves, back],
      [x, eaves, back],
      [ridge, peak, back],
    ]);
    this.face(0xae8052, [
      [x, eaves, z],
      [x + width, eaves, z],
      [ridge, peak, z],
    ]);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const silhouette = new Path2D();
    for (const { vertices, color } of this.faces.sort((a, b) => a.depth - b.depth)) {
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
    }
    return silhouette;
  }
}
