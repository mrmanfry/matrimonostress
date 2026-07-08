import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorForGroup } from "./v2/groupColors";
import type { GuestV2, TableV2 } from "./v2/types";

type SeatedGuest = GuestV2 & { seat_position: number | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableV2 | null;
  seated: SeatedGuest[];
  unassigned: GuestV2[];
  groupColorMap: Record<string, string>;
  onMoveToSeat: (guestId: string, tableId: string, newSeat: number) => void | Promise<void>;
  onAssignToSeat: (tableId: string, guestId: string, seat: number) => void | Promise<void>;
  onRemove: (guestId: string) => void;
}

const DRAG_SEATED = "seated:";
const DRAG_POOL = "pool:";
const DROP_SEAT = "impseat:";

/**
 * Full drag & drop editor for imperial-table seating.
 * - Drag a seated guest onto another seat: move or swap (across Lato A / Lato B).
 * - Drag from the "Da assegnare" pool: assign to that seat.
 * - X on a seat: remove that guest from the table.
 */
export function ImperialSeatEditorDialog({
  open,
  onOpenChange,
  table,
  seated,
  unassigned,
  groupColorMap,
  onMoveToSeat,
  onAssignToSeat,
  onRemove,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const capacity = table?.capacity ?? 0;
  const perSide = Math.ceil(capacity / 2);

  // Map seat_position -> guest; fill unpositioned into first free slots
  const seatMap = useMemo(() => {
    const arr: (SeatedGuest | null)[] = Array.from({ length: capacity }, () => null);
    const overflow: SeatedGuest[] = [];
    for (const g of seated) {
      const p = g.seat_position;
      if (typeof p === "number" && p >= 0 && p < capacity && !arr[p]) arr[p] = g;
      else overflow.push(g);
    }
    for (let i = 0; i < capacity && overflow.length; i++) {
      if (!arr[i]) arr[i] = overflow.shift()!;
    }
    return arr;
  }, [seated, capacity]);

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((g) =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q),
    );
  }, [unassigned, search]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = async (e: DragEndEvent) => {
    const activeIdStr = String(e.active.id);
    setActiveId(null);
    if (!e.over || !table) return;
    const overId = String(e.over.id);
    if (!overId.startsWith(DROP_SEAT)) return;
    const seat = parseInt(overId.slice(DROP_SEAT.length), 10);
    if (!Number.isFinite(seat)) return;

    if (activeIdStr.startsWith(DRAG_SEATED)) {
      const guestId = activeIdStr.slice(DRAG_SEATED.length);
      await onMoveToSeat(guestId, table.id, seat);
    } else if (activeIdStr.startsWith(DRAG_POOL)) {
      const guestId = activeIdStr.slice(DRAG_POOL.length);
      // Only assign to empty seat from pool (swap semantics only for seated).
      if (seatMap[seat]) return;
      await onAssignToSeat(table.id, guestId, seat);
    }
  };

  if (!table) return null;

  const sideA = seatMap.slice(0, perSide);
  const sideB = seatMap.slice(perSide);

  const activeGuest: GuestV2 | null = (() => {
    if (!activeId) return null;
    if (activeId.startsWith(DRAG_SEATED)) {
      const gid = activeId.slice(DRAG_SEATED.length);
      return seated.find((g) => g.id === gid) ?? null;
    }
    if (activeId.startsWith(DRAG_POOL)) {
      const gid = activeId.slice(DRAG_POOL.length);
      return unassigned.find((g) => g.id === gid) ?? null;
    }
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span style={{ fontFamily: "var(--font-serif)" }}>{table.name}</span>
            <Badge variant="secondary" className="text-[10px]">Imperiale</Badge>
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {seated.length}/{capacity} posti
            </span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Trascina un ospite su una sedia per spostarlo tra Lato A e Lato B. Se la sedia è occupata,
            i due ospiti si scambiano.
          </p>
        </DialogHeader>

        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-hidden grid md:grid-cols-[1fr_260px] grid-cols-1 min-h-0">
            {/* Canvas */}
            <div className="overflow-auto p-5">
              <div className="min-w-[560px] max-w-[820px] mx-auto">
                <SideLabel>Lato A</SideLabel>
                <SeatRow
                  seats={sideA}
                  startIndex={0}
                  groupColorMap={groupColorMap}
                  onRemove={onRemove}
                />
                <div
                  className="my-2 h-14 rounded-lg flex items-center justify-center text-[11px] uppercase tracking-[0.2em]"
                  style={{
                    background: "hsl(var(--muted) / 0.35)",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  Tavolo imperiale
                </div>
                <SeatRow
                  seats={sideB}
                  startIndex={perSide}
                  groupColorMap={groupColorMap}
                  onRemove={onRemove}
                />
                <SideLabel>Lato B</SideLabel>
              </div>
            </div>

            {/* Pool */}
            <aside
              className="border-t md:border-t-0 md:border-l flex flex-col min-h-0"
              style={{ background: "hsl(var(--muted) / 0.15)" }}
            >
              <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Da assegnare ({unassigned.length})
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca…"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
                <div className="flex flex-col gap-1">
                  {filteredPool.length === 0 && (
                    <div className="text-center text-[11px] italic text-muted-foreground py-4">
                      {unassigned.length === 0
                        ? "Tutti gli ospiti sono assegnati 🎉"
                        : "Nessuno corrisponde."}
                    </div>
                  )}
                  {filteredPool.map((g) => (
                    <PoolChip key={g.id} guest={g} groupColorMap={groupColorMap} />
                  ))}
                </div>
              </ScrollArea>
            </aside>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeGuest ? (
              <div
                className="px-2.5 py-1.5 rounded-md border bg-card shadow-lg text-xs font-medium inline-flex items-center gap-1.5"
                style={{ borderColor: "hsl(var(--primary))" }}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground" />
                {activeGuest.first_name} {activeGuest.last_name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="border-t px-5 py-3 flex justify-end shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const SideLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground text-center my-1.5">
    {children}
  </div>
);

const SeatRow = ({
  seats,
  startIndex,
  groupColorMap,
  onRemove,
}: {
  seats: (SeatedGuest | null)[];
  startIndex: number;
  groupColorMap: Record<string, string>;
  onRemove: (guestId: string) => void;
}) => (
  <div
    className="grid gap-2"
    style={{ gridTemplateColumns: `repeat(${Math.max(seats.length, 1)}, minmax(0, 1fr))` }}
  >
    {seats.map((g, i) => (
      <SeatSlot
        key={startIndex + i}
        seatIndex={startIndex + i}
        guest={g}
        groupColorMap={groupColorMap}
        onRemove={onRemove}
      />
    ))}
  </div>
);

const SeatSlot = ({
  seatIndex,
  guest,
  groupColorMap,
  onRemove,
}: {
  seatIndex: number;
  guest: SeatedGuest | null;
  groupColorMap: Record<string, string>;
  onRemove: (guestId: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: `${DROP_SEAT}${seatIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-lg min-h-[76px] px-1.5 py-2 flex flex-col items-center justify-center text-center transition-colors",
        isOver
          ? "border-2 border-primary bg-primary/10"
          : guest
          ? "border border-solid"
          : "border border-dashed",
      )}
      style={{
        borderColor: isOver
          ? undefined
          : guest
          ? colorForGroup(guest.group_id, groupColorMap)
          : "hsl(var(--border))",
        background: isOver
          ? undefined
          : guest
          ? "hsl(var(--card))"
          : "hsl(var(--muted) / 0.15)",
      }}
    >
      <div className="absolute top-1 left-1.5 text-[9px] font-mono text-muted-foreground">
        {seatIndex + 1}
      </div>
      {guest ? (
        <>
          <button
            type="button"
            onClick={() => onRemove(guest.id)}
            className="absolute top-1 right-1 h-4 w-4 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive inline-flex items-center justify-center"
            aria-label="Rimuovi dal tavolo"
          >
            <X className="w-3 h-3" />
          </button>
          <SeatedChip guest={guest} groupColorMap={groupColorMap} />
        </>
      ) : (
        <span className="text-[10px] italic text-muted-foreground">Libero</span>
      )}
    </div>
  );
};

const SeatedChip = ({
  guest,
  groupColorMap,
}: {
  guest: SeatedGuest;
  groupColorMap: Record<string, string>;
}) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${DRAG_SEATED}${guest.id}`,
  });
  const color = colorForGroup(guest.group_id, groupColorMap);
  const initials = `${guest.first_name[0] ?? ""}${guest.last_name[0] ?? ""}`.toUpperCase();
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none w-full",
        isDragging && "opacity-40",
      )}
    >
      <span
        className="rounded-full inline-flex items-center justify-center text-[10px] font-semibold"
        style={{ width: 26, height: 26, background: color + "22", color }}
      >
        {initials}
      </span>
      <span className="text-[11px] leading-tight line-clamp-2 max-w-full break-words">
        {guest.first_name} {guest.last_name}
      </span>
    </div>
  );
};

const PoolChip = ({
  guest,
  groupColorMap,
}: {
  guest: GuestV2;
  groupColorMap: Record<string, string>;
}) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${DRAG_POOL}${guest.id}`,
  });
  const color = colorForGroup(guest.group_id, groupColorMap);
  const initials = `${guest.first_name[0] ?? ""}${guest.last_name[0] ?? ""}`.toUpperCase();
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md border bg-card text-[12px] cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
      <span
        className="rounded-full inline-flex items-center justify-center text-[10px] font-semibold shrink-0"
        style={{ width: 20, height: 20, background: color + "22", color }}
      >
        {initials}
      </span>
      <span className="flex-1 min-w-0 truncate">
        {guest.first_name} {guest.last_name}
      </span>
    </div>
  );
};
