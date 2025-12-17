import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Plus,
  Search,
  Sparkles,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartyDialog } from "@/components/guests/PartyDialog";
import { SmartGrouperDialog } from "@/components/guests/SmartGrouperDialog";
import { SmartImportDialog } from "@/components/guests/SmartImportDialog";
import { ContactSyncDialog } from "@/components/guests/ContactSyncDialog";
import { RSVPCampaignDialog } from "@/components/guests/RSVPCampaignDialog";
import { GuestStatsChart } from "@/components/guests/GuestStatsChart";
import { ImportDropdown } from "@/components/guests/ImportDropdown";
import { GuestDiffDialog } from "@/components/guests/GuestDiffDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GuestSingleCard } from "@/components/guests/GuestSingleCard";
import { GuestNucleoCard } from "@/components/guests/GuestNucleoCard";
import { SelectionToolbar } from "@/components/guests/SelectionToolbar";
import { generateCateringReport } from "@/utils/pdfHelpers";

interface Guest {
  id: string;
  wedding_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  party_id?: string;
  is_child: boolean;
  unique_rsvp_token?: string;
  rsvp_send_status: 'Non Inviato' | 'Inviato' | 'Fallito';
  menu_choice?: string;
  dietary_restrictions?: string;
  notes?: string;
  adults_count: number;
  children_count: number;
}

interface InviteParty {
  id: string;
  wedding_id: string;
  party_name: string;
  rsvp_status: 'In attesa' | 'Confermato' | 'Rifiutato';
  guests: Guest[];
}

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
}

const Guests = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [parties, setParties] = useState<InviteParty[]>([]);
  const [ungroupedGuests, setUngroupedGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupingFilter, setGroupingFilter] = useState("all"); // all, grouped, singles
  const [contactFilter, setContactFilter] = useState("all"); // all, with_phone, without_phone
  const [ageFilter, setAgeFilter] = useState("all"); // all, adults, children
  
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<InviteParty | undefined>();
  const [smartGrouperOpen, setSmartGrouperOpen] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
  const [smartDiffOpen, setSmartDiffOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);
  const [rsvpCampaignOpen, setRsvpCampaignOpen] = useState(false);
  const [selectedPartiesForRSVP, setSelectedPartiesForRSVP] = useState<InviteParty[]>([]);
  
  // Selection state for multi-select
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authState.status === "authenticated") {
      loadData();
    }
  }, [authState]);

  const loadData = async () => {
    if (authState.status !== "authenticated" || !authState.weddingId) {
      setLoading(false);
      return;
    }

    try {
      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id, partner1_name, partner2_name")
        .eq("id", authState.weddingId)
        .single();

      if (!weddingData) return;
      setWedding(weddingData);

      await Promise.all([
        loadParties(weddingData.id),
        loadAllGuests(weddingData.id)
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadParties = async (weddingId: string) => {
    // Carica tutte le parties con i loro guests
    const { data: partiesData } = await supabase
      .from("invite_parties")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("party_name");

    if (!partiesData) return;

    // Per ogni party, carica i suoi guests
    const partiesWithGuests = await Promise.all(
      partiesData.map(async (party) => {
        const { data: guestsData } = await supabase
          .from("guests")
          .select("*")
          .eq("party_id", party.id)
          .order("is_child", { ascending: true })
          .order("first_name");

        return {
          ...party,
          guests: guestsData || [],
        };
      })
    );

    setParties(partiesWithGuests);
  };

  const loadAllGuests = async (weddingId: string) => {
    const { data: guestsData } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("last_name");

    if (guestsData) {
      setAllGuests(guestsData);
      // Filtra gli invitati non raggruppati
      const ungrouped = guestsData.filter((g: Guest) => !g.party_id);
      setUngroupedGuests(ungrouped);
    }
  };

  const handleCreateParty = async (partyData: { party_name: string; guest_ids: string[] }) => {
    if (!wedding) return;

    try {
      // Crea il party
      const { data: newParty, error: partyError } = await supabase
        .from("invite_parties")
        .insert({
          wedding_id: wedding.id,
          party_name: partyData.party_name,
          rsvp_status: 'In attesa',
        })
        .select()
        .single();

      if (partyError) throw partyError;

      // Aggiorna i guests assegnando il party_id
      const { error: updateError } = await supabase
        .from("guests")
        .update({ party_id: newParty.id })
        .in("id", partyData.guest_ids);

      if (updateError) throw updateError;

      toast({
        title: "Nucleo Creato!",
        description: `"${partyData.party_name}" è stato creato con ${partyData.guest_ids.length} membri.`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateParty = async (partyData: { id?: string; party_name: string; guest_ids: string[] }) => {
    if (!wedding || !partyData.id) return;

    try {
      // Aggiorna il nome del party
      const { error: partyError } = await supabase
        .from("invite_parties")
        .update({ party_name: partyData.party_name })
        .eq("id", partyData.id);

      if (partyError) throw partyError;

      // Rimuovi party_id dai guests che non sono più nel party
      const currentParty = parties.find(p => p.id === partyData.id);
      const removedGuestIds = currentParty?.guests
        .filter(g => !partyData.guest_ids.includes(g.id))
        .map(g => g.id) || [];

      if (removedGuestIds.length > 0) {
        await supabase
          .from("guests")
          .update({ party_id: null })
          .in("id", removedGuestIds);
      }

      // Aggiungi party_id ai nuovi guests
      const { error: updateError } = await supabase
        .from("guests")
        .update({ party_id: partyData.id })
        .in("id", partyData.guest_ids);

      if (updateError) throw updateError;

      toast({
        title: "Nucleo Aggiornato!",
        description: `"${partyData.party_name}" è stato modificato.`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveParty = async (partyData: { id?: string; party_name: string; guest_ids: string[] }) => {
    if (partyData.id) {
      await handleUpdateParty(partyData);
    } else {
      await handleCreateParty(partyData);
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    if (!confirm("Eliminare questo nucleo? Gli invitati torneranno nella lista non raggruppati.")) return;

    try {
      // Rimuovi party_id dai guests
      await supabase
        .from("guests")
        .update({ party_id: null })
        .eq("party_id", partyId);

      // Elimina il party
      const { error } = await supabase
        .from("invite_parties")
        .delete()
        .eq("id", partyId);

      if (error) throw error;

      toast({
        title: "Nucleo Eliminato",
        description: "Gli invitati sono stati spostati nella lista non raggruppati.",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditParty = (party: InviteParty) => {
    setEditingParty(party);
    setPartyDialogOpen(true);
  };

  const handleSendRSVP = (party: InviteParty) => {
    setSelectedPartiesForRSVP([party]);
    setRsvpCampaignOpen(true);
  };

  const handleBulkSendRSVP = () => {
    if (parties.length === 0) {
      toast({
        title: "Nessun nucleo disponibile",
        description: "Crea prima alcuni nuclei di invito per avviare la campagna.",
        variant: "destructive",
      });
      return;
    }
    setSelectedPartiesForRSVP(parties);
    setRsvpCampaignOpen(true);
  };

  const handleSmartGrouperApprove = async (suggestions: { party_name: string; guest_ids: string[] }[]) => {
    if (!wedding) return;

    try {
      for (const suggestion of suggestions) {
        await handleCreateParty(suggestion);
      }

      toast({
        title: "Raggruppamento Completato!",
        description: `${suggestions.length} nuclei creati con successo!`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel raggruppamento",
        variant: "destructive",
      });
    }
  };

  // Selection handlers
  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }
      return newSet;
    });
  };

  const togglePartySelection = (partyId: string) => {
    setSelectedPartyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partyId)) {
        newSet.delete(partyId);
      } else {
        newSet.add(partyId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedGuestIds(new Set());
    setSelectedPartyIds(new Set());
  };

  const handleCreatePartyFromSelection = () => {
    if (selectedGuestIds.size === 0) {
      toast({
        title: "Selezione vuota",
        description: "Seleziona almeno un invitato",
        variant: "destructive",
      });
      return;
    }
    
    // Convert selected guests to array for dialog
    const selectedGuests = ungroupedGuests.filter(g => selectedGuestIds.has(g.id));
    
    // Open dialog with pre-selected guests
    setEditingParty({
      id: "",
      wedding_id: wedding?.id || "",
      party_name: "",
      rsvp_status: 'In attesa',
      guests: selectedGuests,
    } as any);
    setPartyDialogOpen(true);
    clearSelection();
  };

  const handleEditGuest = (guestId: string) => {
    // TODO: Implement guest edit dialog
    toast({
      title: "Funzionalità in arrivo",
      description: "La modifica dell'invitato sarà disponibile a breve.",
    });
  };

  const handleAddGuestToParty = (guestId: string) => {
    const guest = ungroupedGuests.find(g => g.id === guestId);
    if (!guest) return;
    
    setEditingParty({
      id: "",
      wedding_id: wedding?.id || "",
      party_name: "",
      rsvp_status: 'In attesa',
      guests: [guest],
    } as any);
    setPartyDialogOpen(true);
  };

  // Filter logic for hybrid list
  const filteredItems = () => {
    let items: Array<{ type: 'single' | 'party'; data: Guest | InviteParty }> = [];

    // Add parties (grouped guests)
    if (groupingFilter !== "singles") {
      parties.forEach(party => {
        items.push({ type: 'party', data: party });
      });
    }

    // Add ungrouped guests (singles)
    if (groupingFilter !== "grouped") {
      ungroupedGuests.forEach(guest => {
        items.push({ type: 'single', data: guest });
      });
    }

    // Apply status filter
    items = items.filter(item => {
      if (statusFilter !== "all") {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          return party.rsvp_status === statusFilter;
        }
        // Singles are always "In attesa"
        return statusFilter === "In attesa";
      }
      return true;
    });

    // Apply contact filter
    if (contactFilter !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          const hasPhone = party.guests.some(g => g.phone);
          return contactFilter === "with_phone" ? hasPhone : !hasPhone;
        } else {
          const guest = item.data as Guest;
          const hasPhone = !!guest.phone;
          return contactFilter === "with_phone" ? hasPhone : !hasPhone;
        }
      });
    }

    // Apply age filter
    if (ageFilter !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          if (ageFilter === "adults") {
            return party.guests.some(g => !g.is_child);
          } else {
            return party.guests.some(g => g.is_child);
          }
        } else {
          const guest = item.data as Guest;
          return ageFilter === "adults" ? !guest.is_child : guest.is_child;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          return (
            party.party_name.toLowerCase().includes(query) ||
            party.guests.some(g =>
              g.first_name.toLowerCase().includes(query) ||
              g.last_name.toLowerCase().includes(query)
            )
          );
        } else {
          const guest = item.data as Guest;
          return (
            guest.first_name.toLowerCase().includes(query) ||
            guest.last_name.toLowerCase().includes(query)
          );
        }
      });
    }

    return items;
  };

  const hybridList = filteredItems();

  // Calcola statistiche (riorganizzate per la nuova UI)
  const totalGuests = allGuests.length;
  const totalAdults = allGuests.reduce((sum, g) => sum + (g.is_child ? 0 : 1), 0);
  const totalChildren = allGuests.reduce((sum, g) => sum + (g.is_child ? 1 : 0), 0);
  
  // "Nuclei di Invito" = parties + ungrouped (ogni single è un nucleo di 1)
  const totalNuclei = parties.length + ungroupedGuests.length;
  
  const guestsWithoutPhone = allGuests.filter(g => !g.phone).length;
  const confirmedParties = parties.filter(p => p.rsvp_status === 'Confermato').length;

  // Calcola stats RSVP
  const confirmedGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return party?.rsvp_status === 'Confermato';
  });
  const pendingGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return !party || party.rsvp_status === 'In attesa';
  });
  const declinedGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return party?.rsvp_status === 'Rifiutato';
  });

  const stats = {
    total: allGuests.length,
    confirmed: confirmedGuests.length,
    pending: pendingGuests.length,
    declined: declinedGuests.length,
  };

  // Funzioni per ImportDropdown (placeholder per ora)
  const handleDownloadTemplate = () => {
    toast({
      title: "Funzionalità in arrivo",
      description: "Il download del template CSV sarà disponibile a breve.",
    });
  };

  const handleImportCSV = () => {
    toast({
      title: "Funzionalità in arrivo",
      description: "L'import CSV sarà disponibile a breve.",
    });
  };

  const handleExportCSV = () => {
    toast({
      title: "Funzionalità in arrivo",
      description: "L'export CSV sarà disponibile a breve.",
    });
  };

  const handleExportCateringPDF = async () => {
    if (allGuests.length === 0) {
      toast({
        title: "Nessun ospite",
        description: "Aggiungi prima alcuni invitati per generare il report.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Carica assegnazioni tavoli
      const { data: tableAssignments } = await supabase
        .from("table_assignments")
        .select(`
          guest_id,
          tables!inner(name)
        `);

      // Mappa guest_id -> table_name
      const tableMap: Record<string, string> = {};
      tableAssignments?.forEach((assignment: any) => {
        tableMap[assignment.guest_id] = assignment.tables?.name || "";
      });

      // Prepara dati per il PDF
      const cateringGuests = allGuests.map(guest => ({
        first_name: guest.first_name,
        last_name: guest.last_name,
        menu_choice: guest.menu_choice || null,
        dietary_restrictions: guest.dietary_restrictions || null,
        notes: guest.notes || null,
        adults_count: guest.adults_count,
        children_count: guest.children_count,
        is_child: guest.is_child,
        table_name: tableMap[guest.id] || undefined,
      }));

      generateCateringReport(cateringGuests);
      
      toast({
        title: "Report Generato!",
        description: "Il PDF del catering è stato scaricato.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile generare il report.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  const hasNoGuests = allGuests.length === 0;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8" />
            Gestione Invitati
          </h1>
          <p className="text-muted-foreground mt-1">
            Organizza i tuoi invitati in nuclei familiari
          </p>
        </div>

        {!isMobile && !hasNoGuests && (
          <div className="flex gap-2">
            <ImportDropdown
              onSmartImport={() => setSmartImportOpen(true)}
              onSmartDiff={() => setSmartDiffOpen(true)}
              onDownloadTemplate={handleDownloadTemplate}
              onImportCSV={handleImportCSV}
              onExportCSV={handleExportCSV}
              onExportCateringPDF={handleExportCateringPDF}
              hasGuests={allGuests.length > 0}
              hasConfirmedGuests={confirmedGuests.length > 0}
            />
            <Button
              onClick={() => setContactSyncOpen(true)}
              variant="outline"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Sincronizza Contatti
            </Button>
            <Button
              onClick={() => {
                setEditingParty(undefined);
                setPartyDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Nucleo
            </Button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {hasNoGuests ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Users className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Nessun Invitato</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Inizia aggiungendo i tuoi invitati manualmente o importali da un file CSV.
            </p>
            <div className="flex justify-center gap-2">
              <ImportDropdown
                onSmartImport={() => setSmartImportOpen(true)}
                onSmartDiff={() => setSmartDiffOpen(true)}
                onDownloadTemplate={handleDownloadTemplate}
                onImportCSV={handleImportCSV}
                onExportCSV={handleExportCSV}
                onExportCateringPDF={handleExportCateringPDF}
                hasGuests={false}
                hasConfirmedGuests={false}
              />
              <Button onClick={() => setSmartImportOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Smart Import
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Cards - Riorganizzate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Invitati Totali</div>
              <div className="text-3xl font-bold">{totalGuests}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalAdults} Adult{totalAdults !== 1 ? 'i' : 'o'}, {totalChildren} Bambin{totalChildren !== 1 ? 'i' : 'o'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Nuclei di Invito</div>
              <div className="text-3xl font-bold">{totalNuclei}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {parties.length} raggruppati • {ungroupedGuests.length} singoli
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Contatti Mancanti</div>
              <div className="text-3xl font-bold text-orange-600">{guestsWithoutPhone}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Invitati senza numero di telefono
              </div>
            </Card>
          </div>

          {/* Warnings */}
          {guestsWithoutPhone > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{guestsWithoutPhone}</strong> invitati non hanno un numero di telefono.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setContactSyncOpen(true)}
                >
                  Sincronizza i contatti
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {ungroupedGuests.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>{ungroupedGuests.length}</strong> invitati non sono ancora assegnati a un nucleo.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSmartGrouperOpen(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Raggruppa con AI
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Chart */}
          <GuestStatsChart stats={stats} />

          {/* Filters - Ridisegnati con tutti i filtri */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="🔍 Cerca invitati o nuclei..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                onClick={handleBulkSendRSVP}
                disabled={parties.length === 0}
                variant="default"
                className="gap-2 whitespace-nowrap"
              >
                💬 Campagna RSVP
              </Button>
            </div>

            {/* Seconda riga di filtri con label */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo Gruppo</Label>
                <Select value={groupingFilter} onValueChange={setGroupingFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="grouped">Solo Raggruppati</SelectItem>
                    <SelectItem value="singles">Solo Singoli</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Stato RSVP</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="In attesa">In attesa</SelectItem>
                    <SelectItem value="Confermato">Confermato</SelectItem>
                    <SelectItem value="Rifiutato">Rifiutato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Numero Telefono</Label>
                <Select value={contactFilter} onValueChange={setContactFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="with_phone">Con numero</SelectItem>
                    <SelectItem value="without_phone">Senza numero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo Invitato</Label>
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="adults">Solo Adulti</SelectItem>
                    <SelectItem value="children">Solo Bambini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Hybrid List - La Lista Ibrida (Nuclei + Singoli) */}
          {hybridList.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                Nessun invitato trovato con i filtri applicati.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {hybridList.map((item) => {
                if (item.type === 'party') {
                  const party = item.data as InviteParty;
                  return (
                    <GuestNucleoCard
                      key={`party-${party.id}`}
                      party={party}
                      selected={selectedPartyIds.has(party.id)}
                      onToggleSelect={togglePartySelection}
                      onEdit={handleEditParty}
                      onSendRSVP={handleSendRSVP}
                      onGuestUpdate={loadData}
                    />
                  );
                } else {
                  const guest = item.data as Guest;
                  return (
                    <GuestSingleCard
                      key={`guest-${guest.id}`}
                      guest={guest}
                      selected={selectedGuestIds.has(guest.id)}
                      onToggleSelect={toggleGuestSelection}
                      onEdit={handleEditGuest}
                      onAddToParty={handleAddGuestToParty}
                      onGuestUpdate={loadData}
                    />
                  );
                }
              })}
            </div>
          )}

          {/* Selection Toolbar - Solo per invitati singoli */}
          {selectedGuestIds.size > 0 && (
            <SelectionToolbar
              selectedCount={selectedGuestIds.size}
              onCreateParty={handleCreatePartyFromSelection}
              onClearSelection={clearSelection}
            />
          )}
        </>
      )}

      {/* FAB - Mobile Only */}
      {isMobile && !hasNoGuests && (
        <Button
          size="lg"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          onClick={() => {
            setEditingParty(undefined);
            setPartyDialogOpen(true);
          }}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Dialogs */}
      <PartyDialog
        open={partyDialogOpen}
        onOpenChange={(open) => {
          setPartyDialogOpen(open);
          if (!open) setEditingParty(undefined);
        }}
        party={editingParty ? {
          id: editingParty.id,
          party_name: editingParty.party_name,
          guest_ids: editingParty.guests.map(g => g.id),
        } : undefined}
        availableGuests={editingParty
          ? [...ungroupedGuests, ...editingParty.guests]
          : ungroupedGuests
        }
        onSave={handleSaveParty}
      />

      <SmartGrouperDialog
        open={smartGrouperOpen}
        onOpenChange={setSmartGrouperOpen}
        ungroupedGuests={ungroupedGuests}
        onApprove={handleSmartGrouperApprove}
      />

      <SmartImportDialog
        open={smartImportOpen}
        onOpenChange={setSmartImportOpen}
        weddingId={wedding?.id || ""}
        onSuccess={loadData}
        groups={[]}
      />

      <ContactSyncDialog
        open={contactSyncOpen}
        onOpenChange={setContactSyncOpen}
        weddingId={wedding?.id || ""}
        onSyncComplete={loadData}
      />

      <RSVPCampaignDialog
        open={rsvpCampaignOpen}
        onOpenChange={setRsvpCampaignOpen}
        selectedParties={selectedPartiesForRSVP}
        weddingId={wedding?.id || ""}
        coupleName={wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : ""}
      />

      <GuestDiffDialog
        open={smartDiffOpen}
        onOpenChange={setSmartDiffOpen}
        weddingId={wedding?.id || ""}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Guests;
