import { ELEMENT_CATALOG } from "@/lib/floor-plan/catalog";
import { CHAIR, elementBox, expand, footprint, seatPositions, tableTop, type Shape } from "@/lib/floor-plan/geometry";
import { initials, partyColor } from "@/lib/floor-plan/seating";
import type { PlanElement, PlanGuest, PlanTable } from "@/lib/floor-plan/types";
import { severity, type Issue } from "@/lib/floor-plan/validation";

// Todo se dibuja en centímetros; los trazos no cambian de grosor con el zoom
const thin = { vectorEffect: "non-scaling-stroke" as const };

export const COLORS = {
  wine: "#6b1d29",
  gold: "#b08d57",
  error: "#b4232f",
  warning: "#d97706",
  ink: "#3f2a2d",
  chair: "#cbbfae",
};

export type SeatLabel = { guest: PlanGuest; ordinal: number };

// Dirección unitaria desde el centro de la mesa hacia la silla
function outward(p: { x: number; y: number }, table: PlanTable) {
  const dx = p.x - table.x;
  const dy = p.y - table.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

function ShapeOutline({ shape, ...props }: { shape: Shape } & React.SVGProps<SVGCircleElement & SVGRectElement>) {
  return shape.kind === "circle" ? (
    <circle cx={shape.x} cy={shape.y} r={shape.r} {...props} />
  ) : (
    <rect x={shape.x - shape.hw} y={shape.y - shape.hh} width={shape.hw * 2} height={shape.hh * 2} rx={12} {...props} />
  );
}

// Zona ocupada + la mitad de la circulación: dos zonas que apenas se tocan respetan la circulación exacta
export function CirculationZone({ table, circulation, tight }: { table: PlanTable; circulation: number; tight: boolean }) {
  return (
    <ShapeOutline
      shape={expand(footprint(table), circulation / 2)}
      fill={tight ? "rgba(217,119,6,0.10)" : "rgba(107,29,41,0.05)"}
      stroke={tight ? COLORS.warning : "rgba(107,29,41,0.35)"}
      strokeDasharray="6 5"
      strokeWidth={1}
      style={thin}
      pointerEvents="none"
    />
  );
}

type TableProps = {
  table: PlanTable;
  issues: Issue[];
  labels: Map<string, SeatLabel>;
  selected: boolean;
  dropSeat: number | null;
  detailed: boolean;
  draggingSeat?: number | null;
  // Distancia del nombre al centro de la silla (en la vista de asientos se aleja para dejar ver el número)
  nameOffset?: number;
};

export function TableShape({ table, issues, labels, selected, dropSeat, detailed, draggingSeat, nameOffset = 40 }: TableProps) {
  const positions = seatPositions(table);
  const hasError = issues.some((i) => severity(i) === "error");
  const stroke = hasError ? COLORS.error : issues.length ? COLORS.warning : selected ? COLORS.wine : COLORS.gold;
  const occupied = table.seats.filter((s) => s && "guestId" in s).length;
  const titleSize = Math.min(table.shape === "round" ? table.diameter * 0.15 : table.width * 0.26, 26);

  return (
    <g data-table={table.id} style={{ cursor: "grab" }}>
      {selected && (
        <ShapeOutline shape={expand(footprint(table), 6)} fill="none" stroke={COLORS.wine} strokeDasharray="8 6" strokeWidth={1.5} style={thin} pointerEvents="none" />
      )}

      {/* Sillas */}
      {positions.map((p, i) => {
        const seat = table.seats[i];
        const label = labels.get(`${table.id}:${i}`);
        const blocked = !!seat && "blocked" in seat;
        const fill = label ? partyColor(label.guest.id) : blocked ? "#ebe7e2" : "#ffffff";
        const highlighted = dropSeat === i;
        return (
          <g
            key={i}
            data-seat={`${table.id}:${i}`}
            data-guest={label ? label.guest.id : undefined}
            style={{ cursor: label ? "grab" : "pointer", opacity: draggingSeat === i ? 0.35 : 1 }}
          >
            <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
              <rect
                x={-CHAIR.d / 2}
                y={-CHAIR.w / 2}
                width={CHAIR.d}
                height={CHAIR.w}
                rx={9}
                fill={fill}
                stroke={highlighted ? COLORS.wine : label ? "rgba(63,42,45,0.35)" : COLORS.chair}
                strokeWidth={highlighted ? 3 : 1}
                style={thin}
              />
              <rect x={-CHAIR.d / 2} y={-CHAIR.w / 2} width={9} height={CHAIR.w} rx={4} fill={label ? "rgba(63,42,45,0.18)" : "#e9e2d8"} />
              {blocked && (
                <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#9a938b" strokeWidth={1.2} style={thin} />
              )}
            </g>
            {label && (
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={600} fill={COLORS.ink} pointerEvents="none">
                {initials(label.guest.name)}
              </text>
            )}
            {label && detailed && (
              // El nombre va por fuera de la silla, alejándose de la mesa
              <text
                x={p.x + outward(p, table).x * nameOffset}
                y={p.y + outward(p, table).y * nameOffset}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fill={COLORS.ink}
                pointerEvents="none"
              >
                {label.guest.name.split(" ")[0].slice(0, 12)}
                {label.guest.needed > 1 ? ` ${label.ordinal}/${label.guest.needed}` : ""}
              </text>
            )}
          </g>
        );
      })}

      {/* Cubierta */}
      {table.shape === "round" ? (
        <circle cx={table.x} cy={table.y} r={table.diameter / 2} fill="#fffdf9" stroke={stroke} strokeWidth={selected || issues.length ? 2.5 : 1.5} style={thin} />
      ) : (
        <ShapeOutline
          shape={tableTop(table)}
          fill="#fffdf9"
          stroke={stroke}
          strokeWidth={selected || issues.length ? 2.5 : 1.5}
          style={thin}
        />
      )}
      <text x={table.x} y={table.y - 3} textAnchor="middle" fontSize={titleSize} fontWeight={600} fill={COLORS.ink} pointerEvents="none">
        {table.name}
      </text>
      <text x={table.x} y={table.y + titleSize * 0.95} textAnchor="middle" fontSize={titleSize * 0.7} fill="#8a6a35" pointerEvents="none">
        {occupied}/{table.capacity}
      </text>

      {issues.length > 0 && (
        <g pointerEvents="none">
          <circle cx={table.x + titleSize * 2.3} cy={table.y - titleSize * 1.6} r={13} fill={hasError ? COLORS.error : COLORS.warning} />
          <text x={table.x + titleSize * 2.3} y={table.y - titleSize * 1.6} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fill="#fff">
            !
          </text>
        </g>
      )}
    </g>
  );
}

export function ElementShape({ element, selected, hasIssue }: { element: PlanElement; selected: boolean; hasIssue: boolean }) {
  const box = elementBox(element);
  const colors = ELEMENT_CATALOG[element.type];
  const x = box.kind === "box" ? box.x - box.hw : 0;
  const y = box.kind === "box" ? box.y - box.hh : 0;
  const w = box.kind === "box" ? box.hw * 2 : 0;
  const h = box.kind === "box" ? box.hh * 2 : 0;
  const fontSize = Math.max(12, Math.min(28, Math.min(w, h) * 0.22));

  return (
    <g data-element={element.id} style={{ cursor: "grab" }}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={element.type === "column" ? 4 : 10}
        fill={element.type === "blocked" ? "url(#hatch)" : element.type === "danceFloor" ? "url(#dance)" : colors.fill}
        stroke={hasIssue ? COLORS.error : selected ? COLORS.wine : colors.stroke}
        strokeWidth={selected || hasIssue ? 2.5 : 1.2}
        strokeDasharray={element.type === "blocked" ? "8 6" : undefined}
        style={thin}
      />
      {element.type !== "column" && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={600}
          fill={colors.stroke}
          pointerEvents="none"
          style={{ letterSpacing: "0.04em" }}
        >
          {element.label}
        </text>
      )}
      {selected && (
        <rect
          data-handle="resize"
          x={x + w - 14}
          y={y + h - 14}
          width={28}
          height={28}
          rx={6}
          fill="#fff"
          stroke={COLORS.wine}
          strokeWidth={1.5}
          style={{ ...thin, cursor: "nwse-resize" }}
        />
      )}
    </g>
  );
}
