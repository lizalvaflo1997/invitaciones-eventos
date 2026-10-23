import { elementBox, footprint, gap, isOutside } from "./geometry";
import type { FloorPlan, PlanTable } from "./types";

export type TableSpec = Pick<PlanTable, "shape" | "diameter" | "length" | "width" | "capacity" | "rotation">;

const prototype = (spec: TableSpec, x: number, y: number): PlanTable => ({ ...spec, id: "", name: "", x, y, seats: [] });

// Lugares donde cabe una mesa de este tipo, respetando paredes, elementos y la circulación.
// Prueba una cuadrícula y una distribución intercalada (tresbolillo) y se queda con la que acomoda más.
export function findSpots(plan: FloorPlan, spec: TableSpec, { avoidTables = false } = {}) {
  const { room, settings, elements } = plan;
  const c = settings.circulation;
  const probe = footprint(prototype(spec, 0, 0));
  const hw = probe.kind === "circle" ? probe.r : probe.hw;
  const hh = probe.kind === "circle" ? probe.r : probe.hh;
  const pitchX = 2 * hw + c;
  const pitchY = 2 * hh + c;
  const obstacles = elements.map(elementBox);
  const others = avoidTables ? plan.tables.map(footprint) : [];

  const fits = (x: number, y: number) => {
    const fp = footprint(prototype(spec, x, y));
    if (isOutside(fp, room, c / 2)) return false;
    if (obstacles.some((o) => gap(fp, o) < c / 2)) return false;
    return !others.some((o) => gap(fp, o) < c);
  };

  const candidates = (staggered: boolean) => {
    const rowPitch = staggered ? pitchY * (Math.sqrt(3) / 2) : pitchY;
    const usableX = room.length - c - 2 * hw;
    const usableY = room.width - c - 2 * hh;
    if (usableX < 0 || usableY < 0) return [];
    const cols = Math.floor(usableX / pitchX) + 1;
    const rows = Math.floor(usableY / rowPitch) + 1;
    // Centra la cuadrícula en el salón
    const startX = (room.length - (cols - 1) * pitchX) / 2;
    const startY = (room.width - (rows - 1) * rowPitch) / 2;
    const spots: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const shift = staggered && r % 2 === 1 ? pitchX / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const x = startX + col * pitchX + shift;
        const y = startY + r * rowPitch;
        if (fits(x, y)) spots.push({ x, y });
      }
    }
    return spots;
  };

  const grid = candidates(false);
  const staggered = spec.shape === "round" ? candidates(true) : [];
  const spots = staggered.length > grid.length ? staggered : grid;

  // Las mesas más cercanas a la pista se ocupan primero
  const floor = elements.find((e) => e.type === "danceFloor");
  if (floor) spots.sort((a, b) => Math.hypot(a.x - floor.x, a.y - floor.y) - Math.hypot(b.x - floor.x, b.y - floor.y));
  return spots;
}

// Cuántas mesas de cada tipo caben en el salón vacío (con sus elementos), como estimación
export function capacityEstimate(plan: FloorPlan, round: TableSpec, rect: TableSpec) {
  const best = (spec: TableSpec) => {
    const tables = Math.max(findSpots(plan, spec).length, spec.shape === "rect" ? findSpots(plan, { ...spec, rotation: 90 }).length : 0);
    return { tables, guests: tables * spec.capacity };
  };
  return { round: best(round), rect: best(rect) };
}

// Un solo lugar libre para una mesa nueva: recorre el salón cada `step` cm y devuelve el punto válido
// más cercano a `near` (por defecto, el centro). Sirve para agregar mesas sin encimarlas.
export function findFreeSpot(plan: FloorPlan, spec: TableSpec, near?: { x: number; y: number }, step = 20) {
  const { room, settings, elements } = plan;
  const c = settings.circulation;
  const target = near ?? { x: room.length / 2, y: room.width / 2 };
  const obstacles = elements.map(elementBox);
  const others = plan.tables.map(footprint);
  let best: { x: number; y: number; d: number } | null = null;
  for (let x = step; x < room.length; x += step) {
    for (let y = step; y < room.width; y += step) {
      const d = Math.hypot(x - target.x, y - target.y);
      if (best && d >= best.d) continue;
      const fp = footprint(prototype(spec, x, y));
      if (isOutside(fp, room, c / 2)) continue;
      if (obstacles.some((o) => gap(fp, o) < c / 2)) continue;
      if (others.some((o) => gap(fp, o) < c)) continue;
      best = { x, y, d };
    }
  }
  return best && { x: best.x, y: best.y };
}
