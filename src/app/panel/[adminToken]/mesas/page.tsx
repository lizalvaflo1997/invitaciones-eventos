import type { Metadata } from "next";
import { FloorPlanEditor } from "@/components/floor-plan/FloorPlanEditor";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { eventCopy } from "@/lib/event-copy";
import { getOwnedEvent } from "@/lib/events";
import { parsePlan } from "@/lib/floor-plan/sanitize";
import { addPlanGuests, savePlan } from "../actions";

export const metadata: Metadata = { robots: { index: false } };

// Editor del salón a pantalla completa (fuera del marco de módulos para tener todo el espacio)
export default async function TablesPage({ params }: { params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();
  const copy = eventCopy(event, t);
  const [guests, tables] = await Promise.all([
    db.guest.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } }),
    db.eventTable.findMany({ where: { eventId: event.id }, include: { guests: { select: { id: true } } } }),
  ]);
  const title = event.type === "OTRO" && event.title ? event.title : copy.names;

  return (
    <FloorPlanEditor
      eventName={`${copy.label} · ${title}`}
      eventType={event.type}
      backHref={`/panel/${adminToken}`}
      fileName={`plano-${event.slug}`}
      initialPlan={parsePlan(event.floorPlan)}
      initialGuests={guests.map((g) => ({
        id: g.id,
        name: g.name,
        status: g.status,
        needed: g.status === "DECLINADO" ? 0 : g.status === "CONFIRMADO" ? (g.attending ?? 0) : g.seats,
      }))}
      existingTables={tables.map((tb) => ({ id: tb.id, name: tb.name, capacity: tb.capacity, guestIds: tb.guests.map((g) => g.id) }))}
      savePlan={savePlan.bind(null, adminToken)}
      addGuests={addPlanGuests.bind(null, adminToken)}
    />
  );
}
