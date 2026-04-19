import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { RoundTableList } from "./RoundTableList";
import { ImperialTableSvg } from "./ImperialTableSvg";
import type { GuestV2, TableV2 } from "./types";

interface Props {
  table: TableV2;
  seated: GuestV2[];
  selected?: boolean;
  groupColorMap: Record<string, string>;
  onSelect: (id: string) => void;
  onSeatClick?: (guest: GuestV2) => void;
}

export const TableCardV2 = ({
  table,
  seated,
  selected,
  groupColorMap,
  onSelect,
  onSeatClick,
}: Props) => {
  const filled = seated.length;
  const cap = table.capacity;
  const isFull = filled >= cap;
  const isOverbooked = filled > cap;
  const isImperial = table.shape?.toLowerCase() === "imperial" || table.table_type === "imperial";

  // Whole-card drop target (used when dragging onto card area, not specific seat)
  const { setNodeRef, isOver } = useDroppable({ id: table.id });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect(table.id)}
      className="rounded-2xl p-3.5 flex flex-col gap-2.5 cursor-pointer transition-all"
      style={{
        background: "hsl(var(--card))",
        border: selected
          ? "1.5px solid hsl(var(--primary))"
          : isOver
          ? "1.5px solid hsl(var(--primary))"
          : "1px solid hsl(var(--border))",
        boxShadow: selected
          ? "0 0 0 4px hsl(var(--primary) / 0.08)"
          : "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div
            className="font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "hsl(var(--foreground))" }}
          >
            {table.name}
          </div>
          <div
            className="flex items-center gap-1.5 mt-0.5 text-[11px]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <span>{isImperial ? "Imperiale" : "Tondo"}</span>
            <span>·</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: isOverbooked
                  ? "hsl(var(--destructive))"
                  : isFull
                  ? "hsl(var(--status-confirmed))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {filled}/{cap}
            </span>
          </div>
        </div>
        {isOverbooked && (
          <Badge variant="destructive" className="text-[10px] h-5">
            +{filled - cap}
          </Badge>
        )}
        {isFull && !isOverbooked && (
          <Badge className="text-[10px] h-5 bg-[hsl(var(--status-confirmed))] hover:bg-[hsl(var(--status-confirmed))]">
            Pieno
          </Badge>
        )}
      </div>

      {/* Visual */}
      {isImperial ? (
        <div className="flex justify-center py-2">
          <ImperialTableSvg
            seated={seated}
            capacity={cap}
            groupColorMap={groupColorMap}
            onSeatClick={onSeatClick}
          />
        </div>
      ) : (
        <RoundTableList
          tableId={table.id}
          seated={seated}
          capacity={cap}
          groupColorMap={groupColorMap}
          onSeatClick={onSeatClick}
        />
      )}

      {filled === 0 && (
        <div
          className="text-center text-[11px] italic px-0 py-2 rounded-md border border-dashed"
          style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
        >
          Trascina qui o clicca per aggiungere
        </div>
      )}
    </div>
  );
};
