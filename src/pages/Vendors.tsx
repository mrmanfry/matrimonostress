import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LockedCard } from "@/components/ui/locked-card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorDialog } from "@/components/vendors/VendorDialog";
import { VendorExpensesDialog } from "@/components/vendors/VendorExpensesDialog";
import { Plus, Phone, Mail, User, Trash2, Edit, Heart, Wallet, FileText, FileUp, Eye, Sparkles, ChevronRight } from "lucide-react";
import { ContractUploadDialog } from "@/components/vendors/ContractUploadDialog";
import { ContractReviewDialog } from "@/components/vendors/ContractReviewDialog";
import ContractViewDialog from "@/components/vendors/ContractViewDialog";
import { DocumentViewerDialog } from "@/components/vendors/DocumentViewerDialog";
import { VendorDocumentsDialog } from "@/components/vendors/VendorDocumentsDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  category_id: string | null;
  wedding_id: string;
  category_name?: string;
  expenses_total?: number;
  ragione_sociale?: string;
  partita_iva_cf?: string;
  indirizzo_sede_legale?: string;
  iban?: string;
  intestatario_conto?: string;
  staff_meals_count?: number | null;
  staff_dietary_notes?: string | null;
  vendor_contracts?: Array<{
    id: string;
    analyzed_at: string;
    ai_analysis: any;
    file_path: string;
  }>;
  expense_items?: Array<{
    total_amount: number;
  }>;
}
interface Category {
  id: string;
  name: string;
}
const statusConfig = {
  evaluating: {
    label: "In valutazione",
    color: "bg-yellow-600"
  },
  booked: {
    label: "Opzionato",
    color: "bg-blue-600"
  },
  confirmed: {
    label: "Confermato",
    color: "bg-green-600"
  },
  rejected: {
    label: "Rifiutato",
    color: "bg-red-600"
  }
};
const Vendors = () => {
  const navigate = useNavigate();
  const { isPlanner, authState } = useAuth();
  const vendorCostsHidden = isPlanner && authState.status === 'authenticated' && authState.activePermissions?.vendor_costs_visible === false;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
  const [contractUploadOpen, setContractUploadOpen] = useState(false);
  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [contractReviewOpen, setContractReviewOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [fileInfoData, setFileInfoData] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorDocuments, setVendorDocuments] = useState<Array<{
    name: string;
    path: string;
  }>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const {
    toast
  } = useToast();
  const [weddingData, setWeddingData] = useState<any>(null);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Recupera il wedding_id dall'utente corrente tramite user_roles
      const {
        data: userRole
      } = await supabase.from("user_roles").select("wedding_id").eq("user_id", user.id).single();
      if (!userRole) {
        toast({
          title: "Errore",
          description: "Non sei associato a nessun matrimonio",
          variant: "destructive"
        });
        return;
      }

      // Recupera i dati del matrimonio
      const {
        data: wedding
      } = await supabase.from("weddings").select("id, wedding_date").eq("id", userRole.wedding_id).single();
      if (!wedding) return;
      setWeddingData(wedding);
      await Promise.all([loadVendors(wedding.id), loadCategories(wedding.id)]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadVendors = async (weddingId: string) => {
    // Import the centralized calculation library
    const {
      calculateExpenseAmount,
      inferExpenseType,
      resolveGuestCounts
    } = await import("@/lib/expenseCalculations");
    const {
      calculateExpectedCounts,
      calculateTotalVendorStaff
    } = await import("@/lib/expectedCalculator");

    // Load global calculation mode and wedding targets
    const {
      data: weddingData
    } = await supabase.from('weddings').select('calculation_mode, target_adults, target_children, target_staff').eq('id', weddingId).single();
    const globalMode = weddingData?.calculation_mode || 'planned';
    const globalTargets = {
      adults: weddingData?.target_adults || 100,
      children: weddingData?.target_children || 0,
      staff: weddingData?.target_staff || 0
    };

    // Load vendors with all expense data
    const {
      data,
      error
    } = await supabase.from("vendors").select(`
        *,
        category:expense_categories(name),
        vendor_contracts(id, analyzed_at, ai_analysis, file_path),
        expense_items(
          id,
          expense_type,
          fixed_amount,
          estimated_amount,
          total_amount,
          planned_adults,
          planned_children,
          planned_staff,
          tax_rate,
          amount_is_tax_inclusive
        )
      `).eq("wedding_id", weddingId).order("created_at", {
      ascending: false
    });
    if (error) {
      console.error("Error loading vendors:", error);
      return;
    }

    // Load confirmed guest counts (for "confirmed" mode)
    const {
      data: parties
    } = await supabase.from("invite_parties").select("id, guests(*)").eq("wedding_id", weddingId).eq("rsvp_status", "Confermato");
    let actualAdults = 0;
    let actualChildren = 0;
    let actualStaff = 0;
    parties?.forEach((party: any) => {
      party.guests?.forEach((guest: any) => {
        if (guest.is_staff) {
          actualStaff++;
        } else if (guest.is_child) {
          actualChildren++;
        } else {
          actualAdults++;
        }
      });
    });

    // Load ALL guests for expected calculation (STD responses, +1 potentials, etc.)
    const { data: allGuests } = await supabase
      .from("guests")
      .select("id, is_child, is_staff, save_the_date_sent_at, std_response, rsvp_status, party_id, phone, allow_plus_one, plus_one_name, is_couple_member")
      .eq("wedding_id", weddingId);

    const nonCoupleGuests = (allGuests || []).filter((g: any) => !g.is_couple_member);
    const vendorStaffTotal = calculateTotalVendorStaff(
      (data || []).map((v: any) => ({ staff_meals_count: v.staff_meals_count }))
    );
    const expectedResult = calculateExpectedCounts(nonCoupleGuests, allGuests || [], vendorStaffTotal);

    // Load expense line items for all vendors
    const allExpenseItemIds = data.flatMap((v: any) => v.expense_items?.map((item: any) => item.id) || []);
    const {
      data: lineItemsData
    } = await supabase.from("expense_line_items").select("*").in("expense_item_id", allExpenseItemIds);
    const lineItemsByExpenseItem = (lineItemsData || []).reduce((acc: any, item: any) => {
      if (!acc[item.expense_item_id]) acc[item.expense_item_id] = [];
      acc[item.expense_item_id].push(item);
      return acc;
    }, {});

    // Calculate totals using centralized logic
    setVendors(data.map((v: any) => ({
      ...v,
      category_name: v.category?.name || null,
      expenses_total: v.expense_items?.reduce((sum: number, item: any) => {
        const lineItems = lineItemsByExpenseItem[item.id] || [];
        const hasLineItems = lineItems.length > 0;

        // Infer expense type for legacy data
        const expenseType = inferExpenseType(item, hasLineItems);
        
        // Resolve guest counts using global targets as fallback
        const resolvedCounts = resolveGuestCounts(item, globalTargets);
        
        const guestCounts = {
          planned: resolvedCounts,
          expected: {
            adults: expectedResult.adults,
            children: expectedResult.children,
            staff: expectedResult.staff + expectedResult.plusOnesConfirmed + expectedResult.plusOnesPotential
          },
          confirmed: {
            adults: actualAdults,
            children: actualChildren,
            staff: actualStaff
          }
        };

        // Use centralized calculation
        const amount = calculateExpenseAmount({
          ...item,
          expense_type: expenseType,
          estimated_amount: item.estimated_amount || null
        }, lineItems, globalMode as 'planned' | 'expected' | 'confirmed', guestCounts);
        return sum + amount;
      }, 0) || 0
    })));
  };
  const loadVendorDocuments = async (vendorId: string) => {
    try {
      if (!weddingData?.id) return;
      const weddingId = weddingData.id;
      const {
        data,
        error
      } = await supabase.storage.from("vendor-contracts").list(`${weddingId}/${vendorId}`);
      if (error) throw error;
      if (data) {
        setVendorDocuments(data.map(file => ({
          name: file.name,
          path: `${weddingId}/${vendorId}/${file.name}`
        })));
      } else {
        setVendorDocuments([]);
      }
    } catch (error) {
      console.error("Error loading vendor documents:", error);
      setVendorDocuments([]);
    }
  };
  const handleDeleteDocument = async (filePath: string) => {
    try {
      const {
        error
      } = await supabase.storage.from("vendor-contracts").remove([filePath]);
      if (error) throw error;
      toast({
        title: "Documento eliminato",
        description: "Il file è stato rimosso con successo"
      });

      // Refresh documents list
      if (selectedVendor) {
        await loadVendorDocuments(selectedVendor.id);
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Errore eliminazione",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const loadCategories = async (weddingId: string) => {
    const {
      data,
      error
    } = await supabase.from("expense_categories").select("id, name").eq("wedding_id", weddingId).order("name");
    if (error) {
      console.error("Error loading categories:", error);
      return;
    }
    setCategories(data || []);
  };
  const handleSaveVendor = async (vendor: Partial<Vendor>) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Errore",
          description: "Utente non autenticato",
          variant: "destructive"
        });
        return;
      }

      // Recupera il wedding_id dall'utente corrente tramite user_roles
      const {
        data: userRole,
        error: roleError
      } = await supabase.from("user_roles").select("wedding_id").eq("user_id", user.id).single();
      if (roleError || !userRole) {
        console.error("Error fetching user role:", roleError);
        toast({
          title: "Errore",
          description: "Non sei associato a nessun matrimonio. Contatta l'organizzatore.",
          variant: "destructive"
        });
        return;
      }
      const {
        data: weddingData,
        error: weddingError
      } = await supabase.from("weddings").select("id").eq("id", userRole.wedding_id).single();
      if (weddingError || !weddingData) {
        console.error("Error fetching wedding:", weddingError);
        toast({
          title: "Errore",
          description: "Matrimonio non trovato",
          variant: "destructive"
        });
        return;
      }
      if (selectedVendor) {
        const {
          error
        } = await supabase.from("vendors").update(vendor).eq("id", selectedVendor.id);
        if (error) throw error;
        toast({
          title: "Fornitore aggiornato",
          description: "Le modifiche sono state salvate"
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
          staff_meals_count: vendor.staff_meals_count || 0,
          staff_dietary_notes: vendor.staff_dietary_notes || null
        };
        console.log("💾 Inserting vendor:", insertData);
        const {
          data: insertedData,
          error
        } = await supabase.from("vendors").insert([insertData]).select();
        if (error) {
          console.error("❌ Insert failed:", error);
          throw error;
        }
        console.log("✅ Vendor inserted successfully:", insertedData);
        toast({
          title: "Fornitore aggiunto",
          description: "Il fornitore è stato creato con successo"
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
        variant: "destructive"
      });
    }
  };
  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      const {
        error
      } = await supabase.from("vendors").delete().eq("id", vendorToDelete);
      if (error) throw error;
      toast({
        title: "Fornitore eliminato",
        description: "Il fornitore è stato rimosso"
      });
      setVendors(vendors.filter(v => v.id !== vendorToDelete));
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il fornitore",
        variant: "destructive"
      });
    }
  };
  const handleCreateCategory = async (name: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Errore",
          description: "Utente non autenticato",
          variant: "destructive"
        });
        return;
      }

      // Recupera il wedding_id dall'utente corrente tramite user_roles
      const {
        data: userRole,
        error: roleError
      } = await supabase.from("user_roles").select("wedding_id").eq("user_id", user.id).single();
      if (roleError || !userRole) {
        console.error("Error fetching user role:", roleError);
        toast({
          title: "Errore",
          description: "Non sei associato a nessun matrimonio. Contatta l'organizzatore.",
          variant: "destructive"
        });
        return;
      }
      const {
        data: weddingData,
        error: weddingError
      } = await supabase.from("weddings").select("id").eq("id", userRole.wedding_id).single();
      if (weddingError || !weddingData) {
        console.error("Error fetching wedding:", weddingError);
        toast({
          title: "Errore",
          description: "Matrimonio non trovato",
          variant: "destructive"
        });
        return;
      }
      const {
        error
      } = await supabase.from("expense_categories").insert([{
        wedding_id: weddingData.id,
        name
      }]);
      if (error) throw error;
      await loadCategories(weddingData.id);
      toast({
        title: "Categoria creata",
        description: `La categoria "${name}" è stata aggiunta`
      });
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare la categoria",
        variant: "destructive"
      });
    }
  };
  const handleDeleteCategory = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast({
        title: "Categoria eliminata",
        description: "La categoria è stata rimossa"
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la categoria",
        variant: "destructive"
      });
    }
  };
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchQuery === "" || vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || vendor.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || vendor.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const statsByStatus = {
    evaluating: vendors.filter(v => v.status === "evaluating").length,
    booked: vendors.filter(v => v.status === "booked").length,
    paid: vendors.filter(v => v.status === "paid").length,
    excluded: vendors.filter(v => v.status === "excluded").length
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
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
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">{config.label}</p>
                <p className="text-3xl font-bold">
                  {vendors.filter(v => v.status === key).length}
                </p>
                <div className={`h-2 w-full rounded-full ${config.color}`} />
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
              <Input placeholder="Nome fornitore o contatto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Stato</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>)}
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
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all" ? "Nessun fornitore trovato con questi filtri" : "Nessun fornitore ancora. Inizia ad aggiungerne uno!"}
            </p>
            {!searchQuery && statusFilter === "all" && categoryFilter === "all" && <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Fornitore
              </Button>}
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map(vendor => {
        const hasContract = vendor.vendor_contracts && vendor.vendor_contracts.length > 0;
        const contract = hasContract ? vendor.vendor_contracts[0] : null;
        return <Card 
                key={vendor.id} 
                className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/app/vendors/${vendor.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg group-hover:text-primary group-hover:underline transition-colors">{vendor.name}</CardTitle>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {vendor.category_name && <p className="text-sm text-muted-foreground">
                          {vendor.category_name}
                        </p>}
                    </div>
                    <Badge className={statusConfig[vendor.status as keyof typeof statusConfig]?.color || "bg-gray-600"}>
                      {statusConfig[vendor.status as keyof typeof statusConfig]?.label || vendor.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vendor.contact_name && <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{vendor.contact_name}</span>
                    </div>}
                  {vendor.email && <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{vendor.email}</span>
                    </div>}
                  {vendor.phone && <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{vendor.phone}</span>
                    </div>}
                  
                  {/* Total Expenses for Vendor */}
                  {vendor.expenses_total !== undefined && <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Totale Spese</span>
                        {vendorCostsHidden ? (
                          <LockedCard variant="inline" />
                        ) : (
                          <span className={`text-lg font-semibold ${vendor.expenses_total === 0 ? 'text-muted-foreground' : ''}`}>
                            €{vendor.expenses_total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>}
                  
                  {vendor.notes && <p className="text-sm text-muted-foreground border-t pt-3 line-clamp-2">
                      {vendor.notes}
                    </p>}

                  <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVendor(vendor);
                        setDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifica
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendorToDelete(vendor.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Elimina
                    </Button>
                  </div>
                </CardContent>
              </Card>;
      })}
        </div>}

      {/* Dialogs */}
      <VendorDialog open={dialogOpen} onOpenChange={open => {
      setDialogOpen(open);
      if (!open) setSelectedVendor(null);
    }} vendor={selectedVendor} categories={categories} onSave={handleSaveVendor} onCreateCategory={handleCreateCategory} onDeleteCategory={handleDeleteCategory} />

      <VendorExpensesDialog open={expensesDialogOpen} onOpenChange={open => {
      setExpensesDialogOpen(open);
      if (!open) setSelectedVendor(null);
    }} vendor={selectedVendor} />

      {weddingData && selectedVendor && <>
          <ContractUploadDialog open={contractUploadOpen} onOpenChange={setContractUploadOpen} vendorId={selectedVendor.id} weddingId={weddingData.id} weddingDate={weddingData.wedding_date} totalContract={selectedVendor.expenses_total || 0} onAnalysisComplete={(analysis, fileInfo) => {
        setAnalysisData(analysis);
        setFileInfoData(fileInfo);
        setContractUploadOpen(false);
        setContractReviewOpen(true);
      }} />

          {analysisData && fileInfoData && <ContractReviewDialog open={contractReviewOpen} onOpenChange={setContractReviewOpen} analysis={analysisData} fileInfo={fileInfoData} vendorId={selectedVendor.id} weddingId={weddingData.id} onSaveComplete={() => {
        setContractReviewOpen(false);
        setAnalysisData(null);
        setFileInfoData(null);
        if (weddingData) {
          loadVendors(weddingData.id);
        }
        toast({
          title: "Contratto salvato",
          description: "Anagrafica e contratto aggiornati con successo."
        });
      }} />}

          <ContractViewDialog open={contractViewOpen} onOpenChange={setContractViewOpen} vendor={selectedVendor} />

          {selectedDocument && <DocumentViewerDialog open={documentViewerOpen} onOpenChange={setDocumentViewerOpen} filePath={selectedDocument.path} fileName={selectedDocument.name} />}

          <VendorDocumentsDialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen} vendorName={selectedVendor?.name || ""} documents={vendorDocuments} analyzedContract={selectedVendor?.vendor_contracts?.[0]} onViewDocument={doc => {
        setSelectedDocument(doc);
        setDocumentViewerOpen(true);
      }} onViewAnalysis={() => {
        setContractViewOpen(true);
      }} onAnalyzeDocument={doc => {
        // For now, just open the contract upload dialog
        // In future, we could pre-select the document
        setContractUploadOpen(true);
        setDocumentsDialogOpen(false);
      }} onDeleteDocument={handleDeleteDocument} />
        </>}

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
    </div>;
};
export default Vendors;