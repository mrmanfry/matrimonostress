import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  Trash,
  Smartphone,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuestDialog } from "@/components/guests/GuestDialog";
import { GroupsDialog } from "@/components/guests/GroupsDialog";
import { SmartImportDialog } from "@/components/guests/SmartImportDialog";
import { ContactSyncDialog } from "@/components/guests/ContactSyncDialog";
import { GuestStatsChart } from "@/components/guests/GuestStatsChart";
import { GuestCard } from "@/components/guests/GuestCard";
import { ImportDropdown } from "@/components/guests/ImportDropdown";
import { MobileFilters } from "@/components/guests/MobileFilters";
import { GuestEmptyState } from "@/components/guests/GuestEmptyState";
import { Card } from "@/components/ui/card";
import {
  generateCSVTemplate,
  parseCSV,
  validateCSVRows,
  exportGuestsToCSV,
  downloadCSV,
} from "@/utils/csvHelpers";
import { generateCateringReport } from "@/utils/pdfHelpers";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  adults_count: number;
  children_count: number;
  menu_choice: string;
  dietary_restrictions: string;
  notes: string;
  group_id: string | null;
  group_name?: string;
  phone?: string;
}

interface Group {
  id: string;
  name: string;
  guest_count?: number;
}

interface Wedding {
  id: string;
}

const Guests = () => {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const [smartImportDialogOpen, setSmartImportDialogOpen] = useState(false);
  const [contactSyncDialogOpen, setContactSyncDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [guests, searchQuery, filterStatus, filterGroup]);

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

      await Promise.all([loadGuests(weddingData.id), loadGroups(weddingData.id)]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuests = async (weddingId: string) => {
    const { data: guestsData } = await supabase
      .from("guests")
      .select(`
        *,
        guest_groups(name)
      `)
      .eq("wedding_id", weddingId)
      .order("last_name", { ascending: true });

    if (guestsData) {
      const formattedGuests = guestsData.map((g: any) => ({
        ...g,
        group_name: g.guest_groups?.name || null,
      }));
      setGuests(formattedGuests);
    }
  };

  const loadGroups = async (weddingId: string) => {
    const { data: groupsData } = await supabase
      .from("guest_groups")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("name", { ascending: true });

    if (groupsData) {
      // Count guests per group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count } = await supabase
            .from("guests")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
          return { ...group, guest_count: count || 0 };
        })
      );
      setGroups(groupsWithCounts);
    }
  };

  const applyFilters = () => {
    let filtered = [...guests];

    if (filterStatus !== "all") {
      filtered = filtered.filter((g) => g.rsvp_status === filterStatus);
    }

    if (filterGroup !== "all") {
      filtered = filtered.filter((g) => g.group_id === filterGroup);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.first_name.toLowerCase().includes(query) ||
          g.last_name.toLowerCase().includes(query) ||
          g.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredGuests(filtered);
  };

  const handleSaveGuest = async (guestData: Omit<Guest, "id">) => {
    if (!wedding) return;

    try {
      if (selectedGuest) {
        const { error } = await supabase
          .from("guests")
          .update(guestData)
          .eq("id", selectedGuest.id);

        if (error) throw error;

        toast({
          title: "Aggiornato!",
          description: "Invitato modificato con successo",
        });
      } else {
        const { error } = await supabase
          .from("guests")
          .insert({ ...guestData, wedding_id: wedding.id });

        if (error) throw error;

        toast({
          title: "Creato!",
          description: "Nuovo invitato aggiunto",
        });
      }

      await loadGuests(wedding.id);
      setSelectedGuest(null);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm("Eliminare questo invitato?")) return;

    const { error } = await supabase.from("guests").delete().eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Eliminato",
      description: "Invitato rimosso dalla lista",
    });

    if (wedding) await loadGuests(wedding.id);
  };

  const handleDeleteSelectedGuests = async () => {
    const count = selectedGuestIds.size;
    if (!confirm(`Eliminare ${count} invitati selezionati?`)) return;

    const { error } = await supabase
      .from("guests")
      .delete()
      .in("id", Array.from(selectedGuestIds));

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Eliminati",
      description: `${count} invitati rimossi dalla lista`,
    });

    setSelectedGuestIds(new Set());
    if (wedding) await loadGuests(wedding.id);
  };

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

  const toggleSelectAll = () => {
    if (selectedGuestIds.size === filteredGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const handleCreateGroup = async (name: string) => {
    if (!wedding) return;

    const { error } = await supabase
      .from("guest_groups")
      .insert({ wedding_id: wedding.id, name });

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Creato!",
      description: `Gruppo "${name}" aggiunto`,
    });

    await loadGroups(wedding.id);
  };

  const handleDeleteGroup = async (id: string) => {
    const { error } = await supabase.from("guest_groups").delete().eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Eliminato",
      description: "Gruppo rimosso",
    });

    if (wedding) {
      await Promise.all([loadGroups(wedding.id), loadGuests(wedding.id)]);
    }
  };

  const handleExportCSV = () => {
    const csv = exportGuestsToCSV(guests);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `invitati_${date}.csv`);

    toast({
      title: "Esportato!",
      description: `${guests.length} invitati esportati in CSV`,
    });
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "template_invitati.csv");

    toast({
      title: "Template scaricato",
      description: "Usa questo file come esempio per l'import",
    });
  };

  const handleExportCateringPDF = () => {
    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
    
    if (confirmedGuests.length === 0) {
      toast({
        title: "Attenzione",
        description: "Non ci sono invitati confermati da esportare",
        variant: "destructive",
      });
      return;
    }

    generateCateringReport(confirmedGuests);
    toast({
      title: "Report generato!",
      description: "Report catering scaricato in formato PDF",
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wedding) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const rows = parseCSV(content);
        const { valid, errors } = validateCSVRows(rows);

        if (errors.length > 0) {
          toast({
            title: "Errori di validazione",
            description: errors.join("\n"),
            variant: "destructive",
          });
          return;
        }

        // Map group names to IDs
        const rowsWithGroupIds = await Promise.all(
          valid.map(async (row) => {
            let groupId = null;

            if (row.group_name) {
              const existingGroup = groups.find(
                (g) => g.name.toLowerCase() === row.group_name!.toLowerCase()
              );

              if (existingGroup) {
                groupId = existingGroup.id;
              } else {
                const { data: newGroup } = await supabase
                  .from("guest_groups")
                  .insert({ wedding_id: wedding.id, name: row.group_name })
                  .select()
                  .single();

                if (newGroup) groupId = newGroup.id;
              }
            }

            return {
              wedding_id: wedding.id,
              first_name: row.first_name,
              last_name: row.last_name,
              rsvp_status: row.rsvp_status || "pending",
              adults_count: row.adults_count || 1,
              children_count: row.children_count || 0,
              menu_choice: row.menu_choice || "",
              dietary_restrictions: row.dietary_restrictions || "",
              notes: row.notes || "",
              group_id: groupId,
            };
          })
        );

        const { error } = await supabase.from("guests").insert(rowsWithGroupIds);

        if (error) throw error;

        toast({
          title: "Importati!",
          description: `${valid.length} invitati aggiunti con successo`,
        });

        await Promise.all([loadGuests(wedding.id), loadGroups(wedding.id)]);
      } catch (error: any) {
        toast({
          title: "Errore import",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const getRSVPBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-600">Confermato</Badge>;
      case "declined":
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="secondary">In attesa</Badge>;
    }
  };

  const stats = {
    total: guests.reduce((sum, g) => sum + g.adults_count + g.children_count, 0),
    confirmed: guests
      .filter((g) => g.rsvp_status === "confirmed")
      .reduce((sum, g) => sum + g.adults_count + g.children_count, 0),
    pending: guests
      .filter((g) => g.rsvp_status === "pending")
      .reduce((sum, g) => sum + g.adults_count + g.children_count, 0),
    declined: guests
      .filter((g) => g.rsvp_status === "declined")
      .reduce((sum, g) => sum + g.adults_count + g.children_count, 0),
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  const hasNoGuests = guests.length === 0;
  const hasNoFilteredGuests = filteredGuests.length === 0;
  const isFiltering = searchQuery || filterStatus !== "all" || filterGroup !== "all";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Gestione Invitati</h1>
        </div>
        <p className="text-muted-foreground">
          Traccia RSVP, gestisci gruppi e organizza la lista completa
        </p>
      </div>

      {/* Stats Chart */}
      <GuestStatsChart stats={stats} />

      {/* Contact Sync Banner - Only show if we have guests without phone */}
      {!hasNoGuests && guests.filter(g => !g.phone).length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {guests.filter(g => !g.phone).length} invitati senza numero di telefono
              </h3>
              <p className="text-sm text-muted-foreground">
                Sincronizza i contatti dal tuo smartphone per inviare gli inviti via WhatsApp
              </p>
            </div>
            <Button onClick={() => setContactSyncDialogOpen(true)} className="shrink-0">
              <Smartphone className="w-4 h-4 mr-2" />
              Sincronizza Ora
            </Button>
          </div>
        </Card>
      )}

      {/* Actions Bar - Desktop */}
      {!isMobile && !hasNoGuests && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {selectedGuestIds.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelectedGuests}
              >
                <Trash className="w-4 h-4 mr-2" />
                Elimina Selezionati ({selectedGuestIds.size})
              </Button>
            )}
            
            <Button onClick={() => { setSelectedGuest(null); setGuestDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Invitato
            </Button>

            <ImportDropdown
              onSmartImport={() => setSmartImportDialogOpen(true)}
              onDownloadTemplate={handleDownloadTemplate}
              onImportCSV={handleImportCSV}
              onExportCSV={handleExportCSV}
              onExportCateringPDF={handleExportCateringPDF}
              hasGuests={guests.length > 0}
              hasConfirmedGuests={guests.filter(g => g.rsvp_status === 'confirmed').length > 0}
            />

            <div className="flex-1" />

            <Button variant="outline" onClick={() => setContactSyncDialogOpen(true)}>
              <Smartphone className="w-4 h-4 mr-2" />
              Sincronizza Contatti
            </Button>

            <Button variant="outline" onClick={() => setGroupsDialogOpen(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Gestisci Gruppi
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {hasNoGuests ? (
        <GuestEmptyState
          onAddGuest={() => { setSelectedGuest(null); setGuestDialogOpen(true); }}
          onSmartImport={() => setSmartImportDialogOpen(true)}
        />
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isMobile ? (
                <MobileFilters
                  filterStatus={filterStatus}
                  filterGroup={filterGroup}
                  groups={groups}
                  onStatusChange={setFilterStatus}
                  onGroupChange={setFilterGroup}
                />
              ) : (
                <>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="confirmed">Confermati</SelectItem>
                      <SelectItem value="declined">Rifiutati</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterGroup} onValueChange={setFilterGroup}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Gruppo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i gruppi</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </Card>

          {/* Bulk Actions Bar (Mobile & Desktop when items selected) */}
          {selectedGuestIds.size > 0 && (
            <Card className="p-4 bg-destructive/5 border-destructive/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedGuestIds.size} {selectedGuestIds.size === 1 ? 'invitato selezionato' : 'invitati selezionati'}
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelectedGuests}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </Card>
          )}

          {/* Guests List */}
          {hasNoFilteredGuests ? (
            <Card className="p-12">
              <div className="text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nessun invitato trovato</p>
                <p className="text-muted-foreground mb-4">
                  Prova a modificare i filtri di ricerca
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                    setFilterGroup("all");
                  }}
                >
                  Reset Filtri
                </Button>
              </div>
            </Card>
          ) : isMobile ? (
            // Mobile: Card Layout
            <div className="space-y-3">
              {filteredGuests.map((guest) => (
                <GuestCard
                  key={guest.id}
                  guest={guest}
                  isSelected={selectedGuestIds.has(guest.id)}
                  onToggleSelect={() => toggleGuestSelection(guest.id)}
                  onEdit={() => {
                    setSelectedGuest(guest);
                    setGuestDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteGuest(guest.id)}
                />
              ))}
            </div>
          ) : (
            // Desktop: Table Layout
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-4 w-12">
                        <Checkbox
                          checked={filteredGuests.length > 0 && selectedGuestIds.size === filteredGuests.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Stato</th>
                      <th className="text-left p-4 font-semibold">Gruppo</th>
                      <th className="text-center p-4 font-semibold">Adulti</th>
                      <th className="text-center p-4 font-semibold">Bambini</th>
                      <th className="text-left p-4 font-semibold">Menù</th>
                      <th className="text-right p-4 font-semibold">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.map((guest) => (
                      <tr key={guest.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedGuestIds.has(guest.id)}
                            onCheckedChange={() => toggleGuestSelection(guest.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {guest.first_name} {guest.last_name}
                            </p>
                            {guest.dietary_restrictions && (
                              <p className="text-sm text-muted-foreground">
                                🍽️ {guest.dietary_restrictions}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">{getRSVPBadge(guest.rsvp_status)}</td>
                        <td className="p-4">
                          {guest.group_name ? (
                            <Badge variant="outline">{guest.group_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">{guest.adults_count}</td>
                        <td className="p-4 text-center">{guest.children_count}</td>
                        <td className="p-4">
                          {guest.menu_choice || <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedGuest(guest);
                                setGuestDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGuest(guest.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* FAB - Mobile Only */}
      {isMobile && !hasNoGuests && (
        <Button
          size="lg"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          onClick={() => { setSelectedGuest(null); setGuestDialogOpen(true); }}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Dialogs */}
      <GuestDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        guest={selectedGuest}
        groups={groups}
        onSave={handleSaveGuest}
      />

      <GroupsDialog
        open={groupsDialogOpen}
        onOpenChange={setGroupsDialogOpen}
        groups={groups}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      <SmartImportDialog
        open={smartImportDialogOpen}
        onOpenChange={setSmartImportDialogOpen}
        weddingId={wedding?.id || ""}
        onSuccess={loadData}
        groups={groups}
      />

      <ContactSyncDialog
        open={contactSyncDialogOpen}
        onOpenChange={setContactSyncDialogOpen}
        weddingId={wedding?.id || ""}
        onSyncComplete={loadData}
      />
    </div>
  );
};

export default Guests;
