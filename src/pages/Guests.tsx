import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GuestFilters, GuestFilterValues, DEFAULT_FILTER_VALUES } from "@/components/guests/GuestFilters";
import { PartyDialog } from "@/components/guests/PartyDialog";
import { SmartGrouperDialog } from "@/components/guests/SmartGrouperDialog";
import { SmartImportDialog } from "@/components/guests/SmartImportDialog";
import { ContactSyncDialog } from "@/components/guests/ContactSyncDialog";
import { RSVPCampaignDialog } from "@/components/guests/RSVPCampaignDialog";
import { GuestAnalyticsDashboard, AnalyticsFilterType } from "@/components/guests/GuestAnalyticsDashboard";
import { ImportDropdown } from "@/components/guests/ImportDropdown";
import { GuestDiffDialog } from "@/components/guests/GuestDiffDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GuestSingleCard } from "@/components/guests/GuestSingleCard";
import { GuestNucleoCard } from "@/components/guests/GuestNucleoCard";
import { SelectionToolbar } from "@/components/guests/SelectionToolbar";
import { FunnelKPICards } from "@/components/guests/FunnelKPICards";
import { GuestCampaignBadges } from "@/components/guests/GuestCampaignBadges";
import { generateCateringReport } from "@/utils/pdfHelpers";
import { CSVImportDialog } from "@/components/guests/CSVImportDialog";
import { generateCSVTemplate, downloadCSV, exportGuestsToCSV } from "@/utils/csvHelpers";

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
  allow_plus_one?: boolean;
  plus_one_name?: string;
  is_couple_member?: boolean;
  rsvp_status?: string;
  group_id?: string | null;
  group_name?: string | null;
  // New Wedding CRM fields
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  last_reminder_sent_at?: string | null;
  std_response?: string | null;
  std_responded_at?: string | null;
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
  const [filterValues, setFilterValues] = useState<GuestFilterValues>(DEFAULT_FILTER_VALUES);
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null); // draft, std_sent, invited, confirmed, declined
  const [activeAnalyticsFilter, setActiveAnalyticsFilter] = useState<AnalyticsFilterType | null>(null);

  // Helper to update individual filter values
  const handleFilterChange = (key: keyof GuestFilterValues, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues(DEFAULT_FILTER_VALUES);
    setFunnelFilter(null);
    setActiveAnalyticsFilter(null);
  };
  
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<InviteParty | undefined>();
  const [smartGrouperOpen, setSmartGrouperOpen] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
  const [smartDiffOpen, setSmartDiffOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
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

  // Auto-reopen RSVP Campaign dialog if there's a saved campaign in localStorage
  useEffect(() => {
    if (wedding?.id) {
      const savedProgress = localStorage.getItem("rsvp_campaign_progress");
      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          // Only reopen if it's recent (within 24 hours) and same wedding
          const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
          if (isRecent && parsed.weddingId === wedding.id) {
            // Reopen the RSVP Campaign dialog
            setRsvpCampaignOpen(true);
          }
        } catch (e) {
          localStorage.removeItem("rsvp_campaign_progress");
        }
      }
    }
  }, [wedding]);

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

      // Check if couple members exist, if not create them
      await ensureCoupleMembersExist(weddingData);

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

  const ensureCoupleMembersExist = async (weddingData: Wedding) => {
    // Check if couple members already exist
    const { data: existingCouple } = await supabase
      .from("guests")
      .select("id")
      .eq("wedding_id", weddingData.id)
      .eq("is_couple_member", true);

    if (existingCouple && existingCouple.length >= 2) {
      return; // Couple already exists
    }

    // Parse partner names (handle "Nome Cognome" format)
    const parsePartnerName = (fullName: string) => {
      const parts = fullName.trim().split(" ");
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: "" };
      }
      return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
    };

    const partner1 = parsePartnerName(weddingData.partner1_name);
    const partner2 = parsePartnerName(weddingData.partner2_name);

    // Create couple members if they don't exist
    const coupleGuests = [];
    
    if (!existingCouple || existingCouple.length === 0) {
      coupleGuests.push(
        {
          wedding_id: weddingData.id,
          first_name: partner1.firstName,
          last_name: partner1.lastName,
          is_child: false,
          is_couple_member: true,
          rsvp_status: 'confirmed',
          adults_count: 1,
          children_count: 0,
        },
        {
          wedding_id: weddingData.id,
          first_name: partner2.firstName,
          last_name: partner2.lastName,
          is_child: false,
          is_couple_member: true,
          rsvp_status: 'confirmed',
          adults_count: 1,
          children_count: 0,
        }
      );
    }

    if (coupleGuests.length > 0) {
      const { error } = await supabase.from("guests").insert(coupleGuests);
      if (error) {
        console.error("Error creating couple members:", error);
      }
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
          .select("*, guest_groups(name)")
          .eq("party_id", party.id)
          .order("is_child", { ascending: true })
          .order("first_name");

        const guestsWithGroupName = (guestsData || []).map((g: any) => ({
          ...g,
          group_name: g.guest_groups?.name || null,
        }));

        return {
          ...party,
          guests: guestsWithGroupName,
        };
      })
    );

    setParties(partiesWithGuests);
  };

  const loadAllGuests = async (weddingId: string) => {
    const { data: guestsData } = await supabase
      .from("guests")
      .select("*, guest_groups(name)")
      .eq("wedding_id", weddingId)
      .order("is_couple_member", { ascending: false }) // Couple members first
      .order("last_name");

    if (guestsData) {
      // Map to include group_name from the joined table
      const guestsWithGroupName = guestsData.map((g: any) => ({
        ...g,
        group_name: g.guest_groups?.name || null,
      }));
      setAllGuests(guestsWithGroupName);
      // Filter ungrouped guests (excluding couple members from ungrouped since they're special)
      const ungrouped = guestsWithGroupName.filter((g: Guest) => !g.party_id && !g.is_couple_member);
      // Add couple members at the start of ungrouped for display
      const coupleMembers = guestsWithGroupName.filter((g: Guest) => g.is_couple_member);
      setUngroupedGuests([...coupleMembers, ...ungrouped]);
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

  // Stato per i guest IDs pre-selezionati da passare al dialog RSVP
  const [preSelectedGuestIdsForRSVP, setPreSelectedGuestIdsForRSVP] = useState<Set<string>>(new Set());

  // Handler per inviare RSVP dalla SelectionToolbar (contestuale)
  const handleSendRSVPFromSelection = () => {
    // Raccogli tutti gli IDs degli ospiti selezionati (singoli + membri dei nuclei)
    const guestIdsToPreselect = new Set<string>();
    
    // Aggiungi i singoli selezionati
    selectedGuestIds.forEach(id => guestIdsToPreselect.add(id));
    
    // Aggiungi i membri dei nuclei selezionati
    parties
      .filter(p => selectedPartyIds.has(p.id))
      .forEach(p => p.guests.forEach(g => guestIdsToPreselect.add(g.id)));
    
    setPreSelectedGuestIdsForRSVP(guestIdsToPreselect);
    setSelectedPartiesForRSVP(parties.filter(p => selectedPartyIds.has(p.id)));
    setRsvpCampaignOpen(true);
  };

  // Calcola se ci sono contatti selezionati con telefono
  const hasContactsToSend = useMemo(() => {
    // Almeno un party selezionato ha membri con telefono
    const partyHasPhone = parties
      .filter(p => selectedPartyIds.has(p.id))
      .some(p => p.guests.some(g => g.phone));
    
    // Almeno un singolo selezionato ha telefono
    const singleHasPhone = ungroupedGuests
      .filter(g => selectedGuestIds.has(g.id))
      .some(g => g.phone);
    
    return partyHasPhone || singleHasPhone;
  }, [parties, ungroupedGuests, selectedPartyIds, selectedGuestIds]);

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
    
    // FIX: Cerca in ALL guests, non solo ungrouped, per permettere ri-nucleazione
    const selectedGuests = allGuests.filter(g => selectedGuestIds.has(g.id));
    
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

  // Bulk delete selected guests
  const handleBulkDeleteGuests = async () => {
    const guestCount = selectedGuestIds.size;
    const partyCount = selectedPartyIds.size;
    
    let message = "";
    if (guestCount > 0 && partyCount > 0) {
      message = `Eliminare definitivamente ${guestCount} invitati e ${partyCount} nuclei (con tutti i loro membri)?`;
    } else if (guestCount > 0) {
      message = `Eliminare definitivamente ${guestCount} invitati?`;
    } else if (partyCount > 0) {
      message = `Eliminare definitivamente ${partyCount} nuclei (con tutti i loro membri)?`;
    }
    
    if (!confirm(message)) return;

    try {
      // Delete selected individual guests
      if (guestCount > 0) {
        const { error } = await supabase
          .from("guests")
          .delete()
          .in("id", Array.from(selectedGuestIds));
        if (error) throw error;
      }
      
      // Delete guests in selected parties, then delete parties
      if (partyCount > 0) {
        // First delete all guests in selected parties
        const { error: guestsError } = await supabase
          .from("guests")
          .delete()
          .in("party_id", Array.from(selectedPartyIds));
        if (guestsError) throw guestsError;
        
        // Then delete the parties
        const { error: partiesError } = await supabase
          .from("invite_parties")
          .delete()
          .in("id", Array.from(selectedPartyIds));
        if (partiesError) throw partiesError;
      }

      toast({ 
        title: "Eliminazione completata", 
        description: "Gli elementi selezionati sono stati rimossi." 
      });
      clearSelection();
      await loadData();
    } catch (error: any) {
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Bulk dissolve selected parties (keep guests as singles)
  const handleBulkDissolveParties = async () => {
    if (selectedPartyIds.size === 0) return;
    
    if (!confirm(`Sciogliere ${selectedPartyIds.size} nuclei? Gli invitati torneranno singoli.`)) return;

    try {
      // Remove party_id from guests (make them singles)
      const { error: updateError } = await supabase
        .from("guests")
        .update({ party_id: null })
        .in("party_id", Array.from(selectedPartyIds));
      if (updateError) throw updateError;

      // Delete the parties
      const { error: deleteError } = await supabase
        .from("invite_parties")
        .delete()
        .in("id", Array.from(selectedPartyIds));
      if (deleteError) throw deleteError;

      toast({ 
        title: "Nuclei Sciolti", 
        description: "Gli invitati sono ora singoli." 
      });
      clearSelection();
      await loadData();
    } catch (error: any) {
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      });
    }
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

    // Add parties (grouped guests) - show single-member parties as singles
    if (filterValues.grouping !== "singles") {
      parties.forEach(party => {
        if (party.guests.length === 1) {
          // Single-member party: show as individual guest
          items.push({ type: 'single', data: party.guests[0] });
        } else {
          items.push({ type: 'party', data: party });
        }
      });
    }

    // Add ungrouped guests (singles)
    if (filterValues.grouping !== "grouped") {
      ungroupedGuests.forEach(guest => {
        items.push({ type: 'single', data: guest });
      });
    }

    // Apply RSVP status filter
    if (filterValues.rsvpStatus !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          return party.rsvp_status === filterValues.rsvpStatus;
        }
        // Singles are always "In attesa"
        return filterValues.rsvpStatus === "In attesa";
      });
    }

    // Apply contact filter
    if (filterValues.contact !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          const hasPhone = party.guests.some(g => g.phone);
          return filterValues.contact === "with_phone" ? hasPhone : !hasPhone;
        } else {
          const guest = item.data as Guest;
          const hasPhone = !!guest.phone;
          return filterValues.contact === "with_phone" ? hasPhone : !hasPhone;
        }
      });
    }

    // Apply age filter
    if (filterValues.age !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          if (filterValues.age === "adults") {
            return party.guests.some(g => !g.is_child);
          } else {
            return party.guests.some(g => g.is_child);
          }
        } else {
          const guest = item.data as Guest;
          return filterValues.age === "adults" ? !guest.is_child : guest.is_child;
        }
      });
    }

    // Apply group filter
    if (filterValues.group !== "all") {
      items = items.filter(item => {
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          if (filterValues.group === "no_group") {
            return party.guests.some(g => !g.group_id);
          }
          return party.guests.some(g => g.group_id === filterValues.group);
        } else {
          const guest = item.data as Guest;
          if (filterValues.group === "no_group") {
            return !guest.group_id;
          }
          return guest.group_id === filterValues.group;
        }
      });
    }

    // Apply STD status filter
    if (filterValues.stdStatus !== "all") {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          switch (filterValues.stdStatus) {
            case "not_sent": 
              // Non inviato E non ha risposto (chi risponde è implicitamente inviato)
              return !g.save_the_date_sent_at && !g.std_response;
            case "sent": 
              // Inviato OPPURE ha risposto (risposta implica invio)
              return !!g.save_the_date_sent_at || !!g.std_response;
            case "responded_yes": 
              return g.std_response === "likely_yes";
            case "responded_no": 
              return g.std_response === "likely_no";
            case "responded_unsure": 
              return g.std_response === "unsure";
            default: return true;
          }
        };
        if (item.type === 'party') {
          return (item.data as InviteParty).guests.some(checkGuest);
        }
        return checkGuest(item.data as Guest);
      });
    }

    // Apply +1 filter
    if (filterValues.plusOne !== "all") {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          switch (filterValues.plusOne) {
            case "allowed": return !!g.allow_plus_one;
            case "confirmed": return !!g.plus_one_name && g.plus_one_name.trim() !== "";
            case "not_allowed": return !g.allow_plus_one;
            default: return true;
          }
        };
        if (item.type === 'party') {
          return (item.data as InviteParty).guests.some(checkGuest);
        }
        return checkGuest(item.data as Guest);
      });
    }

    // Apply menu filter
    if (filterValues.menu !== "all") {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          if (filterValues.menu === "no_choice") return !g.menu_choice;
          return g.menu_choice?.toLowerCase() === filterValues.menu.toLowerCase();
        };
        if (item.type === 'party') {
          return (item.data as InviteParty).guests.some(checkGuest);
        }
        return checkGuest(item.data as Guest);
      });
    }

    // Apply staff filter
    if (filterValues.staff !== "all") {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          if (filterValues.staff === "staff_only") return !!(g as any).is_staff;
          if (filterValues.staff === "guests_only") return !(g as any).is_staff;
          return true;
        };
        if (item.type === 'party') {
          return (item.data as InviteParty).guests.some(checkGuest);
        }
        return checkGuest(item.data as Guest);
      });
    }

    // Apply formal invite status filter
    if (filterValues.inviteStatus !== "all") {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          if (filterValues.inviteStatus === "not_sent") return !g.formal_invite_sent_at;
          if (filterValues.inviteStatus === "sent") return !!g.formal_invite_sent_at;
          return true;
        };
        if (item.type === 'party') {
          return (item.data as InviteParty).guests.some(checkGuest);
        }
        return checkGuest(item.data as Guest);
      });
    }

    // Apply funnel filter (Wedding CRM)
    if (funnelFilter) {
      items = items.filter(item => {
        const checkGuest = (g: Guest): boolean => {
          switch (funnelFilter) {
            case 'draft':
              return !g.save_the_date_sent_at && !g.formal_invite_sent_at;
            case 'std_sent':
              return !!g.save_the_date_sent_at && !g.formal_invite_sent_at;
            case 'invited':
              return !!g.formal_invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending');
            case 'confirmed':
              return g.rsvp_status === 'confirmed';
            case 'declined':
              return g.rsvp_status === 'declined';
            default:
              return true;
          }
        };
        
        if (item.type === 'party') {
          const party = item.data as InviteParty;
          // Party matches if at least one guest matches
          return party.guests.some(g => checkGuest(g));
        } else {
          return checkGuest(item.data as Guest);
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
              g.last_name.toLowerCase().includes(query) ||
              g.group_name?.toLowerCase().includes(query)
            )
          );
        } else {
          const guest = item.data as Guest;
          return (
            guest.first_name.toLowerCase().includes(query) ||
            guest.last_name.toLowerCase().includes(query) ||
            guest.group_name?.toLowerCase().includes(query)
          );
        }
      });
    }

    return items;
  };

  const hybridList = filteredItems();

  // Calcola statistiche (riorganizzate per la nuova UI)
  // Conta anche i +1 confermati (quelli con plus_one_name compilato)
  const confirmedPlusOnes = allGuests.filter(g => g.plus_one_name && g.plus_one_name.trim() !== '').length;
  // +1 potenziali: hanno il permesso ma non ancora confermato il nome
  const potentialPlusOnes = allGuests.filter(g => g.allow_plus_one && (!g.plus_one_name || g.plus_one_name.trim() === '')).length;
  const totalGuests = allGuests.length + confirmedPlusOnes;
  const totalAdults = allGuests.reduce((sum, g) => sum + (g.is_child ? 0 : 1), 0) + confirmedPlusOnes;
  const totalChildren = allGuests.reduce((sum, g) => sum + (g.is_child ? 1 : 0), 0);
  
  // "Nuclei di Invito" = parties + ungrouped (ogni single è un nucleo di 1)
  const totalNuclei = parties.length + ungroupedGuests.length;
  
  const guestsWithoutPhone = allGuests.filter(g => !g.phone).length;
  const confirmedParties = parties.filter(p => p.rsvp_status === 'Confermato').length;
  const guestsWithPlusOneEnabled = allGuests.filter(g => g.allow_plus_one).length;

  // Calcola stats RSVP (include +1 nei confermati)
  const confirmedGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return party?.rsvp_status === 'Confermato';
  });
  // Aggiungi i +1 confermati ai confermati
  const confirmedPlusOnesCount = confirmedGuests.filter(g => g.plus_one_name && g.plus_one_name.trim() !== '').length;
  
  const pendingGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return !party || party.rsvp_status === 'In attesa';
  });
  const declinedGuests = allGuests.filter(g => {
    const party = parties.find(p => p.id === g.party_id);
    return party?.rsvp_status === 'Rifiutato';
  });

  const stats = {
    total: allGuests.length + confirmedPlusOnes,
    confirmed: confirmedGuests.length + confirmedPlusOnesCount,
    pending: pendingGuests.length,
    declined: declinedGuests.length,
    plusOnes: confirmedPlusOnes,
    potentialPlusOnes: potentialPlusOnes,
  };

  // CSV Import/Export functions
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "template_invitati.csv");
    toast({ title: "Template scaricato!" });
  };

  const handleCSVImport = () => {
    setCsvImportOpen(true);
  };

  const handleExportCSV = () => {
    if (allGuests.length === 0) return;
    const csv = exportGuestsToCSV(allGuests);
    downloadCSV(csv, "lista_invitati.csv");
    toast({ title: "Lista esportata!" });
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
              onCSVImport={handleCSVImport}
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
                onCSVImport={handleCSVImport}
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
          {/* Funnel KPI Cards - Wedding CRM */}
          <FunnelKPICards 
            guests={allGuests}
            activeFilter={funnelFilter}
            onFilterChange={setFunnelFilter}
          />
          
          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Coperti Stimati</div>
              <div className="text-3xl font-bold">{totalGuests + potentialPlusOnes}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalGuests} inviti{potentialPlusOnes > 0 && ` + ${potentialPlusOnes} +1 potenziali`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalAdults} Adult{totalAdults !== 1 ? 'i' : 'o'}, {totalChildren} Bambin{totalChildren !== 1 ? 'i' : 'o'}
              </div>
              {confirmedPlusOnes > 0 && (
                <div className="text-xs mt-1">
                  <span className="text-green-600">{confirmedPlusOnes} +1 già confermati</span>
                </div>
              )}
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

          {/* Analytics Dashboard */}
          <GuestAnalyticsDashboard 
            guests={allGuests} 
            parties={parties} 
            activeFilter={activeAnalyticsFilter}
            onClearFilter={handleResetFilters}
            onFilterClick={(filter: AnalyticsFilterType) => {
              // Reset all filters first
              setFilterValues(DEFAULT_FILTER_VALUES);
              setFunnelFilter(null);
              // Set the active filter for visual indicator
              setActiveAnalyticsFilter(filter);
              // Apply the specific filter
              switch (filter.type) {
                case 'rsvp':
                  const rsvpMap = { confirmed: 'Confermato', pending: 'In attesa', declined: 'Rifiutato' };
                  handleFilterChange('rsvpStatus', rsvpMap[filter.value] || 'all');
                  break;
                case 'composition':
                  if (filter.value === 'staff') handleFilterChange('staff', 'staff_only');
                  else handleFilterChange('age', filter.value === 'children' ? 'children' : 'adults');
                  break;
                case 'contact':
                  handleFilterChange('contact', filter.value);
                  break;
                case 'menu':
                  handleFilterChange('menu', filter.value);
                  break;
                case 'dietary':
                  // Filter guests with dietary restrictions - use menu filter with special value
                  handleFilterChange('menu', 'dietary');
                  break;
                case 'plusOne':
                  handleFilterChange('plusOne', filter.value);
                  break;
                case 'funnel':
                  setFunnelFilter(filter.value);
                  break;
                case 'group':
                  handleFilterChange('group', filter.value);
                  break;
              }
            }}
          />

          {/* Filters - New Configurable Filter System */}
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

            {/* Configurable Filters with Settings Cog */}
            {wedding && (
              <GuestFilters
                weddingId={wedding.id}
                values={filterValues}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
              />
            )}
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

          {/* Selection Toolbar - Gestisce sia invitati singoli che nuclei */}
          <SelectionToolbar
            selectedGuestCount={selectedGuestIds.size}
            selectedPartyCount={selectedPartyIds.size}
            onCreateParty={handleCreatePartyFromSelection}
            onDeleteGuests={handleBulkDeleteGuests}
            onDissolveParties={handleBulkDissolveParties}
            onClearSelection={clearSelection}
            onSendRSVP={handleSendRSVPFromSelection}
            hasContactsToSend={hasContactsToSend}
          />
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
        availableGuests={allGuests.filter(g => !g.is_couple_member)}
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
        onOpenChange={(open) => {
          setRsvpCampaignOpen(open);
          if (!open) {
            setPreSelectedGuestIdsForRSVP(new Set());
            // Refresh data when dialog closes
            loadData();
          }
        }}
        selectedParties={selectedPartiesForRSVP}
        weddingId={wedding?.id || ""}
        coupleName={wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : ""}
        preSelectedGuestIds={preSelectedGuestIdsForRSVP}
        onDataChange={loadData}
      />

      <GuestDiffDialog
        open={smartDiffOpen}
        onOpenChange={setSmartDiffOpen}
        weddingId={wedding?.id || ""}
        onSuccess={loadData}
      />

      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        weddingId={wedding?.id || ""}
        existingPhones={allGuests.map(g => g.phone).filter(Boolean) as string[]}
        existingGroups={[]}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Guests;
