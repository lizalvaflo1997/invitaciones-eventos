import type { FloorPlan, PlanElement, PlanTable, Rotation } from "./types";

// Silla vista desde arriba y separación respecto al borde de la mesa (cm)
export const CHAIR = { w: 46, d: 42, gap: 8 };
// Desde el borde de la mesa: silla + espacio para echarla atrás y sentarse
export const SEATING_DEPTH = 60;

// Como mesas y elementos solo giran en pasos de 90°, todo es un círculo o un rectángulo alineado
// a los ejes, y las distancias se calculan de forma exacta.
export type Shape = { kind: "circle"; x: number; y: number; r: number } | { kind: "box"; x: number; y: number; hw: number; hh: number };

const isQuarterTurn = (rotation: Rotation) => rotation === 90 || rotation === 270;

export function tableTop(t: PlanTable): Shape {
  if (t.shape === "round") return { kind: "circle", x: t.x, y: t.y, r: t.diameter / 2 };
  const [hw, hh] = isQuarterTurn(t.rotation) ? [t.width / 2, t.length / 2] : [t.length / 2, t.width / 2];
  return { kind: "box", x: t.x, y: t.y, hw, hh };
}

// Cuántas sillas van en cada lado de una mesa rectangular, en orden de las manecillas del reloj
export function rectSeatLayout(capacity: number) {
  const ends = capacity >= 6 ? 2 : 0;
  const sides = capacity - ends;
  return { top: Math.ceil(sides / 2), bottom: Math.floor(sides / 2), ends };
}

// Área ocupada por la mesa con sus sillas y el espacio para sentarse
export function footprint(t: PlanTable): Shape {
  if (t.shape === "round") return { kind: "circle", x: t.x, y: t.y, r: t.diameter / 2 + SEATING_DEPTH };
  const { ends } = rectSeatLayout(t.capacity);
  const halfLength = t.length / 2 + (ends ? SEATING_DEPTH : 0);
  const halfWidth = t.width / 2 + SEATING_DEPTH;
  const [hw, hh] = isQuarterTurn(t.rotation) ? [halfWidth, halfLength] : [halfLength, halfWidth];
  return { kind: "box", x: t.x, y: t.y, hw, hh };
}

export function elementBox(e: PlanElement): Shape {
  const [hw, hh] = isQuarterTurn(e.rotation) ? [e.h / 2, e.w / 2] : [e.w / 2, e.h / 2];
  return { kind: "box", x: e.x, y: e.y, hw, hh };
}

export function expand(shape: Shape, margin: number): Shape {
  return shape.kind === "circle" ? { ...shape, r: shape.r + margin } : { ...shape, hw: shape.hw + margin, hh: shape.hh + margin };
}

// Distancia libre entre dos figuras; negativa si se enciman
export function gap(a: Shape, b: Shape): number {
  if (a.kind === "circle" && b.kind === "circle") return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  if (a.kind === "box" && b.kind === "box") {
    const dx = Math.abs(a.x - b.x) - (a.hw + b.hw);
    const dy = Math.abs(a.y - b.y) - (a.hh + b.hh);
    if (dx < 0 && dy < 0) return Math.max(dx, dy);
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  }
  const circle = (a.kind === "circle" ? a : b) as Extract<Shape, { kind: "circle" }>;
  const box = (a.kind === "box" ? a : b) as Extract<Shape, { kind: "box" }>;
  const dx = Math.abs(circle.x - box.x) - box.hw;
  const dy = Math.abs(circle.y - box.y) - box.hh;
  if (dx < 0 && dy < 0) return Math.max(dx, dy) - circle.r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - circle.r;
}

export function bounds(shape: Shape) {
  const [hw, hh] = shape.kind === "circle" ? [shape.r, shape.r] : [shape.hw, shape.hh];
  return { left: shape.x - hw, right: shape.x + hw, top: shape.y - hh, bottom: shape.y + hh };
}

export function isOutside(shape: Shape, room: FloorPlan["room"], margin = 0) {
  const b = bounds(shape);
  return b.left < margin || b.top < margin || b.right > room.length - margin || b.bottom > room.width - margin;
}

// Gira un punto local alrededor del centro de la mesa (sentido de las manecillas, con Y hacia abajo)
function rotate(x: number, y: number, rotation: Rotation): [number, number] {
  switch (rotation) {
    case 90:
      return [-y, x];
    case 180:
      return [-x, -y];
    case 270:
      return [y, -x];
    default:
      return [x, y];
  }
}

// Posición de cada silla y hacia dónde mira (grados, hacia el centro de la mesa).
// Se numeran como las manecillas del reloj empezando arriba.
export function seatPositions(t: PlanTable): { x: number; y: number; angle: number }[] {
  const n = t.capacity;
  if (t.shape === "round") {
    const r = t.diameter / 2 + CHAIR.gap + CHAIR.d / 2;
    return Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { x: t.x + r * Math.cos(a), y: t.y + r * Math.sin(a), angle: (a * 180) / Math.PI + 180 };
    });
  }

  const { top, bottom, ends } = rectSeatLayout(n);
  const offY = t.width / 2 + CHAIR.gap + CHAIR.d / 2;
  const offX = t.length / 2 + CHAIR.gap + CHAIR.d / 2;
  const local: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < top; i++) local.push({ x: -t.length / 2 + (t.length * (i + 0.5)) / top, y: -offY, angle: 90 });
  if (ends) local.push({ x: offX, y: 0, angle: 180 });
  for (let i = 0; i < bottom; i++) local.push({ x: t.length / 2 - (t.length * (i + 0.5)) / bottom, y: offY, angle: 270 });
  if (ends) local.push({ x: -offX, y: 0, angle: 0 });

  return local.map((p) => {
    const [x, y] = rotate(p.x, p.y, t.rotation);
    return { x: t.x + x, y: t.y + y, angle: p.angle + t.rotation };
  });
}

export const nextRotation = (rotation: Rotation): Rotation => (((rotation + 90) % 360) as Rotation);
