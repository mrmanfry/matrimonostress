import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle, Edit2, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
};

type Table = {
  id: string;
  name: string;
  capacity: number;
  position_x: number;
  position_y: number;
};

type Assignment = {
  id: string;
  table_id: string;
  guest_id: string;
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
};

const DroppableTable = ({
  table,
  guests,
  assignments,
  conflicts,
  onUpdate,
  onUnassign,
}: {
  table: Table;
  guests: Guest[];
  assignments: Assignment[];
  conflicts: Conflict[];
  onUpdate: () => void;
  onUnassign: (assignmentId: string) => void;
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

  const assignedGuestIds = tableGuests.map(({ guest }) => guest!.id);
  const hasConflicts = conflicts.some(c => {
    const has1 = assignedGuestIds.includes(c.guest_id_1);
    const has2 = assignedGuestIds.includes(c.guest_id_2);
    return has1 && has2;
  });

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

  return (
    <Card
      ref={setNodeRef}
      className={`p-4 min-h-[200px] transition-all ${
        isOver ? "ring-2 ring-accent shadow-lg scale-105" : ""
      } ${hasConflicts ? "border-2 border-red-500" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
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
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Edit2 className="w-3 h-3" />
            </Button>
          </div>
        )}
        <Badge variant={tableGuests.length > table.capacity ? "destructive" : "secondary"}>
          {tableGuests.length}/{table.capacity}
        </Badge>
      </div>

      {hasConflicts && (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-950 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs text-red-600 dark:text-red-400">Conflitti rilevati!</span>
        </div>
      )}

      <div className="space-y-1">
        {tableGuests.map(({ assignment, guest }) => (
          <div
            key={assignment.id}
            className="flex items-center justify-between p-2 bg-accent/10 rounded text-sm"
          >
            <span>
              {guest!.first_name} {guest!.last_name}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnassign(assignment.id)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {tableGuests.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Trascina qui gli invitati
          </p>
        )}
      </div>
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
}: TableCanvasProps) => {
  return (
    <Card className="p-6 min-h-[calc(100vh-200px)]">
      <h2 className="text-lg font-semibold mb-4">Sala ({tables.length} tavoli)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <DroppableTable
            key={table.id}
            table={table}
            guests={guests}
            assignments={assignments}
            conflicts={conflicts}
            onUpdate={onUpdate}
            onUnassign={onUnassign}
          />
        ))}
        {tables.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">
            Nessun tavolo creato. Clicca "Crea Tavolo" per iniziare.
          </p>
        )}
      </div>
    </Card>
  );
};
