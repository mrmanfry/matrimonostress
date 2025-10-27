import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  Edit,
  Trash2,
  FolderOpen,
} from "lucide-react";
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
import {
  generateCSVTemplate,
  parseCSV,
  validateCSVRows,
  exportGuestsToCSV,
  downloadCSV,
} from "@/utils/csvHelpers";
import { generateCateringReport } from "@/utils/pdfHelpers";
import { FileText } from "lucide-react";

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
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const { toast } = useToast();

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

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold">Gestione Invitati</h1>
        </div>
        <p className="text-muted-foreground">
          Traccia RSVP, gestisci gruppi e organizza la lista completa
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-accent">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Totali</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-sm text-muted-foreground">Confermati</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">In Attesa</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
          <div className="text-sm text-muted-foreground">Rifiutati</div>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <Button onClick={() => { setSelectedGuest(null); setGuestDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Invitato
          </Button>

          <Button variant="outline" onClick={() => setGroupsDialogOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Gestisci Gruppi
          </Button>

          <div className="flex-1" />

          <Button variant="outline" onClick={() => setSmartImportDialogOpen(true)} className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <Upload className="w-4 h-4 mr-2" />
            ✨ Importa da Testo
          </Button>

          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template CSV
          </Button>

          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Importa CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
          </label>

          <Button variant="outline" onClick={handleExportCSV} disabled={guests.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Esporta CSV
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExportCateringPDF} 
            disabled={guests.filter(g => g.rsvp_status === 'confirmed').length === 0}
            className="border-accent text-accent hover:bg-accent/10"
          >
            <FileText className="w-4 h-4 mr-2" />
            Report Catering
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
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
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
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
        </div>
      </Card>

      {/* Guests Table */}
      <Card className="overflow-hidden">
        {filteredGuests.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== "all" || filterGroup !== "all"
                ? "Nessun invitato trovato con questi filtri"
                : "Nessun invitato presente. Inizia aggiungendo il primo!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
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
        )}
      </Card>

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
    </div>
  );
};

export default Guests;
