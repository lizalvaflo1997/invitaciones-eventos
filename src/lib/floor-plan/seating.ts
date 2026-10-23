import type { FloorPlan, PlanGuest, PlanTable, Seat } from "./types";

export type SeatRef = { tableId: string; index: number };

const mapTable = (plan: FloorPlan, tableId: string, fn: (t: PlanTable) => PlanTable): FloorPlan => ({
  ...plan,
  tables: plan.tables.map((t) => (t.id === tableId ? fn(t) : t)),
});

const hasGuest = (seat: Seat): seat is { guestId: string } => !!seat && "guestId" in seat;

// Cuántas sillas ocupa ya cada grupo
export function seatedCounts(plan: FloorPlan) {
  const counts = new Map<string, number>();
  for (const t of plan.tables) for (const s of t.seats) if (hasGuest(s)) counts.set(s.guestId, (counts.get(s.guestId) ?? 0) + 1);
  return counts;
}

// Ajusta el plano a los invitados actuales: cada mesa tiene tantas sillas como su capacidad, se quitan
// invitados que ya no existen o no asistirán, y ningún grupo ocupa más sillas de las que necesita.
export function normalizeSeats(plan: FloorPlan, guests: PlanGuest[]): FloorPlan {
  const needed = new Map(guests.filter((g) => g.status !== "DECLINADO").map((g) => [g.id, g.needed]));
  const used = new Map<string, number>();
  return {
    ...plan,
    tables: plan.tables.map((t) => ({
      ...t,
      seats: Array.from({ length: t.capacity }, (_, i) => {
        const seat = t.seats[i] ?? null;
        if (!hasGuest(seat)) return seat;
        const count = (used.get(seat.guestId) ?? 0) + 1;
        if (count > (needed.get(seat.guestId) ?? 0)) return null;
        used.set(seat.guestId, count);
        return seat;
      }),
    })),
  };
}

// Sienta a lo que falte del grupo en sillas libres, empezando por `start` en el sentido del reloj
export function placeParty(plan: FloorPlan, { tableId, index: start }: SeatRef, guest: PlanGuest) {
  const remaining = guest.needed - (seatedCounts(plan).get(guest.id) ?? 0);
  let placed = 0;
  const next = mapTable(plan, tableId, (t) => {
    const seats = [...t.seats];
    for (let k = 0; k < seats.length && placed < remaining; k++) {
      const i = (start + k) % seats.length;
      if (seats[i] === null) {
        seats[i] = { guestId: guest.id };
        placed++;
      }
    }
    return { ...t, seats };
  });
  return { plan: next, placed, leftover: Math.max(0, remaining - placed) };
}

// Mueve a una persona a otra silla; si está ocupada, intercambian lugares. Las sillas bloqueadas no se tocan.
export function moveSeat(plan: FloorPlan, from: SeatRef, to: SeatRef): FloorPlan {
  if (from.tableId === to.tableId && from.index === to.index) return plan;
  const source = plan.tables.find((t) => t.id === from.tableId)?.seats[from.index] ?? null;
  const target = plan.tables.find((t) => t.id === to.tableId)?.seats[to.index] ?? null;
  if (!hasGuest(source) || (target && !hasGuest(target))) return plan;

  return {
    ...plan,
    tables: plan.tables.map((t) => {
      if (t.id !== from.tableId && t.id !== to.tableId) return t;
      const seats = [...t.seats];
      if (t.id === from.tableId) seats[from.index] = target;
      if (t.id === to.tableId) seats[to.index] = source;
      return { ...t, seats };
    }),
  };
}

export function clearSeat(plan: FloorPlan, { tableId, index }: SeatRef): FloorPlan {
  return mapTable(plan, tableId, (t) => ({ ...t, seats: t.seats.map((s, i) => (i === index ? null : s)) }));
}

export function toggleBlocked(plan: FloorPlan, { tableId, index }: SeatRef): FloorPlan {
  return mapTable(plan, tableId, (t) => ({
    ...t,
    seats: t.seats.map((s, i) => (i !== index ? s : s && "blocked" in s ? null : s === null ? { blocked: true } : s)),
  }));
}

export function unseatGuest(plan: FloorPlan, guestId: string): FloorPlan {
  return { ...plan, tables: plan.tables.map((t) => ({ ...t, seats: t.seats.map((s) => (hasGuest(s) && s.guestId === guestId ? null : s)) })) };
}

// Etiqueta de cada silla ocupada: el grupo y qué persona del grupo es ("Familia Pérez 2/4")
export function seatLabels(plan: FloorPlan, guests: PlanGuest[]) {
  const byId = new Map(guests.map((g) => [g.id, g]));
  const ordinal = new Map<string, number>();
  const labels = new Map<string, { guest: PlanGuest; ordinal: number }>();
  for (const t of plan.tables) {
    t.seats.forEach((s, i) => {
      if (!hasGuest(s)) return;
      const guest = byId.get(s.guestId);
      if (!guest) return;
      const n = (ordinal.get(guest.id) ?? 0) + 1;
      ordinal.set(guest.id, n);
      labels.set(`${t.id}:${i}`, { guest, ordinal: n });
    });
  }
  return labels;
}

export const occupiedSeats = (t: PlanTable) => t.seats.filter(hasGuest).length;

// Color suave y estable para cada grupo, para reconocerlo en el plano
const PARTY_COLORS = ["#e9c9cf", "#cfdcc6", "#c9d8e6", "#ecd9b8", "#dccbe6", "#c8e0dc", "#f0cdb8", "#d9d2c4", "#e6c9e0", "#c9cfe6"];
export function partyColor(guestId: string) {
  let hash = 0;
  for (const ch of guestId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PARTY_COLORS[hash % PARTY_COLORS.length];
}

// Palabras que no cuentan para las iniciales ("Carlos y Sofía" → "CS")
const CONNECTORS = new Set(["y", "e", "and", "&", "de", "del", "la", "las", "los", "el"]);

export function initials(name: string) {
  const words = name
    .replace(/^(familia|family|sr\.?|sra\.?)\s+/i, "")
    .split(/\s+/)
    .filter((w) => w && !CONNECTORS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
