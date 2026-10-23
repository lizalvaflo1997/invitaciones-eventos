import type { ElementType, PlanSettings, RoundPreset } from "./types";

// Medidas de referencia; todas se pueden cambiar en el editor
export const DEFAULT_ROUND_PRESETS: RoundPreset[] = [
  { diameter: 120, capacity: 6 },
  { diameter: 140, capacity: 6 },
  { diameter: 150, capacity: 8 },
  { diameter: 180, capacity: 10 },
];

export const DEFAULT_RECT = { length: 240, width: 100, capacity: 10 };

export const CIRCULATION_OPTIONS = [60, 80, 90, 100, 120];

export const DEFAULT_SETTINGS: PlanSettings = {
  showGrid: true,
  gridSize: 50,
  circulation: 90,
  showCirculation: false,
  roundPresets: DEFAULT_ROUND_PRESETS,
};

export const MAX_CAPACITY = 24;

// Tamaño inicial y color de cada elemento del salón
export const ELEMENT_CATALOG: Record<ElementType, { w: number; h: number; fill: string; stroke: string }> = {
  danceFloor: { w: 500, h: 500, fill: "#efe6d6", stroke: "#b08d57" },
  stage: { w: 500, h: 200, fill: "#e4d3bd", stroke: "#8a6a35" },
  dj: { w: 200, h: 150, fill: "#e3dcea", stroke: "#7d6d93" },
  bar: { w: 400, h: 100, fill: "#dbe7df", stroke: "#5d806b" },
  headTable: { w: 300, h: 100, fill: "#f6ead3", stroke: "#b08d57" },
  giftTable: { w: 200, h: 80, fill: "#f4e1e4", stroke: "#a3606c" },
  entrance: { w: 200, h: 40, fill: "#dcefe0", stroke: "#4f8a5e" },
  exit: { w: 200, h: 40, fill: "#f6dcd7", stroke: "#b4574a" },
  kitchen: { w: 400, h: 300, fill: "#e6e6e3", stroke: "#8b8b85" },
  restrooms: { w: 300, h: 250, fill: "#dfe7f0", stroke: "#5b7898" },
  column: { w: 50, h: 50, fill: "#b9b0a6", stroke: "#7a7066" },
  blocked: { w: 200, h: 200, fill: "#ece9e5", stroke: "#9a938b" },
};
