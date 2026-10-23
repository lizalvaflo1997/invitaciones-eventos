"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/client";
import { CIRCULATION_OPTIONS, MAX_CAPACITY } from "@/lib/floor-plan/catalog";
import { duplicateTable, newId, rectSpec, roundSpec } from "@/lib/floor-plan/factory";
import { nextRotation } from "@/lib/floor-plan/geometry";
import { capacityEstimate } from "@/lib/floor-plan/layout";
import { occupiedSeats } from "@/lib/floor-plan/seating";
import type { FloorPlan, PlanElement, PlanTable } from "@/lib/floor-plan/types";
import { severity } from "@/lib/floor-plan/validation";
import { useEditor } from "./editor-context";
import { NumberField, primaryButton, secondaryButton, Section, TextField, Toggle } from "./fields";
import { describeIssue } from "./PlanCanvas";

export function PropertiesPanel() {
  const { plan, selection } = useEditor();
  const table = selection?.kind === "table" ? plan.tables.find((t) => t.id === selection.id) : undefined;
  const element = selection?.kind === "element" ? plan.elements.find((e) => e.id === selection.id) : undefined;
  if (table) return <TableProperties table={table} />;
  if (element) return <ElementProperties element={element} />;
  return <RoomProperties />;
}

function Issues({ id }: { id: string }) {
  const { issues } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const list = issues.get(id) ?? [];
  if (!list.length) return null;
  return (
    <Section title={t.properties.warnings}>
      <ul className="space-y-1.5">
        {list.map((issue, i) => (
          <li
            key={i}
            className={`rounded-lg px-2.5 py-2 text-xs ${severity(issue) === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}
          >
            {describeIssue(issue, t.issues)}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TableProperties({ table }: { table: PlanTable }) {
  const { plan, apply, select, openTable, readOnly } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.properties;
  const update = (patch: Partial<PlanTable>) => {
    const next = { ...table, ...patch };
    // Si cambia la capacidad, las sillas que sobran se liberan (sus invitados vuelven a "Sin asignar")
    if (patch.capacity !== undefined) next.seats = Array.from({ length: patch.capacity }, (_, i) => table.seats[i] ?? null);
    apply({ ...plan, tables: plan.tables.map((tb) => (tb.id === table.id ? next : tb)) });
  };

  const duplicate = () => {
    const result = duplicateTable(plan, table, t.tables.defaultName);
    apply(result.plan);
    select({ kind: "table", id: result.id });
  };

  const remove = () => {
    apply({ ...plan, tables: plan.tables.filter((tb) => tb.id !== table.id) });
    select(null);
  };

  return (
    <div>
      <Section title={copy.title}>
        <div className="space-y-3">
          <TextField label={copy.name} value={table.name} onCommit={(name) => update({ name })} />
          <p className="text-sm text-[#3f2a2d]">
            {copy.type}: <strong>{table.shape === "round" ? copy.round : copy.rect}</strong>
          </p>
          {table.shape === "round" ? (
            <div className="grid grid-cols-2 gap-2">
              <NumberField label={t.tables.diameter} value={table.diameter} min={60} max={400} onCommit={(diameter) => update({ diameter })} />
              <NumberField label={t.tables.capacity} value={table.capacity} min={1} max={MAX_CAPACITY} onCommit={(capacity) => update({ capacity })} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <NumberField label={t.tables.length} value={table.length} min={60} max={800} onCommit={(length) => update({ length })} />
              <NumberField label={t.tables.width} value={table.width} min={50} max={300} onCommit={(width) => update({ width })} />
              <NumberField label={t.tables.capacity} value={table.capacity} min={1} max={MAX_CAPACITY} onCommit={(capacity) => update({ capacity })} />
            </div>
          )}
          <p className="rounded-lg bg-[#f6f3ef] px-3 py-2 text-sm font-medium text-[#3f2a2d]">{copy.assigned(occupiedSeats(table), table.capacity)}</p>
        </div>
      </Section>
      <Issues id={table.id} />
      {!readOnly && (
        <Section>
          <div className="grid gap-2">
            <button type="button" onClick={() => openTable(table.id)} className={primaryButton}>
              {copy.editSeats}
            </button>
            {table.shape === "rect" && (
              <button type="button" onClick={() => update({ rotation: nextRotation(table.rotation) })} className={secondaryButton}>
                ⟳ {copy.rotate}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={duplicate} className={secondaryButton}>
                {copy.duplicate}
              </button>
              <button type="button" onClick={remove} className={`${secondaryButton} text-red-700`}>
                {copy.remove}
              </button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function ElementProperties({ element }: { element: PlanElement }) {
  const { plan, apply, select, readOnly } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.properties;
  const update = (patch: Partial<PlanElement>) => apply({ ...plan, elements: plan.elements.map((e) => (e.id === element.id ? { ...e, ...patch } : e)) });

  return (
    <div>
      <Section title={copy.title}>
        <div className="space-y-3">
          <TextField label={copy.name} value={element.label} onCommit={(label) => update({ label })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={copy.elementWidth} value={element.w} min={20} max={plan.room.length} onCommit={(w) => update({ w })} />
            <NumberField label={copy.elementDepth} value={element.h} min={20} max={plan.room.length} onCommit={(h) => update({ h })} />
          </div>
        </div>
      </Section>
      <Issues id={element.id} />
      {!readOnly && (
        <Section>
          <div className="grid gap-2">
            {element.type !== "column" && (
              <button type="button" onClick={() => update({ rotation: nextRotation(element.rotation) })} className={secondaryButton}>
                ⟳ {copy.rotate}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const copyEl = { ...element, id: newId(), x: element.x + 60, y: element.y + 60 };
                  apply({ ...plan, elements: [...plan.elements, copyEl] });
                  select({ kind: "element", id: copyEl.id });
                }}
                className={secondaryButton}
              >
                {copy.duplicate}
              </button>
              <button
                type="button"
                onClick={() => {
                  apply({ ...plan, elements: plan.elements.filter((e) => e.id !== element.id) });
                  select(null);
                }}
                className={`${secondaryButton} text-red-700`}
              >
                {copy.remove}
              </button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function RoomProperties() {
  const { plan, apply, readOnly } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.properties;
  const settings = (patch: Partial<FloorPlan["settings"]>) => apply({ ...plan, settings: { ...plan.settings, ...patch } });
  const biggest = plan.settings.roundPresets.at(-1) ?? { diameter: 180, capacity: 10 };

  // Se recalcula solo cuando cambian las medidas, la circulación o los elementos (es la parte más costosa)
  const estimate = useMemo(
    () => capacityEstimate(plan, roundSpec(biggest.diameter, biggest.capacity), rectSpec()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.room, plan.settings.circulation, plan.elements, biggest.diameter, biggest.capacity],
  );

  return (
    <div>
      <Section title={copy.roomTitle}>
        <p className="mb-3 text-xs text-[#8a7d74]">{copy.selectHint}</p>
        {!readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label={copy.roomLength}
              value={plan.room.length / 100}
              min={2}
              max={200}
              step={0.5}
              onCommit={(m) => apply({ ...plan, room: { ...plan.room, length: Math.round(m * 100) } })}
            />
            <NumberField
              label={copy.roomWidth}
              value={plan.room.width / 100}
              min={2}
              max={200}
              step={0.5}
              onCommit={(m) => apply({ ...plan, room: { ...plan.room, width: Math.round(m * 100) } })}
            />
          </div>
        )}
      </Section>
      <Section title={copy.circulation}>
        <div className="flex flex-wrap gap-1.5">
          {CIRCULATION_OPTIONS.map((cm) => (
            <button
              key={cm}
              type="button"
              disabled={readOnly}
              onClick={() => settings({ circulation: cm })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                plan.settings.circulation === cm ? "border-[#6b1d29] bg-[#6b1d29] text-white" : "border-[#e3ddd5] text-[#3f2a2d] hover:border-[#c9b9a6]"
              }`}
            >
              {cm} cm
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Toggle label={copy.showCirculation} checked={plan.settings.showCirculation} onChange={(v) => settings({ showCirculation: v })} />
          <Toggle label={copy.showGrid} checked={plan.settings.showGrid} onChange={(v) => settings({ showGrid: v })} />
          {plan.settings.showGrid && (
            <NumberField label={copy.gridSize} value={plan.settings.gridSize} min={10} max={500} onCommit={(gridSize) => settings({ gridSize })} />
          )}
        </div>
      </Section>
      <Section title={copy.capacityTitle}>
        <ul className="space-y-2 text-sm text-[#3f2a2d]">
          <li>{copy.capacityRound(biggest.diameter, estimate.round.tables, estimate.round.guests)}</li>
          <li>{copy.capacityRect(estimate.rect.tables, estimate.rect.guests)}</li>
        </ul>
        <p className="mt-2 text-xs text-[#8a7d74]">{copy.capacityNote}</p>
      </Section>
      {!readOnly && <p className="px-4 pb-4 text-xs text-[#a59a92]">{copy.shortcuts}</p>}
    </div>
  );
}
