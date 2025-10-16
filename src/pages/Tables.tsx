import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download, Heart, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { GuestPool } from "@/components/tables/GuestPool";
import { TableCanvas } from "@/components/tables/TableCanvas";
import { ConflictManager } from "@/components/tables/ConflictManager";
import { generateTableReport } from "@/utils/pdfHelpers";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  dietary_restrictions: string | null;
  menu_choice: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
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
  id: string;
  guest_id_1: string;
  guest_id_2: string;
};

const Tables = () => {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWeddingData();
  }, []);

  const fetchWeddingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (weddingData) {
        setWeddingId(weddingData.id);
        await Promise.all([
          fetchGuests(weddingData.id),
          fetchTables(weddingData.id),
          fetchAssignments(weddingData.id),
          fetchConflicts(weddingData.id),
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async (weddingId: string) => {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("rsvp_status", "confirmed");
    if (data) setGuests(data);
  };

  const fetchTables = async (weddingId: string) => {
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("wedding_id", weddingId);
    if (data) setTables(data);
  };

  const fetchAssignments = async (weddingId: string) => {
    const { data } = await supabase
      .from("table_assignments")
      .select("*, tables!inner(wedding_id)")
      .eq("tables.wedding_id", weddingId);
    if (data) setAssignments(data.map(a => ({ id: a.id, table_id: a.table_id, guest_id: a.guest_id })));
  };

  const fetchConflicts = async (weddingId: string) => {
    const { data } = await supabase
      .from("guest_conflicts")
      .select("*")
      .eq("wedding_id", weddingId);
    if (data) setConflicts(data);
  };

  const createTable = async () => {
    if (!weddingId) return;

    const tableNumber = tables.length + 1;
    const { error } = await supabase.from("tables").insert({
      wedding_id: weddingId,
      name: `Tavolo ${tableNumber}`,
      capacity: 8,
      position_x: 100 + (tableNumber * 50),
      position_y: 100 + (tableNumber * 50),
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare il tavolo", variant: "destructive" });
    } else {
      toast({ title: "Tavolo creato" });
      fetchTables(weddingId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !weddingId) return;

    const guestId = active.id as string;
    const tableId = over.id as string;

    // Check if dropping on a table
    if (!tables.find(t => t.id === tableId)) return;

    // Check for conflicts
    const currentAssignments = assignments.filter(a => a.table_id === tableId);
    const assignedGuestIds = currentAssignments.map(a => a.guest_id);

    const hasConflict = conflicts.some(c => {
      const isGuest1 = c.guest_id_1 === guestId && assignedGuestIds.includes(c.guest_id_2);
      const isGuest2 = c.guest_id_2 === guestId && assignedGuestIds.includes(c.guest_id_1);
      return isGuest1 || isGuest2;
    });

    if (hasConflict) {
      toast({
        title: "Conflitto rilevato!",
        description: "Questo invitato non può essere seduto vicino a qualcuno già al tavolo",
        variant: "destructive",
      });
      return;
    }

    // Remove existing assignment if any
    const existingAssignment = assignments.find(a => a.guest_id === guestId);
    if (existingAssignment) {
      await supabase.from("table_assignments").delete().eq("id", existingAssignment.id);
    }

    // Create new assignment
    const { error } = await supabase.from("table_assignments").insert({
      table_id: tableId,
      guest_id: guestId,
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile assegnare l'invitato", variant: "destructive" });
    } else {
      fetchAssignments(weddingId);
    }
  };

  const exportToPDF = () => {
    if (tables.length === 0) {
      toast({ 
        title: "Attenzione",
        description: "Non ci sono tavoli da esportare", 
        variant: "destructive" 
      });
      return;
    }

    // Prepara i dati nel formato richiesto
    const tableData = tables.map(table => {
      const tableGuests = assignments
        .filter(a => a.table_id === table.id)
        .map(a => guests.find(g => g.id === a.guest_id))
        .filter((g): g is Guest => g !== undefined)
        .map(g => ({
          first_name: g.first_name,
          last_name: g.last_name,
          menu_choice: g.menu_choice,
          dietary_restrictions: g.dietary_restrictions,
          notes: g.notes,
        }));

      return {
        name: table.name,
        capacity: table.capacity,
        guests: tableGuests,
      };
    });

    generateTableReport(tableData);
    toast({ title: "Report tavoli generato!" });
  };

  const unassignedGuests = guests.filter(
    g => !assignments.some(a => a.guest_id === g.id)
  );

  const totalGuests = guests.reduce((sum, g) => sum + g.adults_count + g.children_count, 0);
  const assignedCount = assignments.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Disposizione Tavoli</h1>
            <p className="text-muted-foreground mt-1">
              Invitati da assegnare: {unassignedGuests.length} su {totalGuests}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setConflictDialogOpen(true)} variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Gestisci Conflitti
            </Button>
            <Button onClick={createTable}>
              <Plus className="w-4 h-4 mr-2" />
              Crea Tavolo
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Esporta PDF
            </Button>
          </div>
        </div>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <GuestPool guests={unassignedGuests} />
            </div>
            <div className="lg:col-span-3">
              <TableCanvas
                tables={tables}
                guests={guests}
                assignments={assignments}
                conflicts={conflicts}
                weddingId={weddingId}
                onUpdate={() => weddingId && fetchTables(weddingId)}
                onUnassign={(assignmentId) => {
                  supabase.from("table_assignments").delete().eq("id", assignmentId).then(() => {
                    weddingId && fetchAssignments(weddingId);
                  });
                }}
              />
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <Card className="p-3 bg-card shadow-lg opacity-80">
                {(() => {
                  const guest = guests.find(g => g.id === activeId);
                  return guest ? `${guest.first_name} ${guest.last_name}` : null;
                })()}
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>

        <ConflictManager
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          guests={guests}
          conflicts={conflicts}
          weddingId={weddingId}
          onUpdate={() => weddingId && fetchConflicts(weddingId)}
        />
      </div>
    </div>
  );
};

export default Tables;
