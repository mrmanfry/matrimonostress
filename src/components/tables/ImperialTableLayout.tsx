import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions?: string | null;
  is_plus_one?: boolean;
  plus_one_of_guest_id?: string;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
};

type Assignment = {
  id: string;
  table_id: string;
  guest_id: string;
  seat_position?: number | null;
};

type ImperialTableLayoutProps = {
  tableId: string;
  capacity: number;
  guests: Guest[];
  assignments: Assignment[];
  isLocked?: boolean;
  onUnassign: (assignmentId: string) => void;
  onUpdateSeatPosition: (assignmentId: string, seatPosition: number | null) => void;
};

/* Droppable seat slot */
const SeatSlot = ({
  seatIndex,
  tableId,
  guest,
  assignment,
  isLocked,
  onUnassign,
  onClearSeat,
  compact,
}: {
  seatIndex: number;
  tableId: string;
  guest?: Guest;
  assignment?: Assignment;
  isLocked?: boolean;
  onUnassign: (assignmentId: string) => void;
  onClearSeat: (assignmentId: string) => void;
  compact?: boolean;
}) => {
  const droppableId = `seat_${tableId}_${seatIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded border text-xs min-h-[32px] transition-all",
          guest
            ? "bg-accent/20 border-border"
            : "bg-muted/30 border-dashed border-muted-foreground/30",
          isOver && "ring-2 ring-primary bg-primary/10"
        )}
      >
        <span className="text-muted-foreground font-mono w-5 shrink-0 text-right">{seatIndex}.</span>
        {guest ? (
          <>
            <span className="truncate flex-1">{guest.first_name} {guest.last_name}</span>
            {guest.dietary_restrictions && (
              <Badge variant="outline" className="text-[9px] px-1 shrink-0">🍽️</Badge>
            )}
            {!isLocked && assignment && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onClearSeat(assignment.id)}
                className="h-5 w-5 p-0 shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </>
        ) : (
          <span className="text-muted-foreground italic truncate flex-1">vuoto</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-md border px-1 py-1 min-w-[48px] min-h-[36px] transition-all text-xs",
        guest
          ? "bg-accent/20 border-border"
          : "bg-muted/30 border-dashed border-muted-foreground/30",
        isOver && "ring-2 ring-primary bg-primary/10 scale-105"
      )}
    >
      <span className="text-[8px] text-muted-foreground mb-0.5">{seatIndex}</span>
      {guest ? (
        <div className="flex items-center gap-1">
          <span className="truncate max-w-[40px] text-[10px] font-medium">{guest.first_name}</span>
          {guest.dietary_restrictions && <span className="text-[9px]">🍽️</span>}
          {!isLocked && assignment && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onClearSeat(assignment.id)}
              className="h-4 w-4 p-0"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      ) : (
        <User className="w-3 h-3 text-muted-foreground/40" />
      )}
    </div>
  );
};

export const ImperialTableLayout = ({
  tableId,
  capacity,
  guests,
  assignments,
  isLocked,
  onUnassign,
  onUpdateSeatPosition,
}: ImperialTableLayoutProps) => {
  const tableAssignments = assignments.filter(a => a.table_id === tableId);

  // Build seat map: seatIndex → { guest, assignment }
  const seatMap = new Map<number, { guest: Guest; assignment: Assignment }>();
  const unpositioned: { guest: Guest; assignment: Assignment }[] = [];

  tableAssignments.forEach(a => {
    const guest = guests.find(g => g.id === a.guest_id);
    if (!guest) return;
    if (a.seat_position != null && a.seat_position >= 1 && a.seat_position <= capacity) {
      seatMap.set(a.seat_position, { guest, assignment: a });
    } else {
      unpositioned.push({ guest, assignment: a });
    }
  });

  const halfCapacity = Math.ceil(capacity / 2);
  const sideA = Array.from({ length: halfCapacity }, (_, i) => i + 1);
  const sideB = Array.from({ length: capacity - halfCapacity }, (_, i) => halfCapacity + i + 1);

  const handleClearSeat = (assignmentId: string) => {
    onUpdateSeatPosition(assignmentId, null);
  };

  const isCompact = capacity > 20;

  if (isCompact) {
    return (
      <div className="space-y-3">
        {/* Compact grid view */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 max-h-[300px] overflow-y-auto pr-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 sticky top-0 bg-card z-10">Lato A</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 sticky top-0 bg-card z-10">Lato B</p>
          {Array.from({ length: Math.max(sideA.length, sideB.length) }).map((_, rowIdx) => {
            const seatA = sideA[rowIdx];
            const seatB = sideB[rowIdx];
            return (
              <div key={rowIdx} className="contents">
                {seatA != null ? (
                  <SeatSlot
                    seatIndex={seatA}
                    tableId={tableId}
                    guest={seatMap.get(seatA)?.guest}
                    assignment={seatMap.get(seatA)?.assignment}
                    isLocked={isLocked}
                    onUnassign={onUnassign}
                    onClearSeat={handleClearSeat}
                    compact
                  />
                ) : <div />}
                {seatB != null ? (
                  <SeatSlot
                    seatIndex={seatB}
                    tableId={tableId}
                    guest={seatMap.get(seatB)?.guest}
                    assignment={seatMap.get(seatB)?.assignment}
                    isLocked={isLocked}
                    onUnassign={onUnassign}
                    onClearSeat={handleClearSeat}
                    compact
                  />
                ) : <div />}
              </div>
            );
          })}
        </div>

        {/* Unpositioned zone */}
        {unpositioned.length > 0 && (
          <UnpositionedZone
            unpositioned={unpositioned}
            isLocked={isLocked}
            onUnassign={onUnassign}
          />
        )}
      </div>
    );
  }

  // Graphical top-down view for ≤20
  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Side A */}
        <div className="flex gap-1 justify-center overflow-x-auto mb-1">
          {sideA.map(seat => (
            <SeatSlot
              key={seat}
              seatIndex={seat}
              tableId={tableId}
              guest={seatMap.get(seat)?.guest}
              assignment={seatMap.get(seat)?.assignment}
              isLocked={isLocked}
              onUnassign={onUnassign}
              onClearSeat={handleClearSeat}
            />
          ))}
        </div>

        {/* Table body */}
        <div className="mx-4 h-4 bg-muted rounded-sm border border-border" />

        {/* Side B */}
        <div className="flex gap-1 justify-center overflow-x-auto mt-1">
          {sideB.map(seat => (
            <SeatSlot
              key={seat}
              seatIndex={seat}
              tableId={tableId}
              guest={seatMap.get(seat)?.guest}
              assignment={seatMap.get(seat)?.assignment}
              isLocked={isLocked}
              onUnassign={onUnassign}
              onClearSeat={handleClearSeat}
            />
          ))}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-1 px-2">
          <span className="text-[9px] text-muted-foreground uppercase">Lato A (1–{halfCapacity})</span>
          <span className="text-[9px] text-muted-foreground uppercase">Lato B ({halfCapacity + 1}–{capacity})</span>
        </div>
      </div>

      {/* Unpositioned zone */}
      {unpositioned.length > 0 && (
        <UnpositionedZone
          unpositioned={unpositioned}
          isLocked={isLocked}
          onUnassign={onUnassign}
        />
      )}
    </div>
  );
};

const UnpositionedZone = ({
  unpositioned,
  isLocked,
  onUnassign,
}: {
  unpositioned: { guest: Guest; assignment: Assignment }[];
  isLocked?: boolean;
  onUnassign: (assignmentId: string) => void;
}) => (
  <div className="border-t border-dashed pt-2">
    <p className="text-[10px] text-muted-foreground mb-1">
      Non posizionati ({unpositioned.length})
    </p>
    <div className="flex flex-wrap gap-1">
      {unpositioned.map(({ guest, assignment }) => (
        <div
          key={assignment.id}
          className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-dashed border-amber-500/30 rounded text-xs"
        >
          <span className="truncate">{guest.first_name} {guest.last_name}</span>
          {!isLocked && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnassign(assignment.id)}
              className="h-4 w-4 p-0"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  </div>
);
