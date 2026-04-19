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
 * Round table rendered as a compact named list with a small table glyph on top.
 * Prioritizes readability (full names) over seating position.
 */
export const RoundTableList = ({ tableId, seated, capacity, groupColorMap, onSeatClick }: Props) => {
  const slots: (GuestV2 | null)[] = Array.from({ length: capacity }, (_, i) => seated[i] || null);

  return (
    <div className="flex flex-col gap-2.5">
      {/* small table glyph */}
      <div className="flex justify-center pt-1">
        <svg width="72" height="36" viewBox="0 0 72 36">
          <ellipse cx="36" cy="18" rx="28" ry="12" fill="hsl(var(--muted) / 0.15)" stroke="hsl(var(--border))" />
          <ellipse cx="36" cy="18" rx="22" ry="7" fill="none" stroke="hsl(var(--border))" strokeDasharray="2 3" />
        </svg>
      </div>

      {/* name list, 2 columns */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        {slots.map((guest, i) => {
          if (!guest) {
            return <EmptySlot key={`${tableId}-empty-${i}`} index={i} tableId={tableId} />;
          }
          const color = colorForGroup(guest.group_id, groupColorMap);
          return (
            <div
              key={guest.id}
              onClick={(e) => {
                e.stopPropagation();
                onSeatClick?.(guest);
              }}
              title={`${guest.first_name} ${guest.last_name} — clicca per rimuovere`}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md cursor-pointer min-h-[24px] overflow-hidden border"
              style={{
                background: color + "15",
                borderColor: color + "33",
                color: "hsl(var(--foreground))",
              }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 6, height: 6, background: color }}
              />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis text-[11.5px] leading-tight">
                {guest.first_name} {guest.last_name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmptySlot = ({ index, tableId }: { index: number; tableId: string }) => {
  // each empty slot is a drop target on the seat
  const { setNodeRef, isOver } = useDroppable({ id: `seat_${tableId}_${index}` });
  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md min-h-[24px] border border-dashed transition-colors"
      style={{
        borderColor: isOver ? "hsl(var(--primary))" : "hsl(var(--border))",
        background: isOver ? "hsl(var(--primary) / 0.08)" : "transparent",
        color: "hsl(var(--muted-foreground))",
        fontStyle: "italic",
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: "hsl(var(--border))" }}
      />
      <span className="text-[10px]">Posto {index + 1}</span>
    </div>
  );
};
