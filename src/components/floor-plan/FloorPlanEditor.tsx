"use client";

import type { EventType } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LanguageSwitcher, useI18n } from "@/i18n/client";
import { demoPlan, duplicateTable, emptyPlan, withExistingTables, type ExistingTable } from "@/lib/floor-plan/factory";
import { nextRotation } from "@/lib/floor-plan/geometry";
import { clearSeat, moveSeat, normalizeSeats, partyColor, placeParty, seatedCounts, seatLabels, type SeatRef } from "@/lib/floor-plan/seating";
import type { FloorPlan, PlanGuest } from "@/lib/floor-plan/types";
import { validatePlan } from "@/lib/floor-plan/validation";
import { EditorContext, type EditorContextValue } from "./editor-context";
import { ElementsTab } from "./ElementsTab";
import { exportPlanImage } from "./exportImage";
import { GuestsTab } from "./GuestsTab";
import { PlanCanvas, type CanvasHandle, type Selection } from "./PlanCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { RoomSetup } from "./RoomSetup";
import { SeatModal } from "./SeatModal";
import { TablesTab } from "./TablesTab";
import { usePlanHistory } from "./usePlanHistory";

type Props = {
  eventName: string;
  eventType: EventType;
  backHref: string;
  fileName: string;
  initialPlan: FloorPlan | null;
  initialGuests: PlanGuest[];
  existingTables: ExistingTable[];
  savePlan: (json: string) => Promise<{ ok: boolean }>;
  addGuests: (entries: { name: string; seats: number }[]) => Promise<{ ok: boolean; guests?: PlanGuest[] }>;
};

type Drag = {
  kind: "party" | "seat";
  guestId: string;
  from?: SeatRef;
  x: number;
  y: number;
  target: SeatRef | "unassign" | null;
};

type Tab = "tables" | "guests" | "elements";

export function FloorPlanEditor(props: Props) {
  const { eventName, eventType, backHref, fileName, initialPlan, initialGuests, existingTables, savePlan, addGuests: addGuestsAction } = props;
  const { t } = useI18n();
  const copy = t.floorPlan;

  const [guests, setGuests] = useState(initialGuests);
  const [start] = useState(() => (initialPlan ? normalizeSeats(initialPlan, initialGuests) : null));
  const history = usePlanHistory(start);
  const plan = history.plan;
  const { actions } = history;
  const [savedJson, setSavedJson] = useState(() => (start ? JSON.stringify(start) : null));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<Tab>("tables");
  const [modalTable, setModalTable] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  // Las funciones de arrastre y teclado leen siempre el estado más reciente
  const latest = useRef({ plan, guests, selection, drag });
  useEffect(() => {
    latest.current = { plan, guests, selection, drag };
  });

  // En celular el plano solo se consulta
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setReadOnly(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const json = useMemo(() => (plan ? JSON.stringify(plan) : null), [plan]);
  const dirty = json !== null && json !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(
    async (planToSave = latest.current.plan) => {
      if (!planToSave) return;
      const body = JSON.stringify(planToSave);
      setSaveState("saving");
      const result = await savePlan(body).catch(() => ({ ok: false }));
      if (result.ok) {
        setSavedJson(body);
        setSaveState("idle");
      } else {
        setSaveState("error");
      }
    },
    [savePlan],
  );

  const issues = useMemo(() => (plan ? validatePlan(plan) : new Map()), [plan]);
  const labels = useMemo(() => (plan ? seatLabels(plan, guests) : new Map()), [plan, guests]);
  const seated = useMemo(() => (plan ? seatedCounts(plan) : new Map<string, number>()), [plan]);

  // ——— Arrastrar invitados a las sillas ———

  const resolveTarget = useCallback((x: number, y: number, kind: Drag["kind"]): Drag["target"] => {
    const el = document.elementFromPoint(x, y);
    const seatEl = el?.closest("[data-seat]");
    if (seatEl) {
      const [tableId, index] = seatEl.getAttribute("data-seat")!.split(":");
      return { tableId, index: Number(index) };
    }
    if (kind === "seat" && el?.closest("[data-unassign-zone]")) return "unassign";
    // Sobre el plano: la silla más cercana, aunque el puntero no esté justo encima
    if (el && el.closest("svg") === canvasRef.current?.svg()) return canvasRef.current?.seatAt(x, y) ?? null;
    return null;
  }, []);

  const beginDrag = useCallback(
    (next: Omit<Drag, "x" | "y" | "target">, e: React.PointerEvent) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      setDrag({ ...next, x: e.clientX, y: e.clientY, target: null });
    },
    [readOnly],
  );

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, target: resolveTarget(e.clientX, e.clientY, d.kind) } : d));
    const up = (e: PointerEvent) => {
      const { plan: current, guests: currentGuests, drag: d } = latest.current;
      setDrag(null);
      if (!d || !current) return;
      const target = resolveTarget(e.clientX, e.clientY, d.kind);
      if (!target) return;
      if (d.kind === "party" && target !== "unassign") {
        const guest = currentGuests.find((g) => g.id === d.guestId);
        if (!guest) return;
        const result = placeParty(current, target, guest);
        if (result.placed) actions.apply(result.plan);
        if (result.leftover) setToast(copy.guests.notEnough(guest.name, result.leftover));
      } else if (d.kind === "seat" && d.from) {
        actions.apply(target === "unassign" ? clearSeat(current, d.from) : moveSeat(current, d.from, target));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, resolveTarget, actions, copy.guests]);

  // ——— Atajos de teclado ———

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      const { plan: current, selection: sel } = latest.current;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        actions.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (!current || readOnly) {
        return;
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        actions.apply(
          sel.kind === "table"
            ? { ...current, tables: current.tables.filter((tb) => tb.id !== sel.id) }
            : { ...current, elements: current.elements.filter((el) => el.id !== sel.id) },
        );
        setSelection(null);
      } else if (mod && e.key.toLowerCase() === "d" && sel?.kind === "table") {
        e.preventDefault();
        const table = current.tables.find((tb) => tb.id === sel.id);
        if (!table) return;
        const result = duplicateTable(current, table, copy.tables.defaultName);
        actions.apply(result.plan);
        setSelection({ kind: "table", id: result.id });
      } else if (e.key.toLowerCase() === "r" && !mod && sel) {
        actions.apply(
          sel.kind === "table"
            ? { ...current, tables: current.tables.map((tb) => (tb.id === sel.id && tb.shape === "rect" ? { ...tb, rotation: nextRotation(tb.rotation) } : tb)) }
            : { ...current, elements: current.elements.map((el) => (el.id === sel.id ? { ...el, rotation: nextRotation(el.rotation) } : el)) },
        );
      } else if (e.key === "Escape") {
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, save, readOnly, copy.tables.defaultName]);

  const addGuests = useCallback(
    async (entries: { name: string; seats: number }[]) => {
      const result = await addGuestsAction(entries).catch(() => ({ ok: false, guests: undefined }));
      if (!result.ok || !result.guests) {
        setToast(copy.guests.addError);
        return false;
      }
      setGuests((list) => [...list, ...result.guests!]);
      return true;
    },
    [addGuestsAction, copy.guests.addError],
  );

  // ——— Primer uso: crear el salón ———

  const createPlan = (next: FloorPlan) => {
    actions.apply(next);
    save(next);
  };

  if (!plan) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#f3f1ed]">
        <TopBar eventName={eventName} backHref={backHref} />
        <RoomSetup
          existingTables={existingTables.length}
          onCreate={(length, width) => createPlan(withExistingTables(emptyPlan(length, width), existingTables, guests))}
          onDemo={() => createPlan(demoPlan(guests, { danceFloor: copy.elements.types.danceFloor, stage: copy.elements.types.stage, tablePrefix: copy.tables.defaultName }))}
        />
      </div>
    );
  }

  const active = guests.filter((g) => g.status !== "DECLINADO");
  const totalPeople = active.reduce((sum, g) => sum + g.needed, 0);
  const seatedPeople = active.reduce((sum, g) => sum + Math.min(g.needed, seated.get(g.id) ?? 0), 0);
  const capacity = plan.tables.reduce((sum, tb) => sum + tb.capacity, 0);
  const dropTarget = drag?.target && drag.target !== "unassign" ? drag.target : null;
  const draggingSeat = drag?.kind === "seat" ? (drag.from ?? null) : null;

  const context: EditorContextValue = {
    plan,
    guests,
    eventType,
    issues,
    labels,
    seated,
    selection,
    readOnly,
    apply: actions.apply,
    select: setSelection,
    openTable: setModalTable,
    addGuests,
    startPartyDrag: (guestId, e) => beginDrag({ kind: "party", guestId }, e),
    startSeatDrag: (from, guestId, e) => beginDrag({ kind: "seat", guestId, from }, e),
    notify: setToast,
  };
  const dragGuest = drag && guests.find((g) => g.id === drag.guestId);

  return (
    <EditorContext value={context}>
      <div className="flex h-[100dvh] flex-col bg-[#f3f1ed] text-[#3f2a2d]">
        <TopBar eventName={eventName} backHref={backHref}>
          <div className="flex items-center gap-1">
            <IconButton label={copy.undo} disabled={!history.canUndo} onClick={actions.undo}>
              ↶
            </IconButton>
            <IconButton label={copy.redo} disabled={!history.canRedo} onClick={actions.redo}>
              ↷
            </IconButton>
          </div>
          <span className={`hidden text-xs sm:inline ${saveState === "error" ? "text-[#b4232f]" : dirty ? "text-amber-700" : "text-emerald-700"}`}>
            {saveState === "saving" ? copy.saving : saveState === "error" ? copy.saveError : dirty ? copy.unsaved : `✓ ${copy.saved}`}
          </span>
          <button
            type="button"
            onClick={() => save()}
            disabled={!dirty || saveState === "saving"}
            className="rounded-lg bg-[#6b1d29] px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-[#7d2533] disabled:opacity-45"
          >
            {copy.save}
          </button>
          <button
            type="button"
            onClick={() => {
              const svg = canvasRef.current?.svg();
              if (svg) exportPlanImage(svg, plan, fileName);
            }}
            className="hidden rounded-lg border border-[#e3ddd5] bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-[#faf8f5] sm:block"
          >
            {copy.exportImage}
          </button>
        </TopBar>

        {/* Resumen */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[#e8e3dc] bg-white/70 px-4 py-2 text-sm backdrop-blur">
          <Counter value={copy.counters.guests(totalPeople)} />
          <Counter value={copy.counters.seated(seatedPeople)} tone="text-emerald-700" />
          <Counter value={copy.counters.unassigned(totalPeople - seatedPeople)} tone={totalPeople - seatedPeople ? "text-amber-700" : undefined} />
          <Counter value={copy.counters.tables(plan.tables.length)} />
          <span className="text-[#8a7d74]">{copy.counters.capacity(capacity)}</span>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Panel izquierdo */}
          <aside className="hidden w-80 shrink-0 flex-col border-r border-[#e8e3dc] bg-white md:flex">
            <div role="tablist" className="flex gap-1 border-b border-[#eee9e2] p-2">
              {(["tables", "guests", "elements"] as const).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${tab === key ? "bg-[#6b1d29] text-white" : "text-[#6b5b54] hover:bg-[#f6f3ef]"}`}
                >
                  {copy.tabs[key]}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "tables" && <TablesTab />}
              {tab === "guests" && <GuestsTab />}
              {tab === "elements" && <ElementsTab />}
            </div>
          </aside>

          {/* Plano */}
          <main className="relative min-w-0 flex-1">
            <PlanCanvas
              ref={canvasRef}
              plan={plan}
              issues={issues}
              labels={labels}
              selection={selection}
              readOnly={readOnly}
              dropTarget={dropTarget}
              draggingSeat={draggingSeat}
              onSelect={setSelection}
              onLive={actions.live}
              onCommit={actions.commit}
              onOpenTable={setModalTable}
              onSeatDragStart={(from, guestId, e) => beginDrag({ kind: "seat", guestId, from }, e)}
            />
            {readOnly && (
              <p className="absolute inset-x-3 top-12 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-[#6b5b54] shadow">{copy.mobileNotice}</p>
            )}
            {/* En tablet, las propiedades flotan sobre el plano */}
            {selection && (
              <div className="absolute bottom-16 right-3 top-3 hidden w-72 overflow-y-auto rounded-xl border border-[#e8e3dc] bg-white shadow-lg md:block lg:hidden">
                <PropertiesPanel />
              </div>
            )}
          </main>

          {/* Panel derecho */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-[#e8e3dc] bg-white lg:block">
            <PropertiesPanel />
          </aside>
        </div>

        {modalTable && <SeatModal tableId={modalTable} dropTarget={dropTarget} draggingSeat={draggingSeat} onClose={() => setModalTable(null)} />}

        {drag && dragGuest && (
          <div
            className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-xl ring-1 ring-black/5"
            style={{ left: drag.x + 14, top: drag.y + 10 }}
          >
            <span className="size-3 rounded-full" style={{ background: partyColor(dragGuest.id) }} />
            {dragGuest.name}
            {drag.kind === "party" && <span className="text-xs text-[#8a7d74]">· {dragGuest.needed - (seated.get(dragGuest.id) ?? 0)}</span>}
          </div>
        )}

        {toast && (
          <div role="status" className="fixed bottom-5 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl bg-[#3f2a2d] px-4 py-3 text-sm text-white shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </EditorContext>
  );
}

function TopBar({ eventName, backHref, children }: { eventName: string; backHref: string; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e3dc] bg-white px-4">
      <Link href={backHref} className="shrink-0 text-sm text-[#6b1d29]/80 transition hover:text-[#6b1d29]">
        {t.floorPlan.backToPanel}
      </Link>
      <div className="h-5 w-px bg-[#e8e3dc]" />
      <h1 className="min-w-0 truncate font-semibold">
        {eventName}
        <span className="ml-2 hidden font-normal text-[#8a7d74] sm:inline">· {t.floorPlan.meta}</span>
      </h1>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <LanguageSwitcher className="hidden bg-[#6b1d29]/5 text-[#4a2a2e] sm:flex" />
      </div>
    </header>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-lg text-[#3f2a2d] transition hover:bg-[#f3f0eb] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Counter({ value, tone }: { value: string; tone?: string }) {
  return <span className={`font-medium ${tone ?? "text-[#3f2a2d]"}`}>{value}</span>;
}
