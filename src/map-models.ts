import type { Cabin } from "./cabin";
import { footprint } from "./cabin";
import { Mesh } from "./map-mesh";
import type { Vertex } from "./map-camera";
import type { Plot } from "./world";

export function pine(x: number, z: number, variation: number) {
  const mesh = new Mesh();
  const size = 0.93 + (variation % 5) * 0.045;
  mesh.round(0x805e43, x, z, 0, 0.1, 0.07, 0.42, 7);
  const greens = variation % 2 ? [0x385f50, 0x497859, 0x699064] : [0x335e51, 0x47755b, 0x5e8766];
  for (let tier = 0; tier < 3; tier++) {
    const base = (0.25 + tier * 0.28) * size;
    const tip: Vertex = [x, base + (0.58 - tier * 0.035) * size, z];
    const branches: Vertex[] = Array.from({ length: 16 }, (_, i) => {
      const angle = (i * Math.PI) / 8 + variation + tier * 0.35;
      const length = (0.45 - tier * 0.09) * size * (i % 2 ? 0.75 : 1);
      return [x + length * Math.cos(angle), base + (i % 2) * 0.11, z + length * Math.sin(angle)];
    });
    for (let i = 0; i < branches.length; i++)
      mesh.face(greens[tier], [branches[i], branches[(i + 1) % branches.length], tip]);
  }
  return mesh;
}

export function settler(x: number, z: number, floor: number) {
  const mesh = new Mesh();
  for (const dx of [-0.095, 0.025]) mesh.box(0x453d32, x + dx, z - 0.04, floor, 0.07, 0.13, 0.17);
  mesh.round(0xb75432, x, z, floor + 0.13, 0.145, 0.12, 0.24, 7);
  mesh.round(0xe3b381, x, z, floor + 0.37, 0.09, 0.09, 0.115);
  mesh.round(0x684e34, x, z, floor + 0.48, 0.16, 0.16, 0.025, 10);
  mesh.round(0x876740, x, z, floor + 0.5, 0.095, 0.075, 0.075);
  return mesh;
}

function wall(
  mesh: Mesh,
  x: number,
  z: number,
  width: number,
  depth: number,
  courses: number,
  base: number,
) {
  const alongX = width > depth;
  for (let i = 0; i < courses; i++) {
    const extension = i % 2 ? 0.1 : 0.045;
    mesh.log(
      alongX ? x - extension : x + width / 2,
      alongX ? z + depth / 2 : z - extension,
      base + i * 0.14,
      Math.max(width, depth) + extension * 2,
      0.079,
      alongX,
    );
  }
}

export function cabinModel(cabin: Cabin, inside: boolean) {
  const mesh = new Mesh();
  const x = cabin.origin.x + 0.12,
    z = cabin.origin.y + 0.13;
  const w = footprint.width - 0.24,
    d = footprint.height - 0.26;
  const floor = 0.12;
  for (let i = 0; i < 12; i++)
    mesh.box(
      i % 2 ? 0xb88755 : 0xc29665,
      x + (i * w) / 12,
      z,
      0,
      w / 12 - 0.012,
      d,
      floor,
      "plank",
    );
  if (cabin.stage < 2) return mesh;
  wall(mesh, x, z, w, 0.15, 6, floor);
  wall(mesh, x, z + 0.12, 0.15, d - 0.12, inside ? 3 : 6, floor);
  wall(mesh, x + w - 0.15, z + 0.12, 0.15, d - 0.12, inside ? 3 : 6, floor);
  const front = z + d - 0.14;
  // Leave a doorway in the south wall and lower it to the sill in cutaway.
  wall(mesh, x, front, w * 0.39, 0.16, inside ? 1 : 6, floor);
  wall(mesh, x + w * 0.61, front, w * 0.39, 0.16, inside ? 1 : 6, floor);
  if (cabin.complete) {
    const chimneyX = x + w - 0.6,
      chimneyZ = z + 0.2;
    for (let i = 0; i < 3; i++)
      mesh.box(0x909081, chimneyX, chimneyZ, 0.12 + i * 0.6, 0.38, 0.35, 0.6, "stone");
    mesh.box(0xacaa94, chimneyX - 0.04, chimneyZ - 0.04, 1.92, 0.46, 0.43, 0.09);
    mesh.box(0x4b4d47, chimneyX + 0.04, chimneyZ + 0.04, 2.011, 0.3, 0.27, 0.008);
    if (!inside) {
      for (let board = 0; board < 5; board++)
        mesh.box(
          0x775436,
          x + w * (0.39 + board * 0.044),
          front + 0.08,
          floor,
          w * 0.043,
          0.08,
          0.76,
          "plank",
        );
      mesh.box(0xc8a172, x + w * 0.4, front + 0.16, 0.29, w * 0.2, 0.025, 0.06);
      mesh.box(0x604c37, x + 0.28, front + 0.16, 0.43, 0.37, 0.05, 0.32);
      mesh.box(0xc3ae7e, x + 0.31, front + 0.21, 0.46, 0.31, 0.02, 0.26);
      mesh.box(0x72583e, x + 0.45, front + 0.23, 0.46, 0.035, 0.02, 0.26);
      mesh.box(0x72583e, x + 0.31, front + 0.23, 0.58, 0.31, 0.025, 0.035);
      mesh.box(0x8d6947, x + 0.22, front + 0.14, 0.4, 0.49, 0.16, 0.045, "plank");
      mesh.box(0x4e4334, x + w * 0.56, front + 0.175, 0.52, 0.075, 0.036, 0.04);
      mesh.box(0x918672, x + w * 0.37, front + 0.16, 0, w * 0.26, 0.23, 0.085, "stone");
    } else {
      // A plank bench at the rear leaves the walking and storage space visible.
      for (const dx of [0.24, 0.94])
        mesh.box(0x70533a, x + dx, z + 0.22, floor, 0.1, 0.25, 0.22, "log");
      mesh.box(0xab845d, x + 0.18, z + 0.19, floor + 0.22, 0.94, 0.31, 0.065, "plank");
    }
    mesh.box(0x77766a, chimneyX - 0.1, chimneyZ + 0.23, floor, 0.57, 0.38, 0.22, "stone");
    mesh.box(0x3d3930, chimneyX + 0.03, chimneyZ + 0.35, 0.34, 0.32, 0.04, 0.21);
    mesh.log(chimneyX + 0.04, chimneyZ + 0.47, 0.34, 0.28, 0.035, true);
    if (cabin.hearth.lit)
      mesh.round(0xffaf49, chimneyX + 0.18, chimneyZ + 0.43, 0.34, 0.13, 0.01, 0.27, 5);
    // Retain a strip of roof at the rear so the finished cabin reads as such indoors.
    const roofDepth = inside ? d * 0.27 : d + 0.18;
    mesh.roof(x - 0.12, z - 0.1, w + 0.24, roofDepth, 0.98, 0.59, 0x895d43);
  }
  return mesh;
}

export function plotModel(plot: Plot, x: number, z: number, floor: number) {
  const mesh = new Mesh();
  if (plot.timber === "Stump") {
    mesh.round(0x836242, x, z, 0, 0.2, 0.15, 0.21, 9);
    mesh.round(0xd2a775, x, z, 0.21, 0.15, 0.145, 0.025, 9);
    mesh.round(0xb28656, x, z, 0.235, 0.08, 0.08, 0.007, 9);
  }
  for (let j = 0; j < Math.min(4, plot.stock.logs); j++) {
    const dx = x + 0.04 + (j % 2) * 0.13,
      dz = z + 0.05 + Math.floor(j / 2) * 0.18;
    mesh.log(dx + 0.05, dz, floor, 0.32, 0.06, false);
  }
  for (let j = 0; j < Math.min(6, plot.stock.firewood); j++) {
    mesh.box(
      0xcb995e,
      x - 0.33 + (j % 3) * 0.078,
      z + 0.12,
      floor + Math.floor(j / 3) * 0.065,
      0.065,
      0.26,
      0.07,
    );
  }
  if (plot.stock.stone) {
    for (const [dx, dz, r] of [
      [-0.14, 0.05, 0.19],
      [0.13, 0.09, 0.15],
      [0.04, -0.16, 0.12],
    ])
      mesh.round(0x93998c, x + dx, z + dz, floor, r, r * 0.38, r * 0.7, 9, dx * 5, "stone");
  }

  const site = plot.site;
  if (site?.kind === "Garden") {
    mesh.box(site.crop?.watered ? 0x573f2b : 0x795939, x - 0.42, z - 0.38, 0, 0.84, 0.76, 0.045);
    for (const row of [-0.24, 0, 0.24]) {
      mesh.box(0xa07a51, x - 0.37, z + row, 0.045, 0.74, 0.06, 0.045);
      if (site.crop)
        for (const col of [-0.24, 0, 0.24]) {
          const size = 0.045 + site.crop.days * 0.017;
          mesh.round(0x73954b, x + col, z + row, 0.08, size, size * 0.42, size * 1.25, 5);
          for (let leaf = 0; leaf < 5; leaf++) {
            const a = (leaf * 2 * Math.PI) / 5 + row,
              dx = Math.cos(a) * size,
              dz = Math.sin(a) * size;
            const cx = x + col,
              cz = z + row;
            mesh.face(leaf % 2 ? 0x789748 : 0x56783d, [
              [cx, 0.1, cz],
              [cx + dx + dz * 0.32, 0.14 + size, cz + dz - dx * 0.32],
              [cx + dx * 1.6, 0.12 + size, cz + dz * 1.6],
              [cx + dx - dz * 0.32, 0.14 + size, cz + dz + dx * 0.32],
            ]);
          }
        }
    }
  }
  if (site?.kind === "Well" && site.complete) {
    mesh.round(0x96998a, x, z, 0, 0.33, 0.33, 0.3, 12, 0, "stone");
    mesh.round(0x3e5957, x, z, 0.301, 0.23, 0.23, 0.005, 10);
    for (const dx of [-0.29, 0.22]) mesh.box(0x795839, x + dx, z - 0.04, 0.29, 0.07, 0.08, 0.43);
    mesh.box(0x906b47, x - 0.33, z - 0.05, 0.7, 0.66, 0.1, 0.08);
    mesh.log(x - 0.31, z + 0.015, 0.56, 0.73, 0.055, true);
    mesh.box(0xc6aa76, x + 0.03, z + 0.065, 0.27, 0.015, 0.015, 0.34);
    mesh.round(0x86613f, x + 0.03, z + 0.09, 0.28, 0.07, 0.088, 0.11, 10, 0, "plank");
    mesh.round(0x504a3e, x + 0.03, z + 0.09, 0.365, 0.088, 0.088, 0.02, 10);
    mesh.box(0x6c4e34, x + 0.4, z, 0.49, 0.045, 0.05, 0.14);
  }
  if (site?.kind === "Pantry" && site.complete) {
    mesh.box(0xb08759, x - 0.31, z - 0.29, 0, 0.62, 0.58, 0.43, "plank");
    mesh.box(0x5c4938, x - 0.09, z + 0.29, 0, 0.18, 0.02, 0.34);
    mesh.roof(x - 0.38, z - 0.36, 0.76, 0.72, 0.42, 0.26, 0x79604d);
    if (site.stored) mesh.round(0xc5a46c, x - 0.22, z + 0.34, 0, 0.09, 0.06, 0.12, 7);
  }
  return mesh;
}
