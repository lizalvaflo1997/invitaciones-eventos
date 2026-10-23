"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { useI18n } from "@/i18n/client";
import { seatPositions } from "@/lib/floor-plan/geometry";
import type { SeatRef } from "@/lib/floor-plan/seating";
import type { FloorPlan } from "@/lib/floor-plan/types";
import type { Issue } from "@/lib/floor-plan/validation";
import { CirculationZone, ElementShape, TableShape, type SeatLabel } from "./shapes";

export type Selection = { kind: "table" | "element"; id: string } | null;

export type CanvasHandle = {
  // Silla más cercana a un punto de la pantalla (para soltar invitados), si está a menos de 45 cm
  seatAt: (clientX: number, clientY: number) => SeatRef | null;
  svg: () => SVGSVGElement | null;
  fit: () => void;
};

type Props = {
  ref?: Ref<CanvasHandle>;
  plan: FloorPlan;
  issues: Map<string, Issue[]>;
  labels: Map<string, SeatLabel>;
  selection: Selection;
  readOnly: boolean;
  dropTarget: SeatRef | null;
  draggingSeat: SeatRef | null;
  onSelect: (selection: Selection) => void;
  onLive: (plan: FloorPlan) => void;
  onCommit: (before: FloorPlan) => void;
  onOpenTable: (tableId: string) => void;
  onSeatDragStart: (seat: SeatRef, guestId: string, event: React.PointerEvent) => void;
};

type Gesture =
  | { mode: "pan"; startX: number; startY: number; tx: number; ty: number; moved: boolean }
  | { mode: "move"; kind: "table" | "element"; id: string; startX: number; startY: number; origX: number; origY: number; before: FloorPlan; moved: boolean }
  | { mode: "resize"; id: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number; before: FloorPlan };

const SNAP = 5;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const PAD = 70;

export function PlanCanvas(props: Props) {
  const { ref, plan, issues, labels, selection, readOnly, dropTarget, draggingSeat, onSelect, onLive, onCommit, onOpenTable, onSeatDragStart } = props;
  const { floorPlan: copy } = useI18n().t;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ scale: 0.5, tx: 40, ty: 40 });
  const [fitScale, setFitScale] = useState(0.5);
  const gesture = useRef<Gesture | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  // Siempre el plano actual dentro de los manejadores del puntero
  const planRef = useRef(plan);
  planRef.current = plan;

  const { length, width } = plan.room;

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scale = Math.min((el.clientWidth - PAD * 2) / length, (el.clientHeight - PAD * 2) / width);
    setFitScale(scale);
    setView({ scale, tx: (el.clientWidth - length * scale) / 2, ty: (el.clientHeight - width * scale) / 2 });
  }, [length, width]);

  useLayoutEffect(() => {
    fit();
    const observer = new ResizeObserver(() => fit());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fit]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return { x: (clientX - rect.left - view.tx) / view.scale, y: (clientY - rect.top - view.ty) / view.scale };
    },
    [view],
  );

  useImperativeHandle(
    ref,
    () => ({
      svg: () => svgRef.current,
      fit,
      seatAt: (clientX, clientY) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
        const p = toWorld(clientX, clientY);
        let best: SeatRef | null = null;
        let bestDistance = 45;
        for (const t of planRef.current.tables) {
          const seats = seatPositions(t);
          for (let index = 0; index < seats.length; index++) {
            const d = Math.hypot(seats[index].x - p.x, seats[index].y - p.y);
            if (d < bestDistance) {
              best = { tableId: t.id, index };
              bestDistance = d;
            }
          }
        }
        return best;
      },
    }),
    [fit, toWorld],
  );

  // Zoom con la rueda, centrado en el puntero
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setView((v) => {
        const scale = Math.min(fitScale * 6, Math.max(fitScale * 0.4, v.scale * Math.exp(-e.deltaY * 0.0015)));
        return { scale, tx: px - ((px - v.tx) / v.scale) * scale, ty: py - ((py - v.ty) / v.scale) * scale };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [fitScale]);

  const zoomBy = (factor: number) => {
    const el = containerRef.current!;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    setView((v) => {
      const scale = Math.min(fitScale * 6, Math.max(fitScale * 0.4, v.scale * factor));
      return { scale, tx: cx - ((cx - v.tx) / v.scale) * scale, ty: cy - ((cy - v.ty) / v.scale) * scale };
    });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    const world = toWorld(e.clientX, e.clientY);
    const seatEl = target.closest("[data-seat]");
    const tableEl = target.closest("[data-table]");
    const elementEl = target.closest("[data-element]");
    const handle = target.closest("[data-handle]");
    setHover(null);

    if (seatEl?.getAttribute("data-guest") && !readOnly) {
      const [tableId, index] = seatEl.getAttribute("data-seat")!.split(":");
      onSeatDragStart({ tableId, index: Number(index) }, seatEl.getAttribute("data-guest")!, e);
      return;
    }
    if (handle && elementEl && !readOnly) {
      const el = plan.elements.find((x) => x.id === elementEl.getAttribute("data-element"))!;
      gesture.current = { mode: "resize", id: el.id, startX: world.x, startY: world.y, origW: el.w, origH: el.h, origX: el.x, origY: el.y, before: plan };
    } else if (tableEl || elementEl) {
      const kind = tableEl ? "table" : "element";
      const id = (tableEl ?? elementEl)!.getAttribute(tableEl ? "data-table" : "data-element")!;
      onSelect({ kind, id });
      if (readOnly) return;
      const item = kind === "table" ? plan.tables.find((t) => t.id === id)! : plan.elements.find((x) => x.id === id)!;
      gesture.current = { mode: "move", kind, id, startX: world.x, startY: world.y, origX: item.x, origY: item.y, before: plan, moved: false };
    } else {
      gesture.current = { mode: "pan", startX: e.clientX, startY: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    }
    svgRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) {
      const tableEl = (e.target as Element).closest("[data-table]");
      const rect = containerRef.current!.getBoundingClientRect();
      setHover(tableEl ? { id: tableEl.getAttribute("data-table")!, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
      return;
    }
    if (g.mode === "pan") {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
      setView((v) => ({ ...v, tx: g.tx + dx, ty: g.ty + dy }));
      return;
    }
    const world = toWorld(e.clientX, e.clientY);
    const dx = world.x - g.startX;
    const dy = world.y - g.startY;
    const current = planRef.current;
    if (g.mode === "move") {
      if (Math.abs(dx) + Math.abs(dy) > 2) g.moved = true;
      const x = snap(g.origX + dx);
      const y = snap(g.origY + dy);
      onLive(
        g.kind === "table"
          ? { ...current, tables: current.tables.map((t) => (t.id === g.id ? { ...t, x, y } : t)) }
          : { ...current, elements: current.elements.map((el) => (el.id === g.id ? { ...el, x, y } : el)) },
      );
    } else {
      // Se arrastra la esquina inferior derecha; la superior izquierda queda fija.
      // En pantalla el elemento mide boxW × boxH; si está girado, su ancho y fondo están intercambiados.
      const turned = current.elements.find((x) => x.id === g.id)?.rotation === 90;
      const startW = turned ? g.origH : g.origW;
      const startH = turned ? g.origW : g.origH;
      const boxW = Math.max(20, snap(startW + dx));
      const boxH = Math.max(20, snap(startH + dy));
      const size = turned ? { w: boxH, h: boxW } : { w: boxW, h: boxH };
      const x = g.origX + (boxW - startW) / 2;
      const y = g.origY + (boxH - startH) / 2;
      onLive({ ...current, elements: current.elements.map((el) => (el.id === g.id ? { ...el, ...size, x, y } : el)) });
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.mode === "pan" && !g.moved) onSelect(null);
    if (g.mode === "move" && g.moved) onCommit(g.before);
    if (g.mode === "resize") onCommit(g.before);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    // Con el puntero capturado el evento llega al <svg>, así que se busca qué hay debajo del puntero
    const tableEl = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-table]");
    if (tableEl) onOpenTable(tableEl.getAttribute("data-table")!);
  };

  const hoverTable = hover && plan.tables.find((t) => t.id === hover.id);
  // Con suficiente zoom se muestran los nombres bajo las sillas
  const detailed = view.scale > 0.75;
  const gridSize = plan.settings.gridSize;
  const meters = Array.from({ length: Math.floor(length / 100) + 1 }, (_, i) => i);
  const metersY = Array.from({ length: Math.floor(width / 100) + 1 }, (_, i) => i);
  const rulerStep = view.scale * 100 < 28 ? 5 : view.scale * 100 < 55 ? 2 : 1;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#efede9]">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={onDoubleClick}
        fontFamily="Inter, system-ui, sans-serif"
      >
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#ece7df" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id="hatch" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={24} height={24} fill="#f1eeea" />
            <line x1={0} y1={0} x2={0} y2={24} stroke="#d6d0c8" strokeWidth={8} />
          </pattern>
          <pattern id="dance" width={100} height={100} patternUnits="userSpaceOnUse">
            <rect width={100} height={100} fill="#f3ecdf" />
            <rect width={50} height={50} fill="#e9dcc6" />
            <rect x={50} y={50} width={50} height={50} fill="#e9dcc6" />
          </pattern>
        </defs>

        <g data-world transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={0} y={0} width={length} height={width} fill="#ffffff" style={{ filter: "drop-shadow(0 6px 18px rgba(63,42,45,0.12))" }} />
          {plan.settings.showGrid && <rect x={0} y={0} width={length} height={width} fill="url(#grid)" />}
          <rect x={0} y={0} width={length} height={width} fill="none" stroke="#3f2a2d" strokeWidth={2} vectorEffect="non-scaling-stroke" />

          {/* Reglas en metros */}
          {meters
            .filter((m) => m % rulerStep === 0)
            .map((m) => (
              <text key={`x${m}`} x={m * 100} y={-14 / view.scale} textAnchor="middle" fontSize={11 / view.scale} fill="#9a8f86">
                {m}
              </text>
            ))}
          {metersY
            .filter((m) => m % rulerStep === 0 && m > 0)
            .map((m) => (
              <text key={`y${m}`} x={-10 / view.scale} y={m * 100} textAnchor="end" dominantBaseline="central" fontSize={11 / view.scale} fill="#9a8f86">
                {m}
              </text>
            ))}

          {plan.elements.map((el) => (
            <ElementShape key={el.id} element={el} selected={selection?.id === el.id} hasIssue={issues.has(el.id)} />
          ))}

          {plan.settings.showCirculation &&
            plan.tables.map((t) => (
              <CirculationZone key={`c${t.id}`} table={t} circulation={plan.settings.circulation} tight={!!issues.get(t.id)?.length} />
            ))}

          {plan.tables.map((t) => (
            <TableShape
              key={t.id}
              table={t}
              issues={issues.get(t.id) ?? []}
              labels={labels}
              selected={selection?.id === t.id}
              dropSeat={dropTarget?.tableId === t.id ? dropTarget.index : null}
              draggingSeat={draggingSeat?.tableId === t.id ? draggingSeat.index : null}
              detailed={detailed}
            />
          ))}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-4 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[#4a2a2e] shadow-sm backdrop-blur">
        {copy.room(fmt(length / 100), fmt(width / 100), fmt((length * width) / 10_000))}
        {plan.settings.showGrid && <span className="ml-2 font-normal text-[#a8837a]">· {copy.gridLabel(gridSize)}</span>}
      </div>

      {hoverTable && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-[#3f2a2d] px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-semibold">{hoverTable.name}</p>
          <p>{copy.tooltip.guests(hoverTable.seats.filter((s) => s && "guestId" in s).length, hoverTable.capacity)}</p>
          <p className="text-white/70">
            {hoverTable.shape === "round" ? copy.tooltip.round(hoverTable.diameter) : copy.tooltip.rect(hoverTable.length, hoverTable.width)}
          </p>
          {(issues.get(hoverTable.id) ?? []).map((issue, i) => (
            <p key={i} className="mt-1 max-w-56 text-amber-200">
              {describeIssue(issue, copy.issues)}
            </p>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white p-1 shadow-md">
        <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label={copy.zoom.out} className="size-8 rounded-full text-lg hover:bg-[#f3f0eb]">
          −
        </button>
        <span className="w-12 text-center text-xs tabular-nums text-[#4a2a2e]">{Math.round((view.scale / fitScale) * 100)}%</span>
        <button type="button" onClick={() => zoomBy(1.25)} aria-label={copy.zoom.in} className="size-8 rounded-full text-lg hover:bg-[#f3f0eb]">
          +
        </button>
        <button type="button" onClick={fit} className="rounded-full px-3 py-1.5 text-xs font-medium text-[#6b1d29] hover:bg-[#f3f0eb]">
          {copy.zoom.fit}
        </button>
      </div>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function describeIssue(issue: Issue, copy: ReturnType<typeof useI18n>["t"]["floorPlan"]["issues"]) {
  switch (issue.kind) {
    case "overlap":
      return copy.overlap(issue.other);
    case "tooClose":
      return copy.tooClose(issue.other, issue.missing);
    case "outside":
      return copy.outside;
    case "chairsOutside":
      return copy.chairsOutside;
    case "onElement":
      return copy.onElement(issue.other);
  }
}
