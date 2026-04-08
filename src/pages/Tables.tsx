import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Heart, Users, Sparkles, ToggleLeft, ToggleRight, Trash2, Eraser, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { GuestPool } from "@/components/tables/GuestPool";
import { TableCanvas } from "@/components/tables/TableCanvas";
import { ConflictManager } from "@/components/tables/ConflictManager";
import { SmartGrouperWizard } from "@/components/tables/SmartGrouperWizard";
import { calculateTotalVendorStaff } from "@/lib/expectedCalculator";
import { generateTableReport } from "@/utils/pdfHelpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  rsvp_status: string;
  dietary_restrictions: string | null;
  menu_choice: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
  party_id?: string | null;
  group_id?: string | null;
  category?: string | null;
  is_child: boolean;
  is_staff?: boolean;
  is_couple_member?: boolean;
  save_the_date_sent_at: string | null;
  std_response: string | null;
  phone?: string | null;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
  plus_one_menu?: string | null;
  is_plus_one?: boolean;
  plus_one_of_guest_id?: string;
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
};

type Conflict = {
  id: string;
  guest_id_1: string;
  guest_id_2: string;
};

type WeddingTargets = {
  target_adults: number;
  target_children: number;
  target_staff: number;
};

const Tables = () => {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showConfirmedOnly, setShowConfirmedOnly] = useState(true);
  const [weddingTargets, setWeddingTargets] = useState<WeddingTargets | null>(null);
  const [vendorStaffTotal, setVendorStaffTotal] = useState(0);
  const [bulkAction, setBulkAction] = useState<'clear_all' | 'delete_all' | null>(null);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchWeddingData();
  }, []);

  useEffect(() => {
    if (weddingId) {
      fetchGuests(weddingId);
    }
  }, [showConfirmedOnly, weddingId]);

  const fetchWeddingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id, target_adults, target_children, target_staff")
        .eq("created_by", user.id)
        .maybeSingle();

      if (weddingData) {
        setWeddingId(weddingData.id);
        setWeddingTargets({
          target_adults: weddingData.target_adults || 0,
          target_children: weddingData.target_children || 0,
          target_staff: weddingData.target_staff || 0,
        });
        await Promise.all([
          fetchGuests(weddingData.id),
          fetchAllGuests(weddingData.id),
          fetchTables(weddingData.id),
          fetchAssignments(weddingData.id),
          fetchConflicts(weddingData.id),
          fetchVendorStaff(weddingData.id),
          fetchPartyNames(weddingData.id),
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async (weddingId: string) => {
    let query = supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId);
    
    if (showConfirmedOnly) {
      query = query.or("rsvp_status.eq.confirmed,rsvp_status.eq.Confermato");
    }
    
    const { data } = await query;
    if (data) {
      // Generate virtual +1 entries for guests with plus_one_name
      const realGuests: Guest[] = data;
      const plusOneVirtuals: Guest[] = data
        .filter(g => g.allow_plus_one && g.plus_one_name?.trim())
        .map(g => {
          const nameParts = g.plus_one_name!.trim().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || g.last_name;
          return {
            id: `plusone_${g.id}`,
            first_name: firstName,
            last_name: lastName,
            rsvp_status: g.rsvp_status,
            dietary_restrictions: null,
            menu_choice: g.plus_one_menu || null,
            notes: null,
            adults_count: 1,
            children_count: 0,
            party_id: g.party_id,
            group_id: g.group_id,
            category: g.category,
            is_child: false,
            is_staff: false,
            is_couple_member: false,
            save_the_date_sent_at: null,
            std_response: null,
            phone: null,
            allow_plus_one: false,
            plus_one_name: null,
            is_plus_one: true,
            plus_one_of_guest_id: g.id,
          } as Guest;
        });
      setGuests([...realGuests, ...plusOneVirtuals]);
    }
  };

  const fetchAllGuests = async (weddingId: string) => {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId);
    if (data) {
      const plusOneVirtuals: Guest[] = data
        .filter(g => g.allow_plus_one && g.plus_one_name?.trim())
        .map(g => {
          const nameParts = g.plus_one_name!.trim().split(/\s+/);
          return {
            id: `plusone_${g.id}`,
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(" ") || g.last_name,
            rsvp_status: g.rsvp_status,
            dietary_restrictions: null,
            menu_choice: g.plus_one_menu || null,
            notes: null,
            adults_count: 1,
            children_count: 0,
            party_id: g.party_id,
            group_id: g.group_id,
            category: g.category,
            is_child: false,
            is_staff: false,
            is_couple_member: false,
            save_the_date_sent_at: null,
            std_response: null,
            is_plus_one: true,
            plus_one_of_guest_id: g.id,
          } as Guest;
        });
      setAllGuests([...data, ...plusOneVirtuals]);
    }
  };

  const fetchVendorStaff = async (weddingId: string) => {
    const { data } = await supabase
      .from("vendors")
      .select("staff_meals_count")
      .eq("wedding_id", weddingId);
    if (data) setVendorStaffTotal(calculateTotalVendorStaff(data));
  };

  const fetchTables = async (weddingId: string) => {
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: true });
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

  const fetchPartyNames = async (weddingId: string) => {
    const { data } = await supabase
      .from("invite_parties")
      .select("id, party_name")
      .eq("wedding_id", weddingId);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(p => { map[p.id] = p.party_name; });
      setPartyNames(map);
    }
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

  const handleClearAllAssignments = async () => {
    if (!weddingId) return;
    const tableIds = tables.map(t => t.id);
    if (tableIds.length === 0) return;

    const { error } = await supabase
      .from("table_assignments")
      .delete()
      .in("table_id", tableIds);

    if (error) {
      toast({ title: "Errore", description: "Impossibile svuotare i tavoli", variant: "destructive" });
    } else {
      toast({ title: "Tutti i tavoli svuotati", description: "Gli ospiti sono tornati nel pool." });
      fetchAssignments(weddingId);
    }
    setBulkAction(null);
  };

  const handleDeleteAll = async () => {
    if (!weddingId) return;
    const tableIds = tables.map(t => t.id);

    if (tableIds.length > 0) {
      await supabase.from("table_assignments").delete().in("table_id", tableIds);
    }
    const { error } = await supabase.from("tables").delete().eq("wedding_id", weddingId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare i tavoli", variant: "destructive" });
    } else {
      toast({ title: "Reset completo", description: "Tutti i tavoli e le assegnazioni sono stati eliminati." });
      await Promise.all([fetchTables(weddingId), fetchAssignments(weddingId)]);
    }
    setBulkAction(null);
  };

  const handleClearTable = async (tableId: string) => {
    if (!weddingId) return;
    const { error } = await supabase.from("table_assignments").delete().eq("table_id", tableId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile svuotare il tavolo", variant: "destructive" });
    } else {
      toast({ title: "Tavolo svuotato" });
      fetchAssignments(weddingId);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!weddingId) return;
    await supabase.from("table_assignments").delete().eq("table_id", tableId);
    const { error } = await supabase.from("tables").delete().eq("id", tableId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il tavolo", variant: "destructive" });
    } else {
      toast({ title: "Tavolo eliminato" });
      await Promise.all([fetchTables(weddingId), fetchAssignments(weddingId)]);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !weddingId) return;

    let guestId = active.id as string;
    const tableId = over.id as string;

    if (!tables.find(t => t.id === tableId)) return;

    // If it's a virtual +1, create a real guest record first
    if (guestId.startsWith("plusone_")) {
      const originalGuestId = guestId.replace("plusone_", "");
      const virtualGuest = guests.find(g => g.id === guestId);
      const originalGuest = guests.find(g => g.id === originalGuestId);
      if (!virtualGuest || !originalGuest) return;

      const { data: newGuest, error: createError } = await supabase
        .from("guests")
        .insert({
          wedding_id: weddingId,
          first_name: virtualGuest.first_name,
          last_name: virtualGuest.last_name,
          rsvp_status: originalGuest.rsvp_status,
          party_id: originalGuest.party_id,
          group_id: originalGuest.group_id,
          category: originalGuest.category,
          menu_choice: originalGuest.plus_one_menu || null,
          is_child: false,
          adults_count: 1,
          children_count: 0,
        })
        .select("id")
        .single();

      if (createError || !newGuest) {
        toast({ title: "Errore", description: "Impossibile creare l'ospite +1", variant: "destructive" });
        return;
      }

      // Clear plus_one_name from the original guest since they're now a real guest
      await supabase
        .from("guests")
        .update({ plus_one_name: null, allow_plus_one: false })
        .eq("id", originalGuestId);

      guestId = newGuest.id;

      // Refresh guests to remove the virtual entry
      await fetchGuests(weddingId);
      await fetchAllGuests(weddingId);
    }

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

    const existingAssignment = assignments.find(a => a.guest_id === guestId);
    if (existingAssignment) {
      await supabase.from("table_assignments").delete().eq("id", existingAssignment.id);
    }

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

  const handleWizardComplete = async () => {
    if (!weddingId) return;
    
    await Promise.all([
      fetchTables(weddingId),
      fetchAssignments(weddingId),
    ]);

    toast({
      title: "Disposizione completata!",
      description: "I tavoli e le assegnazioni sono stati salvati.",
    });
  };

  const exportToPDF = () => {
    if (tables.length === 0) {
      toast({ title: "Attenzione", description: "Non ci sono tavoli da esportare", variant: "destructive" });
      return;
    }

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

      return { name: table.name, capacity: table.capacity, guests: tableGuests };
    });

    generateTableReport(tableData);
    toast({ title: "Report tavoli generato!" });
  };

  const unassignedGuests = guests.filter(g => !assignments.some(a => a.guest_id === g.id));
  const assignedCount = assignments.length;
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  const headerActions = (
    <>
      <Button
        variant="outline"
        onClick={() => setShowConfirmedOnly(!showConfirmedOnly)}
        className="gap-2"
      >
        {showConfirmedOnly ? (
          <><ToggleRight className="w-4 h-4" /> Confermati</>
        ) : (
          <><ToggleLeft className="w-4 h-4" /> Tutti</>
        )}
      </Button>
      
      <Button onClick={() => setWizardOpen(true)} variant="default" className="gap-2">
        <Sparkles className="w-4 h-4" />
        Smart Planner AI
      </Button>
    </>
  );

  const secondaryActions = (
    <>
      <Button onClick={() => setConflictDialogOpen(true)} variant="outline" className="gap-2">
        <Users className="w-4 h-4" />
        {!isMobile && "Conflitti"}
      </Button>
      <Button onClick={createTable} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />
        {!isMobile && "Nuovo Tavolo"}
      </Button>
      <Button onClick={exportToPDF} variant="outline" disabled={tables.length === 0} className="gap-2">
        <Download className="w-4 h-4" />
        {!isMobile && "PDF"}
      </Button>
      {tables.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setBulkAction('clear_all')} className="gap-2">
              <Eraser className="w-4 h-4" />
              Svuota Tutti i Tavoli
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setBulkAction('delete_all')} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" />
              Elimina Tutto (Reset)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );

  const tableCanvasProps = {
    tables,
    guests,
    assignments,
    conflicts,
    weddingId,
    onUpdate: () => weddingId && fetchTables(weddingId),
    onUnassign: (assignmentId: string) => {
      supabase.from("table_assignments").delete().eq("id", assignmentId).then(() => {
        weddingId && fetchAssignments(weddingId);
      });
    },
    onClearTable: handleClearTable,
    onDeleteTable: handleDeleteTable,
    showConfirmedOnly,
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Disposizione Tavoli</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {tables.length > 0 ? (
                <>
                  {tables.length} tavoli • {assignedCount}/{guests.length} ospiti seduti • {totalSeats - assignedCount} posti liberi
                </>
              ) : (
                <>
                  {guests.length} ospiti da assegnare • Clicca "Smart Planner AI" per iniziare
                </>
              )}
            </p>
          </div>

          {/* Mobile: compact layout */}
          {isMobile ? (
            <div className="flex flex-wrap gap-2">
              {headerActions}
              {secondaryActions}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {headerActions}
              {secondaryActions}
            </div>
          )}
        </div>

        {tables.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Nessun tavolo creato</h2>
              <p className="text-muted-foreground">
                Usa lo <strong>Smart Planner AI</strong> per generare automaticamente 
                i tavoli ottimali e assegnare gli ospiti in base alle tue preferenze.
              </p>
              <Button onClick={() => setWizardOpen(true)} size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Avvia Smart Planner AI
              </Button>
            </div>
          </Card>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {isMobile ? (
              /* Mobile: Tab-based layout */
              <Tabs defaultValue="sala" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="pool" className="gap-2">
                    <Users className="w-4 h-4" />
                    Da Assegnare
                    {unassignedGuests.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">{unassignedGuests.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sala">
                    Sala ({tables.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pool">
                  <GuestPool 
                    guests={unassignedGuests} 
                    allGuests={allGuests}
                    assignments={assignments.map(a => ({ guest_id: a.guest_id }))}
                    isMobile={isMobile}
                  />
                </TabsContent>
                <TabsContent value="sala">
                  <TableCanvas {...tableCanvasProps} isMobile={isMobile} />
                </TabsContent>
              </Tabs>
            ) : (
              /* Desktop: Side-by-side layout */
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <GuestPool 
                    guests={unassignedGuests} 
                    allGuests={allGuests}
                    assignments={assignments.map(a => ({ guest_id: a.guest_id }))}
                  />
                </div>
                <div className="lg:col-span-3">
                  <TableCanvas {...tableCanvasProps} />
                </div>
              </div>
            )}

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
        )}

        <ConflictManager
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          guests={guests}
          conflicts={conflicts}
          weddingId={weddingId}
          onUpdate={() => weddingId && fetchConflicts(weddingId)}
        />

        <SmartGrouperWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          guests={allGuests}
          weddingId={weddingId}
          onComplete={handleWizardComplete}
          weddingTargets={weddingTargets}
          vendorStaffTotal={vendorStaffTotal}
        />

        {/* Bulk Action Confirmation Dialogs */}
        <AlertDialog open={bulkAction === 'clear_all'} onOpenChange={(open) => !open && setBulkAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Svuota tutti i tavoli?</AlertDialogTitle>
              <AlertDialogDescription>
                Tutti gli ospiti verranno rimossi dai tavoli e torneranno nel pool "Da Assegnare". 
                I tavoli rimarranno intatti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAllAssignments}>
                Svuota Tutti
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkAction === 'delete_all'} onOpenChange={(open) => !open && setBulkAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare tutto?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione eliminerà <strong>tutti i tavoli</strong> e <strong>tutte le assegnazioni</strong>. 
                Dovrai ricreare i tavoli da zero. Questa azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Elimina Tutto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Tables;
