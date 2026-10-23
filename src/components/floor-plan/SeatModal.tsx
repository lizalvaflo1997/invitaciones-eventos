"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n/client";
import { bounds, footprint, seatPositions } from "@/lib/floor-plan/geometry";
import { clearSeat, partyColor, toggleBlocked, type SeatRef } from "@/lib/floor-plan/seating";
import { useEditor } from "./editor-context";
import { secondaryButton } from "./fields";
import { TableShape } from "./shapes";

export function SeatModal({ tableId, dropTarget, draggingSeat, onClose }: { tableId: string; dropTarget: SeatRef | null; draggingSeat: SeatRef | null; onClose: () => void }) {
  const { plan, guests, labels, seated, issues, apply, startSeatDrag, startPartyDrag, readOnly } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.seats;
  const table = plan.tables.find((tb) => tb.id === tableId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!table) return null;
  const b = bounds(footprint(table));
  const margin = 70;
  const viewBox = `${b.left - margin} ${b.top - margin} ${b.right - b.left + margin * 2} ${b.bottom - b.top + margin * 2}`;
  const positions = seatPositions(table);
  const unassigned = guests.filter((g) => g.status !== "DECLINADO" && (seated.get(g.id) ?? 0) < g.needed);

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    const seatEl = (e.target as Element).closest("[data-seat]");
    if (!seatEl) return;
    const [, index] = seatEl.getAttribute("data-seat")!.split(":");
    const guestId = seatEl.getAttribute("data-guest");
    if (guestId) startSeatDrag({ tableId, index: Number(index) }, guestId, e);
    // Clic en una silla vacía o bloqueada: la bloquea o la libera
    else apply(toggleBlocked(plan, { tableId, index: Number(index) }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2a1c1e]/45 p-4 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={table.name} className="grid max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex min-h-[360px] items-center justify-center bg-[#f7f5f2] p-6">
          <svg viewBox={viewBox} className="h-full max-h-[70dvh] w-full touch-none select-none" onPointerDown={onPointerDown} fontFamily="Inter, system-ui, sans-serif">
            <TableShape
              table={table}
              issues={issues.get(table.id) ?? []}
              labels={labels}
              selected={false}
              dropSeat={dropTarget?.tableId === tableId ? dropTarget.index : null}
              draggingSeat={draggingSeat?.tableId === tableId ? draggingSeat.index : null}
              detailed
              nameOffset={64}
            />
            {/* Número de cada asiento, por fuera de la silla */}
            {positions.map((p, i) => {
              const dx = p.x - table.x;
              const dy = p.y - table.y;
              const d = Math.hypot(dx, dy) || 1;
              return (
                <text key={i} x={p.x + (dx / d) * 36} y={p.y + (dy / d) * 36} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="#a59a92" pointerEvents="none">
                  {i + 1}
                </text>
              );
            })}
          </svg>
          <p className="absolute bottom-3 left-4 right-4 text-center text-xs text-[#8a7d74]">{copy.hint}</p>
        </div>

        <div className="flex max-h-[92dvh] flex-col border-l border-[#eee9e2]">
          <div className="flex items-start justify-between gap-3 border-b border-[#eee9e2] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#3f2a2d]">{copy.title(table.name)}</h2>
              <p className="text-sm text-[#8a7d74]">{copy.count(table.capacity)}</p>
            </div>
            <button type="button" onClick={onClose} className={secondaryButton}>
              {copy.close}
            </button>
          </div>

          <ol className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {table.seats.map((seat, i) => {
              const label = labels.get(`${table.id}:${i}`);
              const blocked = !!seat && "blocked" in seat;
              return (
                <li key={i} data-seat={`${table.id}:${i}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#f6f3ef]">
                  <span className="w-20 shrink-0 text-xs text-[#a59a92]">{copy.seat(i + 1)}</span>
                  {label ? (
                    <>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: partyColor(label.guest.id) }} />
                      <span className="truncate text-[#3f2a2d]">
                        {label.guest.name}
                        {label.guest.needed > 1 && <span className="text-[#a59a92]"> {label.ordinal}/{label.guest.needed}</span>}
                      </span>
                    </>
                  ) : (
                    <span className={blocked ? "text-[#a59a92] line-through" : "text-emerald-700"}>{blocked ? copy.blocked : copy.available}</span>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => apply(label ? clearSeat(plan, { tableId, index: i }) : toggleBlocked(plan, { tableId, index: i }))}
                      className="ml-auto shrink-0 text-xs font-medium text-[#6b1d29] hover:underline"
                    >
                      {label ? copy.remove : blocked ? copy.unblock : copy.block}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {!readOnly && unassigned.length > 0 && (
            <div data-unassign-zone className="border-t border-[#eee9e2] px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8a7d74]">{t.guests.unassigned}</p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {unassigned.map((g) => (
                  <span
                    key={g.id}
                    onPointerDown={(e) => startPartyDrag(g.id, e)}
                    className="flex cursor-grab touch-none items-center gap-1.5 rounded-full border border-[#ece6de] bg-white px-2.5 py-1 text-xs text-[#3f2a2d]"
                  >
                    <span className="size-2 rounded-full" style={{ background: partyColor(g.id) }} />
                    {g.name} · {g.needed - (seated.get(g.id) ?? 0)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
