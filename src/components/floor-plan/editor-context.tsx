"use client";

import { createContext, useContext } from "react";
import type { SeatRef } from "@/lib/floor-plan/seating";
import type { EventType } from "@prisma/client";
import type { FloorPlan, PlanGuest } from "@/lib/floor-plan/types";
import type { Issue } from "@/lib/floor-plan/validation";
import type { Selection } from "./PlanCanvas";
import type { SeatLabel } from "./shapes";

export type EditorContextValue = {
  plan: FloorPlan;
  guests: PlanGuest[];
  eventType: EventType;
  issues: Map<string, Issue[]>;
  labels: Map<string, SeatLabel>;
  seated: Map<string, number>;
  selection: Selection;
  readOnly: boolean;
  // Cambio que se puede deshacer
  apply: (plan: FloorPlan) => void;
  select: (selection: Selection) => void;
  openTable: (tableId: string) => void;
  addGuests: (entries: { name: string; seats: number }[]) => Promise<boolean>;
  startPartyDrag: (guestId: string, event: React.PointerEvent) => void;
  startSeatDrag: (seat: SeatRef, guestId: string, event: React.PointerEvent) => void;
  notify: (message: string) => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor debe usarse dentro del editor de plano");
  return value;
}
