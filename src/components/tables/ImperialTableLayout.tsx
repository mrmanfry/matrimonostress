import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

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
  onAssignToSeat?: (guestId: string, seatPosition: number) => void;
};

const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

/* Droppable seat slot */
const SeatSlot = ({
  seatIndex,
  tableId,
  guest,
  assignment,
  isLocked,
  onClearSeat,
  compact,
  unpositioned,
  unassignedGuests,
  onPickGuest,
}: {
  seatIndex: number;
  tableId: string;
  guest?: Guest;
  assignment?: Assignment;
  isLocked?: boolean;
  onClearSeat: (assignmentId: string) => void;
  compact?: boolean;
  unpositioned?: { guest: Guest; assignment: Assignment }[];
  unassignedGuests?: Guest[];
  onPickGuest?: (guestId: string, seatIndex: number, isUnpositioned: boolean) => void;
}) => {
  const droppableId = `seat_${tableId}_${seatIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handlePickGuest = (guestId: string, isUnpositioned: boolean) => {
    onPickGuest?.(guestId, seatIndex, isUnpositioned);
    setPopoverOpen(false);
  };

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

  // Graphical seat slot (non-compact)
  const slotContent = (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center rounded-md border px-1 py-1 min-w-[48px] min-h-[36px] transition-all text-xs",
        guest
          ? "bg-accent/20 border-border"
          : "bg-muted/30 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50",
        isOver && "ring-2 ring-primary bg-primary/10 scale-105"
      )}
    >
      <span className="text-[8px] text-muted-foreground mb-0.5">{seatIndex}</span>
      {guest ? (
        <span className="text-[10px] font-medium">{getInitials(guest.first_name, guest.last_name)}</span>
      ) : (
        <User className="w-3 h-3 text-muted-foreground/40" />
      )}
    </div>
  );

  if (guest) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{slotContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {guest.first_name} {guest.last_name}
          {guest.dietary_restrictions && <span className="ml-1">🍽️</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Empty seat: click to pick guest
  if (!isLocked && onPickGuest) {
    const hasOptions = (unpositioned?.length ?? 0) > 0 || (unassignedGuests?.length ?? 0) > 0;
    if (hasOptions) {
      return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>{slotContent}</PopoverTrigger>
          <PopoverContent className="p-0 w-64" align="center">
            <Command>
              <CommandInput placeholder="Cerca ospite..." />
              <CommandList>
                <CommandEmpty>Nessun ospite trovato</CommandEmpty>
                {unpositioned && unpositioned.length > 0 && (
                  <CommandGroup heading="Non posizionati">
                    {unpositioned.map(({ guest: g }) => (
                      <CommandItem key={g.id} onSelect={() => handlePickGuest(g.id, true)}>
                        {g.first_name} {g.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {unassignedGuests && unassignedGuests.length > 0 && (
                  <CommandGroup heading="Da assegnare">
                    {unassignedGuests.map(g => (
                      <CommandItem key={g.id} onSelect={() => handlePickGuest(g.id, false)}>
                        {g.first_name} {g.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
  }

  return slotContent;
};

/* Draggable unpositioned guest chip */
const DraggableUnpositionedGuest = ({
  guest,
  assignment,
  isLocked,
  onUnassign,
}: {
  guest: Guest;
  assignment: Assignment;
  isLocked?: boolean;
  onUnassign: (assignmentId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-dashed border-amber-500/30 rounded text-xs cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-50"
      )}
    >
      <span className="truncate">{guest.first_name} {guest.last_name}</span>
      {!isLocked && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onUnassign(assignment.id); }}
          className="h-4 w-4 p-0"
        >
          <X className="w-2.5 h-2.5" />
        </Button>
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
  onAssignToSeat,
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

  // Unassigned guests (not assigned to any table)
  const assignedGuestIds = new Set(assignments.map(a => a.guest_id));
  const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));

  const halfCapacity = Math.ceil(capacity / 2);
  const sideA = Array.from({ length: halfCapacity }, (_, i) => i + 1);
  const sideB = Array.from({ length: capacity - halfCapacity }, (_, i) => halfCapacity + i + 1);

  const handleClearSeat = (assignmentId: string) => {
    onUpdateSeatPosition(assignmentId, null);
  };

  const handlePickGuest = (guestId: string, seatIndex: number, isUnpositioned: boolean) => {
    if (isUnpositioned) {
      // Find the assignment and update seat position
      const a = tableAssignments.find(a => a.guest_id === guestId);
      if (a) onUpdateSeatPosition(a.id, seatIndex);
    } else {
      // Assign from pool
      onAssignToSeat?.(guestId, seatIndex);
    }
  };

  // Positioned guests list
  const positioned = Array.from(seatMap.entries())
    .sort(([a], [b]) => a - b);

  const isCompact = capacity > 20;

  if (isCompact) {
    return (
      <div className="space-y-3">
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
                    onClearSeat={handleClearSeat}
                    compact
                  />
                ) : <div />}
              </div>
            );
          })}
        </div>

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
    <TooltipProvider delayDuration={200}>
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
                onClearSeat={handleClearSeat}
                unpositioned={unpositioned}
                unassignedGuests={unassignedGuests}
                onPickGuest={handlePickGuest}
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
                onClearSeat={handleClearSeat}
                unpositioned={unpositioned}
                unassignedGuests={unassignedGuests}
                onPickGuest={handlePickGuest}
              />
            ))}
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-1 px-2">
            <span className="text-[9px] text-muted-foreground uppercase">Lato A (1–{halfCapacity})</span>
            <span className="text-[9px] text-muted-foreground uppercase">Lato B ({halfCapacity + 1}–{capacity})</span>
          </div>
        </div>

        {/* Positioned list */}
        {positioned.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
              Posizionati ({positioned.length})
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 max-h-[200px] overflow-y-auto">
              {positioned.map(([seatIdx, { guest, assignment }]) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-1.5 text-xs py-0.5"
                >
                  <span className="text-muted-foreground font-mono w-4 text-right shrink-0">{seatIdx}.</span>
                  <span className="truncate flex-1">{guest.first_name} {guest.last_name}</span>
                  {guest.dietary_restrictions && <span className="text-[9px]">🍽️</span>}
                  {!isLocked && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleClearSeat(assignment.id)}
                      className="h-4 w-4 p-0 shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpositioned zone */}
        {unpositioned.length > 0 && (
          <UnpositionedZone
            unpositioned={unpositioned}
            isLocked={isLocked}
            onUnassign={onUnassign}
            draggable
          />
        )}
      </div>
    </TooltipProvider>
  );
};

const UnpositionedZone = ({
  unpositioned,
  isLocked,
  onUnassign,
  draggable,
}: {
  unpositioned: { guest: Guest; assignment: Assignment }[];
  isLocked?: boolean;
  onUnassign: (assignmentId: string) => void;
  draggable?: boolean;
}) => (
  <div className="border-t border-dashed pt-2">
    <p className="text-[10px] text-muted-foreground mb-1">
      Non posizionati ({unpositioned.length})
    </p>
    <div className="flex flex-wrap gap-1">
      {unpositioned.map(({ guest, assignment }) =>
        draggable ? (
          <DraggableUnpositionedGuest
            key={assignment.id}
            guest={guest}
            assignment={assignment}
            isLocked={isLocked}
            onUnassign={onUnassign}
          />
        ) : (
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
        )
      )}
    </div>
  </div>
);
