import { DEFAULT_RECT, DEFAULT_SETTINGS, ELEMENT_CATALOG } from "./catalog";
import { findFreeSpot, findSpots, type TableSpec } from "./layout";
import { placeParty, seatedCounts } from "./seating";
import type { ElementType, FloorPlan, PlanElement, PlanGuest, PlanTable } from "./types";

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

export const roundSpec = (diameter: number, capacity: number): TableSpec => ({ shape: "round", diameter, capacity, length: 240, width: 100, rotation: 0 });
export const rectSpec = (length = DEFAULT_RECT.length, width = DEFAULT_RECT.width, capacity = DEFAULT_RECT.capacity): TableSpec => ({
  shape: "rect",
  diameter: 180,
  length,
  width,
  capacity,
  rotation: 0,
});

export const makeTable = (spec: TableSpec, x: number, y: number, name: string, id = newId()): PlanTable => ({
  ...spec,
  id,
  name,
  x: Math.round(x),
  y: Math.round(y),
  seats: Array(spec.capacity).fill(null),
});

export function makeElement(type: ElementType, label: string, x: number, y: number): PlanElement {
  const { w, h } = ELEMENT_CATALOG[type];
  return { id: newId(), type, label, x: Math.round(x), y: Math.round(y), w, h, rotation: 0 };
}

// "Mesa 1", "Mesa 2"… el siguiente número libre
export function nextTableName(tables: PlanTable[], prefix: string) {
  const used = new Set(tables.map((t) => t.name));
  let n = tables.length + 1;
  while (used.has(`${prefix} ${n}`)) n++;
  return `${prefix} ${n}`;
}

export function emptyPlan(length: number, width: number): FloorPlan {
  return { version: 1, room: { length, width }, settings: DEFAULT_SETTINGS, tables: [], elements: [] };
}

// Mesas que ya existían (del módulo anterior) con sus invitados: se acomodan solas en el salón nuevo
export type ExistingTable = { id: string; name: string; capacity: number; guestIds: string[] };

export function withExistingTables(plan: FloorPlan, existing: ExistingTable[], guests: PlanGuest[]) {
  let next = plan;
  const byId = new Map(guests.map((g) => [g.id, g]));
  for (const t of existing) {
    const spec = roundSpec(t.capacity > 8 ? 180 : 150, Math.min(t.capacity, 24));
    const spot = findSpots(next, spec, { avoidTables: true })[0] ?? { x: plan.room.length / 2, y: plan.room.width / 2 };
    next = { ...next, tables: [...next.tables, makeTable(spec, spot.x, spot.y, t.name, t.id)] };
    for (const guestId of t.guestIds) {
      const guest = byId.get(guestId);
      if (guest) next = placeParty(next, { tableId: t.id, index: 0 }, guest).plan;
    }
  }
  return next;
}

// Salón de ejemplo de 18 × 12 m con pista de 5 × 5 m, escenario de 5 × 2 m, 6 mesas redondas y
// 2 rectangulares, con cerca de tres cuartas partes de los invitados ya sentados. Con 90 cm de
// circulación es lo que cabe sin que nada se encime (8 redondas llenan el salón y ya no entra ninguna rectangular).
export function demoPlan(guests: PlanGuest[], labels: { danceFloor: string; stage: string; tablePrefix: string }): FloorPlan {
  let plan = emptyPlan(1800, 1200);
  plan = {
    ...plan,
    elements: [makeElement("stage", labels.stage, 900, 100), makeElement("danceFloor", labels.danceFloor, 900, 450)],
  };

  const round = roundSpec(180, 10);
  const roundSpots = findSpots(plan, round);
  const tables: PlanTable[] = roundSpots.slice(0, 6).map((s, i) => makeTable(round, s.x, s.y, `${labels.tablePrefix} ${i + 1}`));
  plan = { ...plan, tables };

  for (let i = 0; i < 2; i++) {
    for (const rotation of [0, 90] as const) {
      const rect = { ...rectSpec(), rotation };
      const spot = findFreeSpot(plan, rect);
      if (!spot) continue;
      plan = { ...plan, tables: [...plan.tables, makeTable(rect, spot.x, spot.y, `${labels.tablePrefix} ${plan.tables.length + 1}`)] };
      break;
    }
  }

  const total = guests.reduce((sum, g) => sum + g.needed, 0);
  for (const guest of guests.filter((g) => g.status !== "DECLINADO")) {
    const seated = [...seatedCounts(plan).values()].reduce((a, b) => a + b, 0);
    if (seated >= total * 0.75) break;
    const table = plan.tables.find((t) => t.seats.filter((s) => s === null).length >= guest.needed);
    if (table) plan = placeParty(plan, { tableId: table.id, index: table.seats.indexOf(null) }, guest).plan;
  }
  return plan;
}

// Copia de una mesa (sin invitados) en el hueco libre más cercano a la original
export function duplicateTable(plan: FloorPlan, table: PlanTable, prefix: string) {
  const spec: TableSpec = { shape: table.shape, diameter: table.diameter, length: table.length, width: table.width, capacity: table.capacity, rotation: table.rotation };
  const spot = findFreeSpot(plan, spec, table) ?? { x: table.x + 80, y: table.y + 80 };
  const copy = makeTable(spec, spot.x, spot.y, nextTableName(plan.tables, prefix));
  return { plan: { ...plan, tables: [...plan.tables, copy] }, id: copy.id };
}
