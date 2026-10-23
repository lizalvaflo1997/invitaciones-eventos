import { elementBox, footprint, gap, isOutside, tableTop } from "./geometry";
import type { FloorPlan } from "./types";

export type Issue =
  | { kind: "overlap"; other: string }
  | { kind: "tooClose"; other: string; missing: number }
  | { kind: "outside" }
  | { kind: "chairsOutside" }
  | { kind: "onElement"; other: string };

// "error": se encima o se sale; "warning": solo le falta espacio de circulación
export const severity = (issue: Issue) => (issue.kind === "tooClose" ? "warning" : "error");

// Revisa cada mesa y elemento contra el salón y entre sí. Solo advierte; nunca impide moverlos.
export function validatePlan(plan: FloorPlan) {
  const issues = new Map<string, Issue[]>();
  const add = (id: string, issue: Issue) => issues.set(id, [...(issues.get(id) ?? []), issue]);
  const { tables, elements, room, settings } = plan;

  const tops = tables.map(tableTop);
  const prints = tables.map(footprint);

  tables.forEach((t, i) => {
    if (isOutside(tops[i], room)) add(t.id, { kind: "outside" });
    else if (isOutside(prints[i], room)) add(t.id, { kind: "chairsOutside" });

    for (const e of elements) {
      if (gap(prints[i], elementBox(e)) < 0) add(t.id, { kind: "onElement", other: e.label });
    }

    for (let j = i + 1; j < tables.length; j++) {
      const other = tables[j];
      if (gap(tops[i], tops[j]) < 0) {
        add(t.id, { kind: "overlap", other: other.name });
        add(other.id, { kind: "overlap", other: t.name });
        continue;
      }
      const free = gap(prints[i], prints[j]);
      if (free < settings.circulation) {
        const missing = Math.ceil(settings.circulation - free);
        add(t.id, { kind: "tooClose", other: other.name, missing });
        add(other.id, { kind: "tooClose", other: t.name, missing });
      }
    }
  });

  for (const e of elements) {
    if (isOutside(elementBox(e), room)) add(e.id, { kind: "outside" });
  }
  return issues;
}
