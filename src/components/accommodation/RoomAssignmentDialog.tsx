import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus } from "lucide-react";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string | null;
}

interface RoomAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  capacity: number;
  guests: Guest[];
  assignedGuestIds: string[];
  allAssignedGuestIds: Set<string>;
  onSave: (guestIds: string[]) => void;
  loading?: boolean;
}

export const RoomAssignmentDialog = ({
  open, onOpenChange, roomName, capacity, guests, assignedGuestIds,
  allAssignedGuestIds, onSave, loading
}: RoomAssignmentDialogProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Init selection when dialog opens
  useState(() => {
    if (open) {
      setSelected(assignedGuestIds);
      setSearch("");
    }
  });

  // Reset on open
  useMemo(() => {
    if (open) {
      setSelected(assignedGuestIds);
      setSearch("");
    }
  }, [open, assignedGuestIds]);

  const filteredGuests = useMemo(() => {
    const q = search.toLowerCase();
    return guests.filter(g => 
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
    );
  }, [guests, search]);

  const toggle = (guestId: string) => {
    setSelected(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId) 
        : prev.length < capacity ? [...prev, guestId] : prev
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assegna ospiti — {roomName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selected.length}/{capacity} posti occupati
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ospite..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-1">
            {filteredGuests.map(guest => {
              const isSelected = selected.includes(guest.id);
              const isAssignedElsewhere = allAssignedGuestIds.has(guest.id) && !assignedGuestIds.includes(guest.id);
              const isFull = selected.length >= capacity && !isSelected;
              return (
                <label
                  key={guest.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                    isAssignedElsewhere ? "opacity-50" : ""
                  } ${isFull && !isAssignedElsewhere ? "opacity-40" : ""}`}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isAssignedElsewhere || (isFull && !isSelected)}
                    onCheckedChange={() => toggle(guest.id)}
                  />
                  <span className="flex-1 text-sm">
                    {guest.first_name} {guest.last_name}
                  </span>
                  {isAssignedElsewhere && (
                    <Badge variant="secondary" className="text-[10px]">Già assegnato</Badge>
                  )}
                  {guest.rsvp_status === "confirmed" && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Confermato</Badge>
                  )}
                </label>
              );
            })}
            {filteredGuests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nessun ospite trovato</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => onSave(selected)} disabled={loading}>
            Salva ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
