"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { partyColor } from "@/lib/floor-plan/seating";
import { useEditor } from "./editor-context";
import { inputClass, NumberField, primaryButton, secondaryButton, Section } from "./fields";

// "Familia Pérez, 4" → { name: "Familia Pérez", seats: 4 }; sin número, 1 persona
function parseList(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?)[,;\t]\s*(\d{1,2})$/);
      return match ? { name: match[1].trim(), seats: Math.min(20, Math.max(1, Number(match[2]))) } : { name: line, seats: 1 };
    })
    .filter((g) => g.name)
    .slice(0, 200);
}

export function GuestsTab() {
  const { guests, seated, labels, plan, addGuests, startPartyDrag, readOnly } = useEditor();
  const { t } = useI18n();
  const copy = t.floorPlan.guests;
  const [name, setName] = useState("");
  const [people, setPeople] = useState(1);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const matches = (n: string) => n.toLowerCase().includes(query.trim().toLowerCase());
  const active = guests.filter((g) => g.status !== "DECLINADO" && g.needed > 0 && matches(g.name));
  const unassigned = active.filter((g) => (seated.get(g.id) ?? 0) < g.needed);
  const seatedGuests = active.filter((g) => (seated.get(g.id) ?? 0) > 0);

  // Mesa(s) de cada invitado acomodado, para mostrarlas en la lista
  const tablesOf = new Map<string, Set<string>>();
  for (const tb of plan.tables) {
    tb.seats.forEach((_, i) => {
      const label = labels.get(`${tb.id}:${i}`);
      if (label) tablesOf.set(label.guest.id, (tablesOf.get(label.guest.id) ?? new Set()).add(tb.name));
    });
  }

  const submit = async (entries: { name: string; seats: number }[], reset: () => void) => {
    if (!entries.length) return;
    setBusy(true);
    if (await addGuests(entries)) reset();
    setBusy(false);
  };

  return (
    <div>
      {!readOnly && (
        <>
          <Section title={copy.addTitle}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit([{ name: name.trim(), seats: people }], () => {
                  setName("");
                  setPeople(1);
                });
              }}
              className="grid grid-cols-[1fr_72px] gap-2"
            >
              <label className="flex flex-col gap-1 text-xs text-[#7a6a62]">
                {copy.name}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.namePlaceholder} className={inputClass} />
              </label>
              <NumberField label={copy.people} value={people} min={1} max={20} onCommit={setPeople} />
              <button disabled={busy || !name.trim()} className={`${primaryButton} col-span-2`}>
                {busy ? copy.adding : copy.add}
              </button>
            </form>
          </Section>

          <Section title={copy.pasteTitle}>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={4}
              placeholder={copy.pastePlaceholder}
              className={`${inputClass} resize-y font-mono text-xs`}
            />
            <p className="mt-1 text-xs text-[#8a7d74]">{copy.pasteHint}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy || !pasted.trim()} onClick={() => submit(parseList(pasted), () => setPasted(""))} className={`${secondaryButton} flex-1`}>
                {copy.pasteAdd}
              </button>
              <button type="button" disabled title={copy.soon} className={`${secondaryButton} flex items-center gap-1.5`}>
                CSV
                <span className="rounded-full bg-[#c9a35f]/15 px-1.5 text-[0.6rem] uppercase text-[#8a6a35]">{copy.soon}</span>
              </button>
            </div>
          </Section>
        </>
      )}

      <div className="px-4 pt-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.search} className={inputClass} type="search" />
      </div>

      {/* Soltar aquí una silla ocupada la deja libre */}
      <div data-unassign-zone>
        <Section title={`${copy.unassigned} (${unassigned.length})`}>
          {!readOnly && <p className="mb-2 text-xs text-[#8a7d74]">{copy.dragHint}</p>}
          {unassigned.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#e3ddd5] px-3 py-4 text-center text-sm text-[#8a7d74]">{copy.unassignedEmpty}</p>
          ) : (
            <ul className="space-y-1.5">
              {unassigned.map((g) => {
                const missing = g.needed - (seated.get(g.id) ?? 0);
                return (
                  <li
                    key={g.id}
                    onPointerDown={readOnly ? undefined : (e) => startPartyDrag(g.id, e)}
                    className={`flex touch-none items-center gap-2 rounded-lg border border-[#ece6de] bg-white px-2.5 py-2 text-sm shadow-[0_1px_2px_rgba(63,42,45,0.05)] ${
                      readOnly ? "" : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ background: partyColor(g.id) }} />
                    <span className="truncate text-[#3f2a2d]">{g.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-[#8a7d74]">
                      {missing < g.needed ? copy.missing(missing) : copy.people_(g.needed)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Section title={`${copy.seated} (${seatedGuests.length})`}>
        <ul className="space-y-1">
          {seatedGuests.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: partyColor(g.id) }} />
              <span className="truncate text-[#3f2a2d]">{g.name}</span>
              <span className="ml-auto shrink-0 truncate text-xs text-[#8a7d74]">{[...(tablesOf.get(g.id) ?? [])].join(", ")}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
