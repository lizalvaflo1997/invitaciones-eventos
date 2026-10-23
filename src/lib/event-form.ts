import type { Event, EventType, Template } from "@prisma/client";
import { EventType as EventTypes } from "@prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";

// Validación y conversión compartidas por "Nuevo evento" y el módulo "Invitación"

export const EVENT_FIELDS = [
  "type",
  "honoreeOne",
  "honoreeTwo",
  "title",
  "date",
  "ceremonyVenue",
  "ceremonyAddress",
  "ceremonyTime",
  "receptionVenue",
  "receptionAddress",
  "receptionTime",
  "dressCode",
  "message",
  "giftRegistry",
  "rsvpDeadline",
  "templateId",
] as const;

export type EventField = (typeof EVENT_FIELDS)[number];
export type EventFormValues = Partial<Record<EventField, string>>;
export type EventFormState = {
  error?: string;
  fieldErrors?: Partial<Record<EventField, string>>;
  values?: EventFormValues;
};

const isEventType = (value: string): value is EventType => Object.values(EventTypes).includes(value as EventType);

// Las invitaciones muestran fechas en hora de la Ciudad de México, que no tiene horario de verano (UTC-6)
const TIME_ZONE = "America/Mexico_City";
const MX_OFFSET = "-06:00";
const toMexicoDate = (day: string, time = "00:00") => new Date(`${day}T${time}:00${MX_OFFSET}`);

type Options = {
  intl: string;
  errors: Dictionary["newEvent"]["errors"];
  findTemplate: (id: string) => Promise<Template | null>;
  // Al editar, si no se cambió la fecha se acepta aunque ya haya pasado
  currentDate?: Date;
};

export async function readEventForm(formData: FormData, { intl, errors, findTemplate, currentDate }: Options) {
  const values = Object.fromEntries(EVENT_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()])) as Record<EventField, string>;
  const fieldErrors: Partial<Record<EventField, string>> = {};

  const type = isEventType(values.type) ? values.type : null;
  if (!type) fieldErrors.type = errors.invalidType;

  for (const field of ["honoreeOne", "date", "ceremonyVenue", "ceremonyAddress", "ceremonyTime"] as const) {
    if (!values[field]) fieldErrors[field] = errors.required;
  }
  // La segunda persona solo existe en bodas; el nombre libre, solo en "Otro evento"
  if (type === "BODA" && !values.honoreeTwo) fieldErrors.honoreeTwo = errors.required;
  if (type === "OTRO" && !values.title) fieldErrors.title = errors.required;

  const date = values.date && values.ceremonyTime ? toMexicoDate(values.date, values.ceremonyTime) : null;
  const unchanged = date && currentDate && date.getTime() === currentDate.getTime();
  if (date && !unchanged && (Number.isNaN(date.getTime()) || date < new Date())) fieldErrors.date = errors.pastDate;

  // La recepción es opcional, pero si se empieza a llenar debe quedar completa
  const reception = [values.receptionVenue, values.receptionAddress, values.receptionTime];
  if (reception.some(Boolean) && !reception.every(Boolean)) fieldErrors.receptionVenue = errors.receptionIncomplete;

  // Fin del día límite, para que se pueda confirmar durante todo ese día
  const rsvpDeadline = values.rsvpDeadline ? toMexicoDate(values.rsvpDeadline, "23:59") : null;
  if (rsvpDeadline && date && rsvpDeadline >= date) fieldErrors.rsvpDeadline = errors.deadlineAfterEvent;

  const template = values.templateId ? await findTemplate(values.templateId) : null;
  if (!template) fieldErrors.templateId = errors.invalidTemplate;

  if (Object.keys(fieldErrors).length > 0 || !type || !date || !template) {
    return { ok: false as const, state: { error: errors.form, fieldErrors, values } satisfies EventFormState };
  }

  // Las horas se guardan ya escritas para mostrarse tal cual en la invitación, p. ej. "5:00 p.m."
  const formatTime = (time: string) =>
    new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`1970-01-01T${time}:00Z`));
  const optional = (value: string) => value || null;

  return {
    ok: true as const,
    data: {
      type,
      honoreeOne: values.honoreeOne,
      honoreeTwo: type === "BODA" ? values.honoreeTwo : null,
      title: type === "OTRO" ? values.title : null,
      date,
      ceremonyVenue: values.ceremonyVenue,
      ceremonyAddress: values.ceremonyAddress,
      ceremonyTime: formatTime(values.ceremonyTime),
      receptionVenue: optional(values.receptionVenue),
      receptionAddress: optional(values.receptionAddress),
      receptionTime: values.receptionTime ? formatTime(values.receptionTime) : null,
      dressCode: optional(values.dressCode),
      message: optional(values.message),
      giftRegistry: optional(values.giftRegistry),
      rsvpDeadline,
      templateId: template.id,
    },
  };
}

// "8:30 p.m.", "8:30 PM" o "20:30" → "20:30", el formato de los campos de hora
function toTimeInput(text: string | null) {
  const match = text?.match(/(\d{1,2}):(\d{2})\s*([ap])?/i);
  if (!match) return "";
  const suffix = match[3]?.toLowerCase();
  let hour = Number(match[1]);
  if (suffix === "p" && hour < 12) hour += 12;
  if (suffix === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function mexicoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// Lo guardado en la base de datos, en el formato que esperan los campos del formulario
export function eventToFormValues(event: Event): EventFormValues {
  const { day, time } = mexicoParts(event.date);
  return {
    type: event.type,
    honoreeOne: event.honoreeOne,
    honoreeTwo: event.honoreeTwo ?? "",
    title: event.title ?? "",
    date: day,
    ceremonyTime: time,
    ceremonyVenue: event.ceremonyVenue,
    ceremonyAddress: event.ceremonyAddress,
    receptionVenue: event.receptionVenue ?? "",
    receptionAddress: event.receptionAddress ?? "",
    receptionTime: toTimeInput(event.receptionTime),
    dressCode: event.dressCode ?? "",
    message: event.message ?? "",
    giftRegistry: event.giftRegistry ?? "",
    rsvpDeadline: event.rsvpDeadline ? mexicoParts(event.rsvpDeadline).day : "",
    templateId: event.templateId,
  };
}
