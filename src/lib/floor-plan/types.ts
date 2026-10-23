// Plano del salón. Todas las medidas y posiciones están en centímetros; las posiciones son el
// centro de cada objeto. El eje X es el largo del salón y el eje Y su ancho.

export type Rotation = 0 | 90 | 180 | 270;

// Un asiento puede estar libre, bloqueado o tener a una persona de un grupo de invitados
export type Seat = null | { blocked: true } | { guestId: string };

export type PlanTable = {
  id: string;
  name: string;
  shape: "round" | "rect";
  x: number;
  y: number;
  // Mesa redonda
  diameter: number;
  // Mesa rectangular (largo sobre el eje X cuando la rotación es 0)
  length: number;
  width: number;
  rotation: Rotation;
  capacity: number;
  // Siempre tiene `capacity` posiciones
  seats: Seat[];
};

export const ELEMENT_TYPES = [
  "danceFloor",
  "stage",
  "dj",
  "bar",
  "headTable",
  "giftTable",
  "entrance",
  "exit",
  "kitchen",
  "restrooms",
  "column",
  "blocked",
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

export type PlanElement = {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  // Medidas sin girar; con rotación 90/270 se intercambian
  w: number;
  h: number;
  rotation: Rotation;
};

export type RoundPreset = { diameter: number; capacity: number };

export type PlanSettings = {
  showGrid: boolean;
  gridSize: number;
  // Espacio libre mínimo entre las zonas ocupadas (sillas incluidas) de dos mesas
  circulation: number;
  showCirculation: boolean;
  roundPresets: RoundPreset[];
};

export type FloorPlan = {
  version: 1;
  room: { length: number; width: number };
  settings: PlanSettings;
  tables: PlanTable[];
  elements: PlanElement[];
};

// Invitados tal como los ve el editor: un grupo ocupa `needed` sillas
export type PlanGuest = { id: string; name: string; needed: number; status: "PENDIENTE" | "CONFIRMADO" | "DECLINADO" };
