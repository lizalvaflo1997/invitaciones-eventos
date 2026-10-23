import type { Event, Guest } from "@prisma/client";
import type { Dictionary } from "@/i18n/dictionaries";

export type TemplateProps = {
  event: Event;
  guest: Guest;
  t: Dictionary;
  // Vista previa del panel: se ve igual, pero el formulario de confirmación no envía nada
  preview?: boolean;
};
