import type { Event } from "@prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";

type EventNames = Pick<Event, "type" | "honoreeOne" | "honoreeTwo" | "title">;

// "Ana & Luis" en una boda; un solo nombre en los demás eventos
export function eventNames(event: EventNames) {
  return event.honoreeTwo ? `${event.honoreeOne} & ${event.honoreeTwo}` : event.honoreeOne;
}

// Lo que cambia según el tipo de evento: el encabezado de la invitación, las secciones y el mensaje
export function eventCopy(event: EventNames, t: Dictionary) {
  const type = t.eventTypes[event.type];
  return {
    ...type,
    names: eventNames(event),
    // En "Otro evento" el encabezado es el nombre que le pusieron, p. ej. "Graduación de Ana"
    eyebrow: event.type === "OTRO" && event.title ? event.title : type.eyebrow,
    initials: event.honoreeTwo ? `${event.honoreeOne[0]} & ${event.honoreeTwo[0]}` : event.honoreeOne[0],
  };
}
