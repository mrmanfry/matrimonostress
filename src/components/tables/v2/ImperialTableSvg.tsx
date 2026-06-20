import { useDroppable } from "@dnd-kit/core";
import type { GuestV2 } from "./types";
import { colorForGroup } from "./groupColors";

interface Props {
  tableId: string;
  seated: GuestV2[];
  capacity: number;
  groupColorMap: Record<string, string>;
  onSeatClick?: (guest: GuestV2) => void;
}

/**
 * Imperial table: 2-row rectangle with seats on long sides.
 * Each seat is a drop target — drag a guest to assign to a specific seat.
 * Seats are filled by seat_position (0..capacity-1):
 *   - 0..perSide-1   => top row (Lato A)
 *   - perSide..end   => bottom row (Lato B)
 */
export const ImperialTableSvg = ({
  tableId,
  seated,
  capacity,
  groupColorMap,
  onSeatClick,
}: Props) => {
  const w = 280;
  const h = 130;
  const tableW = w - 60;
  const tableH = 36;
  const tx = (w - tableW) / 2;
  const ty = (h - tableH) / 2;
  const seatR = 13;
  const perSide = Math.ceil(capacity / 2);
  const stepX = tableW / (perSide + 1);

  // Map guests to seats by seat_position (fallback: fill unassigned into first free seats)
  const seats: (GuestV2 | null)[] = Array.from({ length: capacity }, () => null);
  const unpositioned: GuestV2[] = [];
  seated.forEach((g) => {
    const p = g.seat_position;
    if (typeof p === "number" && p >= 0 && p < capacity && !seats[p]) {
      seats[p] = g;
    } else {
      unpositioned.push(g);
    }
  });
  for (let i = 0; i < capacity && unpositioned.length > 0; i++) {
    if (!seats[i]) seats[i] = unpositioned.shift()!;
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <rect
        x={tx}
        y={ty}
        width={tableW}
        height={tableH}
        fill="hsl(var(--muted) / 0.15)"
        stroke="hsl(var(--border))"
        rx="4"
      />
      <line
        x1={tx + 8}
        y1={h / 2}
        x2={tx + tableW - 8}
        y2={h / 2}
        stroke="hsl(var(--border))"
        strokeDasharray="2 3"
      />
      {seats.map((guest, idx) => {
        const isTop = idx < perSide;
        const localIdx = isTop ? idx : idx - perSide;
        const countOnSide = isTop ? perSide : capacity - perSide;
        // recompute stepX for bottom side if asymmetric
        const sideStep = tableW / (countOnSide + 1);
        const cx = tx + sideStep * (localIdx + 1);
        const cy = isTop ? ty - seatR - 2 : ty + tableH + seatR + 2;
        return (
          <ImperialSeat
            key={idx}
            tableId={tableId}
            seatIndex={idx}
            cx={cx}
            cy={cy}
            r={seatR}
            guest={guest}
            groupColorMap={groupColorMap}
            onSeatClick={onSeatClick}
          />
        );
      })}
      <text
        x={tx + tableW * 0.25}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fill="hsl(var(--muted-foreground))"
        letterSpacing="1"
      >
        LATO A
      </text>
      <text
        x={tx + tableW * 0.75}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fill="hsl(var(--muted-foreground))"
        letterSpacing="1"
      >
        LATO B
      </text>
    </svg>
  );
};

interface SeatProps {
  tableId: string;
  seatIndex: number;
  cx: number;
  cy: number;
  r: number;
  guest: GuestV2 | null;
  groupColorMap: Record<string, string>;
  onSeatClick?: (guest: GuestV2) => void;
}

const ImperialSeat = ({
  tableId,
  seatIndex,
  cx,
  cy,
  r,
  guest,
  groupColorMap,
  onSeatClick,
}: SeatProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: `seat_${tableId}_${seatIndex}` });
  const color = guest ? colorForGroup(guest.group_id, groupColorMap) : "hsl(var(--muted-foreground))";
  const initials = guest
    ? (guest.first_name.slice(0, 1) || "") + (guest.last_name.slice(0, 1) || "")
    : "";

  return (
    <g
      ref={setNodeRef as unknown as React.Ref<SVGGElement>}
      onClick={(e) => {
        e.stopPropagation();
        if (guest) onSeatClick?.(guest);
      }}
      style={{ cursor: guest ? "pointer" : "default" }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r + (isOver ? 2 : 0)}
        fill={
          isOver
            ? "hsl(var(--primary) / 0.18)"
            : guest
            ? color + "33"
            : "hsl(var(--card))"
        }
        stroke={isOver ? "hsl(var(--primary))" : guest ? color : "hsl(var(--border))"}
        strokeWidth={isOver ? 2 : guest ? 1.5 : 1}
        strokeDasharray={guest || isOver ? "" : "2 2"}
      />
      {guest ? (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="600"
          fill={color}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {initials}
        </text>
      ) : (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {seatIndex + 1}
        </text>
      )}
    </g>
  );
};
