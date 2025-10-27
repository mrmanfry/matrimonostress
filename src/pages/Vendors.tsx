import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorDialog } from "@/components/vendors/VendorDialog";
import { Plus, Phone, Mail, User, Trash2, Edit, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  category_id: string | null;
  category_name?: string;
  expenses_total?: number;
}

interface Category {
  id: string;
  name: string;
}

const statusConfig = {
  evaluating: { label: "Valutazione", color: "bg-blue-600" },
  booked: { label: "Prenotato", color: "bg-amber-600" },
  paid: { label: "Pagato", color: "bg-green-600" },
  excluded: { label: "Escluso", color: "bg-gray-600" },
};

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (!weddingData) return;

      await Promise.all([
        loadVendors(weddingData.id),
        loadCategories(weddingData.id),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async (weddingId: string) => {
    const { data, error } = await supabase
      .from("vendors")
      .select(`
        *,
        category:expense_categories(name),
        expense_items!vendor_id(estimated_amount, final_amount)
      `)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading vendors:", error);
      return;
    }

    setVendors(
      data.map((v: any) => {
        const expensesTotal = v.expense_items?.reduce(
          (sum: number, e: any) => sum + (e.final_amount || e.estimated_amount),
          0
        ) || 0;
        
        return {
          ...v,
          category_name: v.category?.name || null,
          expenses_total: expensesTotal,
        };
      })
    );
  };

  const loadCategories = async (weddingId: string) => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("wedding_id", weddingId)
      .order("name");

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    setCategories(data || []);
  };

  const handleSaveVendor = async (vendor: Partial<Vendor>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (!weddingData) return;

      if (selectedVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(vendor)
          .eq("id", selectedVendor.id);

        if (error) throw error;

        toast({
          title: "Fornitore aggiornato",
          description: "Le modifiche sono state salvate",
        });
      } else {
        const insertData = {
          wedding_id: weddingData.id,
          name: vendor.name,
          contact_name: vendor.contact_name || null,
          email: vendor.email || null,
          phone: vendor.phone || null,
          status: vendor.status || 'evaluating',
          notes: vendor.notes || null,
          category_id: vendor.category_id || null,
        };
        
        const { error } = await supabase
          .from("vendors")
          .insert([insertData]);

        if (error) throw error;

        toast({
          title: "Fornitore aggiunto",
          description: "Il fornitore è stato creato con successo",
        });
      }

      await loadVendors(weddingData.id);
      setDialogOpen(false);
      setSelectedVendor(null);
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il fornitore",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;

    try {
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", vendorToDelete);

      if (error) throw error;

      toast({
        title: "Fornitore eliminato",
        description: "Il fornitore è stato rimosso",
      });

      setVendors(vendors.filter((v) => v.id !== vendorToDelete));
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il fornitore",
        variant: "destructive",
      });
    }
  };

  const handleCreateCategory = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (!weddingData) return;

      const { error } = await supabase
        .from("expense_categories")
        .insert([{ wedding_id: weddingData.id, name }]);

      if (error) throw error;

      await loadCategories(weddingData.id);

      toast({
        title: "Categoria creata",
        description: `La categoria "${name}" è stata aggiunta`,
      });
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare la categoria",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCategories(categories.filter((c) => c.id !== id));

      toast({
        title: "Categoria eliminata",
        description: "La categoria è stata rimossa",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la categoria",
        variant: "destructive",
      });
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      searchQuery === "" ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || vendor.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" || vendor.category_id === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const statsByStatus = {
    evaluating: vendors.filter((v) => v.status === "evaluating").length,
    booked: vendors.filter((v) => v.status === "booked").length,
    paid: vendors.filter((v) => v.status === "paid").length,
    excluded: vendors.filter((v) => v.status === "excluded").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fornitori</h1>
          <p className="text-muted-foreground">
            Gestisci i fornitori del tuo matrimonio
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Fornitore
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsByStatus[key as keyof typeof statsByStatus]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cerca</label>
              <Input
                placeholder="Nome fornitore o contatto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Stato</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "Nessun fornitore trovato con questi filtri"
                : "Nessun fornitore ancora. Inizia ad aggiungerne uno!"}
            </p>
            {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Fornitore
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    {vendor.category_name && (
                      <p className="text-sm text-muted-foreground">
                        {vendor.category_name}
                      </p>
                    )}
                  </div>
                  <Badge className={statusConfig[vendor.status as keyof typeof statusConfig].color}>
                    {statusConfig[vendor.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{vendor.contact_name}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${vendor.email}`}
                      className="hover:underline"
                    >
                      {vendor.email}
                    </a>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${vendor.phone}`} className="hover:underline">
                      {vendor.phone}
                    </a>
                  </div>
                )}
                
                {/* Total Expenses for Vendor */}
                {vendor.expenses_total !== undefined && vendor.expenses_total > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Spese totali:</span>
                      <a 
                        href={`/app/budget?vendor=${vendor.id}`}
                        className="text-lg font-bold text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/app/budget?vendor=${vendor.id}`;
                        }}
                      >
                        €{vendor.expenses_total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click per vedere le spese nel budget
                    </p>
                  </div>
                )}
                
                {vendor.notes && (
                  <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
                    {vendor.notes}
                  </p>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVendorToDelete(vendor.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <VendorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedVendor(null);
        }}
        vendor={selectedVendor}
        categories={categories}
        onSave={handleSaveVendor}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo fornitore? Questa azione non
              può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVendor}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vendors;
