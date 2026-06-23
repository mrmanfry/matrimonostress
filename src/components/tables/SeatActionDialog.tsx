import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SeatedGuest = {
  id: string;
  first_name: string;
  last_name: string;
  seat_position?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Guest being acted on */
  guest: { id: string; first_name: string; last_name: string } | null;
  /** Current seat (0-indexed) of the guest, if any */
  currentSeat: number | null;
  /** Table info */
  tableId: string | null;
  tableName?: string;
  capacity: number;
  isImperial: boolean;
  /** All seated guests at this table (used to show occupants in the grid) */
  seated: SeatedGuest[];
  onMoveToSeat: (guestId: string, tableId: string, newSeat: number) => void | Promise<void>;
  onRemove: (guestId: string) => void | Promise<void>;
}

/**
 * Modal to move a seated guest to a different seat (swap on same table)
 * or remove them from the table.
 */
export const SeatActionDialog = ({
  open,
  onOpenChange,
  guest,
  currentSeat,
  tableId,
  tableName,
  capacity,
  isImperial,
  seated,
  onMoveToSeat,
  onRemove,
}: Props) => {
  if (!guest || !tableId) return null;

  const perSide = Math.ceil(capacity / 2);
  const sideA = Array.from({ length: perSide }, (_, i) => i);
  const sideB = Array.from({ length: capacity - perSide }, (_, i) => perSide + i);

  const occupantAt = (seat: number) =>
    seated.find((s) => s.seat_position === seat && s.id !== guest.id) || null;

  const handlePick = async (seat: number) => {
    if (seat === currentSeat) {
      onOpenChange(false);
      return;
    }
    await onMoveToSeat(guest.id, tableId, seat);
    onOpenChange(false);
  };

  const handleRemove = async () => {
    await onRemove(guest.id);
    onOpenChange(false);
  };

  const renderSeatGrid = (seats: number[]) => (
    <div className="grid grid-cols-2 gap-1.5">
      {seats.map((seat) => {
        const occ = occupantAt(seat);
        const isCurrent = seat === currentSeat;
        return (
          <button
            key={seat}
            type="button"
            onClick={() => handlePick(seat)}
            disabled={isCurrent}
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-md border text-left text-xs transition-colors min-h-[44px]",
              isCurrent
                ? "bg-primary/10 border-primary/40 cursor-default"
                : occ
                ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/15"
                : "bg-muted/20 border-dashed border-muted-foreground/30 hover:bg-primary/10 hover:border-primary/40"
            )}
          >
            <span className="font-mono text-muted-foreground w-5 shrink-0 text-right">
              {seat + 1}
            </span>
            <span className="truncate flex-1">
              {isCurrent ? (
                <span className="text-primary font-medium">Qui ora</span>
              ) : occ ? (
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{occ.first_name} {occ.last_name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">Libero</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guest.first_name} {guest.last_name}
          </DialogTitle>
          <DialogDescription>
            {tableName ? `Tavolo ${tableName}` : "Tavolo"}
            {currentSeat != null ? ` · attualmente al posto ${currentSeat + 1}` : ""}
            <br />
            Tocca un posto per spostare l'ospite. Se il posto è già occupato, i due ospiti verranno scambiati.
          </DialogDescription>
        </DialogHeader>

        {isImperial ? (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Lato A
              </p>
              {renderSeatGrid(sideA)}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Lato B
              </p>
              {renderSeatGrid(sideB)}
            </div>
          </div>
        ) : (
          renderSeatGrid(Array.from({ length: capacity }, (_, i) => i))
        )}

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemove}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Rimuovi dal tavolo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
