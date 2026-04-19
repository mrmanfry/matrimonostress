import type { GuestV2 } from "./types";
import { colorForGroup } from "./groupColors";

interface Props {
  seated: GuestV2[];
  capacity: number;
  groupColorMap: Record<string, string>;
  onSeatClick?: (guest: GuestV2) => void;
}

/**
 * Imperial table: 2-row rectangle with seats on long sides.
 * Splits capacity in half (top + bottom).
 */
export const ImperialTableSvg = ({ seated, capacity, groupColorMap, onSeatClick }: Props) => {
  const w = 280;
  const h = 130;
  const tableW = w - 60;
  const tableH = 36;
  const tx = (w - tableW) / 2;
  const ty = (h - tableH) / 2;
  const seatR = 13;
  const perSide = Math.ceil(capacity / 2);
  const sides: [number, number] = [perSide, capacity - perSide];
  const stepX = tableW / (perSide + 1);

  const renderSide = (count: number, isTop: boolean, offset: number) =>
    Array.from({ length: count }).map((_, i) => {
      const cx = tx + stepX * (i + 1);
      const cy = isTop ? ty - seatR - 2 : ty + tableH + seatR + 2;
      const guest = seated[offset + i];
      const color = guest ? colorForGroup(guest.group_id, groupColorMap) : "hsl(var(--muted-foreground))";
      const initials = guest
        ? guest.first_name.slice(0, 1) + guest.last_name.slice(0, 1)
        : "";
      return (
        <g
          key={`${isTop ? "a" : "b"}${i}`}
          onClick={(e) => {
            e.stopPropagation();
            if (guest) onSeatClick?.(guest);
          }}
          style={{ cursor: guest ? "pointer" : "default" }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={seatR}
            fill={guest ? color + "33" : "hsl(var(--card))"}
            stroke={guest ? color : "hsl(var(--border))"}
            strokeWidth={guest ? 1.5 : 1}
            strokeDasharray={guest ? "" : "2 2"}
          />
          {guest && (
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
          )}
        </g>
      );
    });

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
      {renderSide(sides[0], true, 0)}
      {renderSide(sides[1], false, sides[0])}
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
