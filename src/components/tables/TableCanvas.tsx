import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { ImperialTableLayout } from "./ImperialTableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  AlertTriangle, 
  Edit2, 
  Check, 
  Lock, 
  Unlock,
  Eraser,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions?: string | null;
  category?: string | null;
  is_plus_one?: boolean;
  plus_one_of_guest_id?: string;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  position_x: number;
  position_y: number;
  shape?: string;
  table_type?: string;
  is_locked?: boolean;
};

type Assignment = {
  id: string;
  table_id: string;
  guest_id: string;
  seat_position?: number | null;
};

type Conflict = {
  guest_id_1: string;
  guest_id_2: string;
};

type TableCanvasProps = {
  tables: Table[];
  guests: Guest[];
  assignments: Assignment[];
  conflicts: Conflict[];
  weddingId: string | null;
  onUpdate: () => void;
  onUnassign: (assignmentId: string) => void;
  onClearTable?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  onUpdateSeatPosition?: (assignmentId: string, seatPosition: number | null) => void;
  onAssignToSeat?: (tableId: string, guestId: string, seatPosition: number) => void;
  proposedAssignments?: { tableId: string; guestIds: string[] }[];
  isProposalMode?: boolean;
  isMobile?: boolean;
  showConfirmedOnly?: boolean;
};

const DroppableTable = ({
  table,
  guests,
  assignments,
  conflicts,
  onUpdate,
  onUnassign,
  onClearTable,
  onDeleteTable,
  onUpdateSeatPosition,
  onAssignToSeat,
  proposedGuestIds,
  isProposalMode,
  showConfirmedOnly,
}: {
  table: Table;
  guests: Guest[];
  assignments: Assignment[];
  conflicts: Conflict[];
  onUpdate: () => void;
  onUnassign: (assignmentId: string) => void;
  onClearTable?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  onUpdateSeatPosition?: (assignmentId: string, seatPosition: number | null) => void;
  onAssignToSeat?: (tableId: string, guestId: string, seatPosition: number) => void;
  proposedGuestIds?: string[];
  isProposalMode?: boolean;
  showConfirmedOnly?: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(table.capacity.toString());
  const { toast } = useToast();

  const tableAssignments = assignments.filter(a => a.table_id === table.id);
  const tableGuests = tableAssignments
    .map(a => ({ assignment: a, guest: guests.find(g => g.id === a.guest_id) }))
    .filter(({ guest }) => guest);

  const proposedGuests = proposedGuestIds
    ?.filter(id => !tableAssignments.some(a => a.guest_id === id))
    .map(id => guests.find(g => g.id === id))
    .filter((g): g is Guest => g !== undefined) || [];

  // Phantom +1: guests with allow_plus_one who don't have a real +1 assigned to this table
  const phantomPlusOnes = tableGuests.filter(({ guest }) =>
    guest!.allow_plus_one &&
    !tableGuests.some(tg => tg.guest?.is_plus_one && tg.guest?.plus_one_of_guest_id === guest!.id) &&
    (!showConfirmedOnly || (guest!.plus_one_name?.trim()))
  );

  const totalGuests = tableGuests.length + proposedGuests.length + phantomPlusOnes.length;
  const assignedGuestIds = [...tableGuests.map(({ guest }) => guest!.id), ...proposedGuestIds || []];
  
  const hasConflicts = conflicts.some(c => {
    const has1 = assignedGuestIds.includes(c.guest_id_1);
    const has2 = assignedGuestIds.includes(c.guest_id_2);
    return has1 && has2;
  });

  const isOverCapacity = totalGuests > table.capacity;
  const fillRate = (totalGuests / table.capacity) * 100;
  

  const handleSave = async () => {
    const { error } = await supabase
      .from("tables")
      .update({ name, capacity: parseInt(capacity) })
      .eq("id", table.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare il tavolo", variant: "destructive" });
    } else {
      setEditing(false);
      onUpdate();
    }
  };

  const handleToggleLock = async () => {
    const { error } = await supabase
      .from("tables")
      .update({ is_locked: !table.is_locked })
      .eq("id", table.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile cambiare lo stato", variant: "destructive" });
    } else {
      onUpdate();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      className={`p-4 min-h-[180px] transition-all relative ${
        isOver ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""
      } ${hasConflicts ? "border-2 border-destructive" : ""} ${
        isOverCapacity ? "border-2 border-amber-500" : ""
      } ${table.is_locked ? "opacity-75 bg-muted/50" : ""} ${
        isProposalMode ? "border-dashed border-2 border-primary/50" : ""
      }`}
    >
      {/* Shape indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Per-table actions menu */}
        {(onClearTable || onDeleteTable) && !isProposalMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onClearTable && tableGuests.length > 0 && (
                <DropdownMenuItem onClick={() => onClearTable(table.id)} className="gap-2">
                  <Eraser className="w-4 h-4" />
                  Svuota Tavolo
                </DropdownMenuItem>
              )}
              {onDeleteTable && (
                <>
                  {tableGuests.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => onDeleteTable(table.id)} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4" />
                    Elimina Tavolo
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Lock indicator */}
      {table.is_locked && (
        <div className="absolute top-2 left-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex items-center justify-between mb-3 pr-12">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="h-8 w-16 text-sm"
            />
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h3 className="font-semibold">{table.name}</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-6 w-6 p-0">
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleToggleLock} className="h-6 w-6 p-0">
                {table.is_locked ? (
                  <Unlock className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        )}
        <Badge variant={isOverCapacity ? "destructive" : "secondary"}>
          {totalGuests}/{table.capacity}
        </Badge>
      </div>

      <Progress 
        value={Math.min(fillRate, 100)} 
        className={`h-1 mb-1 ${fillRate > 100 ? '[&>div]:bg-destructive' : fillRate > 80 ? '[&>div]:bg-primary' : ''}`}
      />
      <p className="text-[10px] italic text-muted-foreground mb-3">
        {table.table_type === 'imperial' ? 'Tavolo imperiale' : 'Tavolo tondo'}
      </p>

      {hasConflicts && (
        <div className="mb-2 p-2 bg-destructive/10 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-xs text-destructive">Conflitti rilevati!</span>
        </div>
      )}

      {isOverCapacity && !hasConflicts && (
        <div className="mb-2 p-2 bg-amber-500/10 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-xs text-amber-600">Capacità superata</span>
        </div>
      )}

      {table.table_type === 'imperial' && onUpdateSeatPosition ? (
        <ImperialTableLayout
          tableId={table.id}
          capacity={table.capacity}
          guests={guests}
          assignments={assignments}
          isLocked={table.is_locked}
          onUnassign={onUnassign}
          onUpdateSeatPosition={onUpdateSeatPosition}
          onAssignToSeat={onAssignToSeat ? (guestId, seatPos) => onAssignToSeat(table.id, guestId, seatPos) : undefined}
        />
      ) : (
        <div className="space-y-1">
          {tableGuests.map(({ assignment, guest }) => {
            const isPlusOne = guest!.is_plus_one;
            const plusOneOfName = isPlusOne && guest!.plus_one_of_guest_id
              ? (() => {
                  const orig = guests.find(g => g.id === guest!.plus_one_of_guest_id);
                  return orig ? `${orig.first_name}` : null;
                })()
              : null;

            const assignedPlusOne = !isPlusOne && guest!.allow_plus_one && guest!.plus_one_name?.trim()
              ? (() => {
                  const plusOneId = `plusone_${guest!.id}`;
                  const plusOneAssigned = tableGuests.find(tg => tg.guest?.id === plusOneId);
                  if (plusOneAssigned) return null;
                  const realPlusOne = tableGuests.find(tg => 
                    tg.guest?.is_plus_one && tg.guest?.plus_one_of_guest_id === guest!.id
                  );
                  return realPlusOne ? null : guest!.plus_one_name;
                })()
              : null;

            return (
              <div key={assignment.id}>
                <div className="flex items-center justify-between p-2 bg-accent/10 rounded text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isPlusOne && (
                      <Badge variant="outline" className="text-[10px] shrink-0 px-1">+1</Badge>
                    )}
                    <span className="truncate">
                      {guest!.first_name} {guest!.last_name}
                    </span>
                    {isPlusOne && plusOneOfName && (
                      <span className="text-[10px] text-muted-foreground shrink-0">di {plusOneOfName}</span>
                    )}
                    {guest!.dietary_restrictions && (
                      <Badge variant="outline" className="text-[10px] shrink-0">🍽️</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUnassign(assignment.id)}
                    className="h-6 w-6 p-0 shrink-0"
                    disabled={table.is_locked}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {assignedPlusOne && (
                  <div className="flex items-center gap-2 p-1.5 pl-6 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1">+1</Badge>
                    <span className="truncate">{assignedPlusOne}</span>
                    <span className="text-[10px]">(non assegnato)</span>
                  </div>
                )}
              </div>
            );
          })}

          {proposedGuests.map(guest => (
            <div
              key={guest.id}
              className="flex items-center justify-between p-2 bg-primary/10 border border-dashed border-primary/30 rounded text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate text-primary">
                  ✨ {guest.first_name} {guest.last_name}
                </span>
              </div>
            </div>
          ))}

          {phantomPlusOnes.map(({ guest }) => (
            <div
              key={`phantom_${guest!.id}`}
              className="flex items-center gap-2 p-2 border border-dashed border-muted-foreground/30 rounded text-sm bg-muted/30"
            >
              <Badge variant="outline" className="text-[10px] shrink-0 px-1">+1</Badge>
              <span className="truncate text-muted-foreground italic">
                {guest!.plus_one_name?.trim()
                  ? guest!.plus_one_name
                  : `${guest!.first_name} ${guest!.last_name}`}
              </span>
              {!guest!.plus_one_name?.trim() && (
                <span className="text-[10px] text-muted-foreground shrink-0">(previsto)</span>
              )}
            </div>
          ))}

          {totalGuests === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {table.is_locked ? "🔒 Tavolo bloccato" : "Trascina qui gli invitati"}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export const TableCanvas = ({
  tables,
  guests,
  assignments,
  conflicts,
  weddingId,
  onUpdate,
  onUnassign,
  onClearTable,
  onDeleteTable,
  onUpdateSeatPosition,
  onAssignToSeat,
  proposedAssignments,
  isProposalMode,
  isMobile,
  showConfirmedOnly,
}: TableCanvasProps) => {
  const standardTables = tables.filter(t => t.table_type !== 'imperial');
  const imperialTables = tables.filter(t => t.table_type === 'imperial');

  return (
    <Card className={`p-4 md:p-6 ${isMobile ? 'min-h-[60vh]' : 'min-h-[calc(100vh-200px)]'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Sala ({tables.length} tavoli)
        </h2>
        {isProposalMode && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
            ✨ Anteprima AI
          </Badge>
        )}
      </div>

      {imperialTables.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-2">Tavoli Imperiali</p>
          <div className="grid grid-cols-1 gap-4">
            {imperialTables.map(table => {
              const proposed = proposedAssignments?.find(p => p.tableId === table.id);
              return (
                <DroppableTable
                  key={table.id}
                  table={table}
                  guests={guests}
                  assignments={assignments}
                  conflicts={conflicts}
                  onUpdate={onUpdate}
                  onUnassign={onUnassign}
                  onClearTable={onClearTable}
                  onDeleteTable={onDeleteTable}
                  onUpdateSeatPosition={onUpdateSeatPosition}
                  onAssignToSeat={onAssignToSeat}
                  proposedGuestIds={proposed?.guestIds}
                  isProposalMode={isProposalMode}
                  showConfirmedOnly={showConfirmedOnly}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {standardTables.map(table => {
          const proposed = proposedAssignments?.find(p => p.tableId === table.id);
          return (
            <DroppableTable
              key={table.id}
              table={table}
              guests={guests}
              assignments={assignments}
              conflicts={conflicts}
              onUpdate={onUpdate}
              onUnassign={onUnassign}
              onClearTable={onClearTable}
              onDeleteTable={onDeleteTable}
              proposedGuestIds={proposed?.guestIds}
              isProposalMode={isProposalMode}
              showConfirmedOnly={showConfirmedOnly}
            />
          );
        })}
        {tables.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">
            Nessun tavolo creato. Clicca "Crea Tavolo" per iniziare.
          </p>
        )}
      </div>
    </Card>
  );
};
