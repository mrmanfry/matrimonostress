import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { PartyCard } from "@/components/guests/PartyCard";
import { PartyDialog } from "@/components/guests/PartyDialog";
import { SmartGrouperDialog } from "@/components/guests/SmartGrouperDialog";
import { SmartImportDialog } from "@/components/guests/SmartImportDialog";
import { ContactSyncDialog } from "@/components/guests/ContactSyncDialog";
import { GuestStatsChart } from "@/components/guests/GuestStatsChart";
import { ImportDropdown } from "@/components/guests/ImportDropdown";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<InviteParty | undefined>();
  const [smartGrouperOpen, setSmartGrouperOpen] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
  const [contactSyncOpen, setContactSyncOpen] = useState(false);

  useEffect(() => {
    if (authState.status === "authenticated") {
      loadData();
    }
  }, [authState]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .limit(1)
        .maybeSingle();

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
    // TODO: Implementare Capitolo B - Invio WhatsApp
    toast({
      title: "Funzionalità in arrivo",
      description: "L'invio RSVP via WhatsApp sarà disponibile nel prossimo aggiornamento.",
    });
  };

  const handleSmartGrouperApprove = async (suggestions: { party_name: string; guest_ids: string[] }[]) => {
    if (!wedding) return;

    try {
      for (const suggestion of suggestions) {
        await handleCreateParty(suggestion);
      }

      toast({
        title: "Raggruppamento Completato!",
        description: `${suggestions.length} nuclei sono stati creati.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filtra parties
  const filteredParties = parties.filter(party => {
    if (statusFilter !== "all" && party.rsvp_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        party.party_name.toLowerCase().includes(query) ||
        party.guests.some(g =>
          g.first_name.toLowerCase().includes(query) ||
          g.last_name.toLowerCase().includes(query)
        )
      );
    }
    return true;
  });

  // Calcola statistiche
  const totalGuests = allGuests.length;
  const totalParties = parties.length;
  const confirmedParties = parties.filter(p => p.rsvp_status === 'Confermato').length;
  const guestsWithoutPhone = allGuests.filter(g => !g.phone).length;
  const partiesReadyToSend = parties.filter(p =>
    p.guests.some(g => g.phone)
  ).length;

  const totalAdults = allGuests.reduce((sum, g) => sum + (g.is_child ? 0 : 1), 0);
  const totalChildren = allGuests.reduce((sum, g) => sum + (g.is_child ? 1 : 0), 0);

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

  const handleExportCateringPDF = () => {
    toast({
      title: "Funzionalità in arrivo",
      description: "Il report catering sarà disponibile a breve.",
    });
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Invitati Totali</div>
              <div className="text-3xl font-bold">{totalGuests}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalAdults} adulti • {totalChildren} bambini
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Nuclei di Invito</div>
              <div className="text-3xl font-bold">{totalParties}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {confirmedParties} confermati
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Pronti per l'Invio</div>
              <div className="text-3xl font-bold text-green-600">{partiesReadyToSend}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Nuclei con almeno un contatto
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Non Raggruppati</div>
              <div className="text-3xl font-bold text-orange-600">{ungroupedGuests.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Invitati senza nucleo
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nuclei o invitati..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="In attesa">In attesa</SelectItem>
                <SelectItem value="Confermato">Confermato</SelectItem>
                <SelectItem value="Rifiutato">Rifiutato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parties Grid */}
          {filteredParties.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                Nessun nucleo trovato con i filtri applicati.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParties.map((party) => (
                <PartyCard
                  key={party.id}
                  party={party}
                  onEdit={handleEditParty}
                  onDelete={handleDeleteParty}
                  onSendRSVP={handleSendRSVP}
                />
              ))}
            </div>
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
    </div>
  );
};

export default Guests;
