import { DEFAULT_ROUND_PRESETS, DEFAULT_SETTINGS, MAX_CAPACITY } from "./catalog";
import { ELEMENT_TYPES, type ElementType, type FloorPlan, type PlanElement, type PlanTable, type Rotation, type Seat } from "./types";

// El plano llega del navegador: aquí se valida y se acota todo antes de guardarlo o usarlo

const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const str = (v: unknown, max: number, fallback: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
const rotation = (v: unknown): Rotation => ([0, 90, 180, 270].includes(v as number) ? (v as Rotation) : 0);
const id = (v: unknown) => (typeof v === "string" && /^[\w-]{4,40}$/.test(v) ? v : null);
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);

const MAX_ROOM = 20_000; // 200 m

function seat(v: unknown): Seat {
  if (v && typeof v === "object") {
    if ("blocked" in v && v.blocked === true) return { blocked: true };
    if ("guestId" in v && id(v.guestId)) return { guestId: v.guestId as string };
  }
  return null;
}

function table(v: unknown, index: number): PlanTable | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const tableId = id(t.id);
  if (!tableId) return null;
  const capacity = num(t.capacity, 1, MAX_CAPACITY, 10);
  const seats = list(t.seats, capacity).map(seat);
  return {
    id: tableId,
    name: str(t.name, 40, `Mesa ${index + 1}`),
    shape: t.shape === "rect" ? "rect" : "round",
    x: num(t.x, -MAX_ROOM, MAX_ROOM * 2, 0),
    y: num(t.y, -MAX_ROOM, MAX_ROOM * 2, 0),
    diameter: num(t.diameter, 60, 400, 180),
    length: num(t.length, 60, 800, 240),
    width: num(t.width, 50, 300, 100),
    rotation: rotation(t.rotation),
    capacity,
    seats: [...seats, ...Array(capacity - seats.length).fill(null)],
  };
}

function element(v: unknown): PlanElement | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  const elementId = id(e.id);
  if (!elementId || !ELEMENT_TYPES.includes(e.type as ElementType)) return null;
  return {
    id: elementId,
    type: e.type as ElementType,
    label: str(e.label, 40, "—"),
    x: num(e.x, -MAX_ROOM, MAX_ROOM * 2, 0),
    y: num(e.y, -MAX_ROOM, MAX_ROOM * 2, 0),
    w: num(e.w, 20, MAX_ROOM, 200),
    h: num(e.h, 20, MAX_ROOM, 200),
    rotation: rotation(e.rotation) === 0 || rotation(e.rotation) === 180 ? 0 : 90,
  };
}

export function parsePlan(input: unknown): FloorPlan | null {
  let raw = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const room = (p.room ?? {}) as Record<string, unknown>;
  const settings = (p.settings ?? {}) as Record<string, unknown>;

  const presets = list(settings.roundPresets, 12)
    .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((r) => ({ diameter: num(r!.diameter, 60, 400, 180), capacity: num(r!.capacity, 1, MAX_CAPACITY, 10) }));

  return {
    version: 1,
    room: { length: num(room.length, 200, MAX_ROOM, 1800), width: num(room.width, 200, MAX_ROOM, 1200) },
    settings: {
      showGrid: settings.showGrid !== false,
      gridSize: num(settings.gridSize, 10, 500, DEFAULT_SETTINGS.gridSize),
      circulation: num(settings.circulation, 0, 400, DEFAULT_SETTINGS.circulation),
      showCirculation: settings.showCirculation === true,
      roundPresets: presets.length ? presets : DEFAULT_ROUND_PRESETS,
    },
    tables: list(p.tables, 300)
      .map(table)
      .filter((t): t is PlanTable => t !== null),
    elements: list(p.elements, 100)
      .map(element)
      .filter((e): e is PlanElement => e !== null),
  };
}
