import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, X } from "lucide-react";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions?: string | null;
  is_child?: boolean;
  is_plus_one?: boolean;
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  table_type?: string;
};

type Assignment = {
  id: string;
  table_id: string;
  guest_id: string;
  seat_position?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table | null;
  assignments: Assignment[];
  guests: Guest[];
  unassignedGuests: Guest[];
  onAssign: (tableId: string, guestId: string, seatPosition: number) => void | Promise<void>;
  onUnassign: (assignmentId: string) => void;
}

export const MobileTableSheet = ({
  open,
  onOpenChange,
  table,
  assignments,
  guests,
  unassignedGuests,
  onAssign,
  onUnassign,
}: Props) => {
  const [search, setSearch] = useState("");

  if (!table) return null;

  const tableAssignments = assignments.filter((a) => a.table_id === table.id);
  const seated = tableAssignments
    .map((a) => ({ a, g: guests.find((x) => x.id === a.guest_id) }))
    .filter((x) => x.g);

  const remaining = table.capacity - tableAssignments.length;
  const isFull = remaining <= 0;

  const filtered = unassignedGuests.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${g.first_name} ${g.last_name}`.toLowerCase().includes(q);
  });

  const handleAdd = async (guestId: string) => {
    const usedSeats = new Set(
      tableAssignments.map((a) => a.seat_position).filter((s) => s != null) as number[]
    );
    let nextSeat = 0;
    for (let i = 0; i < table.capacity; i++) {
      if (!usedSeats.has(i)) {
        nextSeat = i;
        break;
      }
    }
    await onAssign(table.id, guestId, nextSeat);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-left">{table.name}</SheetTitle>
          <div className="text-xs text-muted-foreground text-left">
            {table.table_type === "imperial" ? "Imperiale" : "Tondo"} ·{" "}
            {tableAssignments.length}/{table.capacity} posti
            {remaining > 0 && <span className="text-[hsl(var(--status-confirmed))]"> · {remaining} liberi</span>}
            {isFull && <span className="text-destructive"> · pieno</span>}
          </div>
        </SheetHeader>

        {/* Seated */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Seduti ({seated.length})
          </div>
          <div className="max-h-[30vh] overflow-y-auto -mx-1 px-1">
            {seated.length === 0 ? (
              <div className="text-center text-xs italic text-muted-foreground py-3">
                Nessun ospite ancora.
              </div>
            ) : (
              seated.map(({ a, g }) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/40 border-b last:border-b-0"
                >
                  <span className="flex-1 text-sm truncate">
                    {g!.first_name} {g!.last_name}
                  </span>
                  {g!.dietary_restrictions && (
                    <span className="text-xs">🍽️</span>
                  )}
                  {g!.is_child && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      👶
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUnassign(a.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add */}
        <div className="border-t bg-muted/20 flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Aggiungi ospite
            </div>
            <span className="text-[11px] text-muted-foreground">
              {unassignedGuests.length} da assegnare
            </span>
          </div>
          {unassignedGuests.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Tutti gli ospiti sono già assegnati 🎉
            </div>
          ) : (
            <>
              <div className="px-4 pb-2 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca…"
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
                {filtered.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    Nessuno corrisponde.
                  </div>
                ) : (
                  filtered.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md border bg-card text-sm"
                    >
                      <span className="flex-1 truncate">
                        {g.first_name} {g.last_name}
                      </span>
                      {g.dietary_restrictions && (
                        <span className="text-xs">🍽️</span>
                      )}
                      <Button
                        size="sm"
                        variant={isFull ? "ghost" : "default"}
                        disabled={isFull}
                        className="h-7 text-xs px-2.5"
                        onClick={() => handleAdd(g.id)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {isFull ? "Pieno" : "Aggiungi"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
