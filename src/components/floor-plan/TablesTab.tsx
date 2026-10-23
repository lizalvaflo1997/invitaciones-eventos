"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { DEFAULT_RECT, MAX_CAPACITY } from "@/lib/floor-plan/catalog";
import { makeTable, nextTableName, rectSpec, roundSpec } from "@/lib/floor-plan/factory";
import { findFreeSpot, findSpots, type TableSpec } from "@/lib/floor-plan/layout";
import { occupiedSeats } from "@/lib/floor-plan/seating";
import { severity } from "@/lib/floor-plan/validation";
import { useEditor } from "./editor-context";
import { inputClass, NumberField, primaryButton, secondaryButton, Section } from "./fields";

export function TablesTab() {
  const { plan, guests, issues, selection, apply, select, notify } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.tables;
  const presets = plan.settings.roundPresets;
  const [presetIndex, setPresetIndex] = useState(Math.max(0, presets.findIndex((p) => p.diameter === 180)));
  const [newPreset, setNewPreset] = useState<{ diameter: number; capacity: number } | null>(null);
  const [rect, setRect] = useState(DEFAULT_RECT);
  const preset = presets[presetIndex] ?? presets[0];

  // Se coloca en el hueco libre más cercano al centro; si no hay, en el centro (y el editor avisa)
  const addTable = (spec: TableSpec) => {
    const spot = findFreeSpot(plan, spec) ?? { x: plan.room.length / 2, y: plan.room.width / 2 };
    const table = makeTable(spec, spot.x, spot.y, nextTableName(plan.tables, copy.defaultName));
    apply({ ...plan, tables: [...plan.tables, table] });
    select({ kind: "table", id: table.id });
  };

  const updatePreset = (index: number, capacity: number) =>
    apply({ ...plan, settings: { ...plan.settings, roundPresets: presets.map((p, i) => (i === index ? { ...p, capacity } : p)) } });

  const addPreset = () => {
    if (!newPreset) return;
    const roundPresets = [...presets.filter((p) => p.diameter !== newPreset.diameter), newPreset].sort((a, b) => a.diameter - b.diameter);
    apply({ ...plan, settings: { ...plan.settings, roundPresets } });
    setPresetIndex(roundPresets.findIndex((p) => p.diameter === newPreset.diameter));
    setNewPreset(null);
  };

  // Renumera las mesas "Mesa N" según su posición; las que tienen nombre propio se respetan
  const renumber = () => {
    const pattern = new RegExp(`^${copy.defaultName} \\d+$`);
    const numbered = plan.tables.filter((tb) => pattern.test(tb.name)).sort((a, b) => a.y - b.y || a.x - b.x);
    const names = new Map(numbered.map((tb, i) => [tb.id, `${copy.defaultName} ${i + 1}`]));
    apply({ ...plan, tables: plan.tables.map((tb) => (names.has(tb.id) ? { ...tb, name: names.get(tb.id)! } : tb)) });
  };

  return (
    <div>
      <Section title={copy.roundTitle}>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((p, i) => (
            <button
              key={p.diameter}
              type="button"
              onClick={() => setPresetIndex(i)}
              className={`rounded-lg border px-1 py-2 text-center transition ${
                i === presetIndex ? "border-[#6b1d29] bg-[#6b1d29]/5" : "border-[#e3ddd5] hover:border-[#c9b9a6]"
              }`}
            >
              <span className="block text-sm font-semibold text-[#3f2a2d]">{p.diameter}</span>
              <span className="block text-[0.65rem] leading-tight text-[#8a7d74]">{t.guests.people_(p.capacity)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#8a7d74]">{copy.presetsHint}</p>
        {preset && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NumberField label={copy.capacity} value={preset.capacity} min={1} max={MAX_CAPACITY} onCommit={(v) => updatePreset(presetIndex, v)} />
            <div className="flex items-end">
              <button type="button" onClick={() => addTable(roundSpec(preset.diameter, preset.capacity))} className={`${primaryButton} w-full`}>
                {copy.addRound}
              </button>
            </div>
          </div>
        )}
        {newPreset ? (
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <NumberField label={copy.diameter} value={newPreset.diameter} min={60} max={400} onCommit={(v) => setNewPreset({ ...newPreset, diameter: v })} />
            <NumberField label={copy.capacity} value={newPreset.capacity} min={1} max={MAX_CAPACITY} onCommit={(v) => setNewPreset({ ...newPreset, capacity: v })} />
            <button type="button" onClick={addPreset} className={secondaryButton}>
              OK
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setNewPreset({ diameter: 160, capacity: 8 })} className="mt-2 text-xs font-medium text-[#6b1d29] hover:underline">
            {copy.addPreset}
          </button>
        )}
      </Section>

      <Section title={copy.rectTitle}>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label={copy.length} value={rect.length} min={60} max={800} onCommit={(v) => setRect({ ...rect, length: v })} />
          <NumberField label={copy.width} value={rect.width} min={50} max={300} onCommit={(v) => setRect({ ...rect, width: v })} />
          <NumberField label={copy.capacity} value={rect.capacity} min={1} max={MAX_CAPACITY} onCommit={(v) => setRect({ ...rect, capacity: v })} />
        </div>
        <button type="button" onClick={() => addTable(rectSpec(rect.length, rect.width, rect.capacity))} className={`${primaryButton} mt-3 w-full`}>
          {copy.addRect}
        </button>
      </Section>

      <AutoDistribute
        defaultGuests={guests.filter((g) => g.status !== "DECLINADO").reduce((s, g) => s + g.needed, 0)}
        roundDiameter={preset?.diameter ?? 180}
        rect={rect}
        onDone={(message) => notify(message)}
      />

      <Section
        title={`${copy.listTitle} (${plan.tables.length})`}
        action={
          plan.tables.length > 1 ? (
            <button type="button" onClick={renumber} title={copy.renumberHint} className="text-xs font-medium text-[#6b1d29] hover:underline">
              {copy.renumber}
            </button>
          ) : undefined
        }
      >
        {plan.tables.length === 0 ? (
          <p className="text-sm text-[#8a7d74]">{copy.empty}</p>
        ) : (
          <ul className="space-y-1">
            {plan.tables.map((tb) => {
              const tableIssues = issues.get(tb.id) ?? [];
              const dot = tableIssues.some((i) => severity(i) === "error") ? "bg-[#b4232f]" : tableIssues.length ? "bg-[#d97706]" : "bg-emerald-500";
              return (
                <li key={tb.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: "table", id: tb.id })}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      selection?.id === tb.id ? "bg-[#6b1d29]/8 font-medium" : "hover:bg-[#f6f3ef]"
                    }`}
                  >
                    <span className={`size-2 shrink-0 rounded-full ${dot}`} />
                    <span className="truncate text-[#3f2a2d]">{tb.name}</span>
                    <span className="ml-auto text-xs tabular-nums text-[#8a7d74]">
                      {occupiedSeats(tb)}/{tb.capacity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function AutoDistribute({
  defaultGuests,
  roundDiameter,
  rect,
  onDone,
}: {
  defaultGuests: number;
  roundDiameter: number;
  rect: { length: number; width: number };
  onDone: (message: string) => void;
}) {
  const { plan, apply } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.tables.auto;
  const [guestCount, setGuestCount] = useState(Math.max(defaultGuests, 1));
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [perTable, setPerTable] = useState(10);
  const [confirming, setConfirming] = useState(false);
  const needed = Math.ceil(guestCount / perTable);

  const run = () => {
    const spec = shape === "round" ? roundSpec(roundDiameter, perTable) : rectSpec(rect.length, rect.width, perTable);
    // Para las rectangulares se prueba en ambas orientaciones y se usa la que acomoda más
    const options = shape === "rect" ? [spec, { ...spec, rotation: 90 as const }] : [spec];
    const best = options.map((s) => ({ s, spots: findSpots({ ...plan, tables: [] }, s) })).sort((a, b) => b.spots.length - a.spots.length)[0];
    const tables = best.spots.slice(0, needed).map((p, i) => makeTable(best.s, p.x, p.y, `${t.tables.defaultName} ${i + 1}`));
    apply({ ...plan, tables });
    setConfirming(false);
    onDone(copy.result(tables.length, needed));
  };

  return (
    <Section title={copy.title}>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={copy.guests} value={guestCount} min={1} max={2000} onCommit={setGuestCount} />
        <NumberField label={copy.perTable} value={perTable} min={1} max={MAX_CAPACITY} onCommit={setPerTable} />
        <label className="col-span-2 flex flex-col gap-1 text-xs text-[#7a6a62]">
          {copy.type}
          <select value={shape} onChange={(e) => setShape(e.target.value as "round" | "rect")} className={inputClass}>
            <option value="round">
              {copy.round} · Ø {roundDiameter} cm
            </option>
            <option value="rect">
              {copy.rect} · {rect.length} × {rect.width} cm
            </option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-sm font-medium text-[#6b1d29]">{copy.needed(needed)}</p>
      {confirming ? (
        <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <p>{copy.replaceWarning}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={run} className={primaryButton}>
              {copy.confirm}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => (plan.tables.length ? setConfirming(true) : run())} className={`${secondaryButton} mt-2 w-full`}>
          {copy.run}
        </button>
      )}
    </Section>
  );
}
