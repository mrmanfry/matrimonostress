import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Building2, CreditCard, FileText, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VendorExpensesWidget } from "@/components/vendors/widgets/VendorExpensesWidget";
import { VendorDocumentsWidget } from "@/components/vendors/widgets/VendorDocumentsWidget";
import { VendorChecklistWidget } from "@/components/vendors/widgets/VendorChecklistWidget";
import { VendorDialog } from "@/components/vendors/VendorDialog";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  evaluating: { label: "In Valutazione", bg: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  contacted: { label: "Contattato", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  quotation_received: { label: "Preventivo Ricevuto", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  confirmed: { label: "Confermato", bg: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Scartato", bg: "bg-red-100 text-red-800 border-red-200" },
};

export default function VendorDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'expenses';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch vendor details
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor-details", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*, expense_categories(name)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for the dialog
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories-for-vendor", vendor?.wedding_id],
    queryFn: async () => {
      if (!vendor?.wedding_id) return [];
      const { data, error } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("wedding_id", vendor.wedding_id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.wedding_id,
  });

  const handleSaveVendor = async (vendorData: any) => {
    if (!vendor?.id) return;
    
    const { error } = await supabase
      .from("vendors")
      .update(vendorData)
      .eq("id", vendor.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Salvato",
      description: "Profilo fornitore aggiornato",
    });

    queryClient.invalidateQueries({ queryKey: ["vendor-details", id] });
    setEditDialogOpen(false);
  };

  const handleCreateCategory = async (name: string) => {
    if (!vendor?.wedding_id) return;
    const { error } = await supabase
      .from("expense_categories")
      .insert({ name, wedding_id: vendor.wedding_id });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["expense-categories-for-vendor"] });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", categoryId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["expense-categories-for-vendor"] });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-muted-foreground">Fornitore non trovato</h1>
        <Button onClick={() => navigate("/app/vendors")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna ai Fornitori
        </Button>
      </div>
    );
  }

  const status = vendor.status as keyof typeof statusConfig || "evaluating";
  const statusInfo = statusConfig[status];

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        className="gap-2 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/app/vendors")}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna ai Fornitori
      </Button>

      {/* Hero Card */}
      <div className="bg-card rounded-xl shadow-sm border p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-24 h-24 border-4 border-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {vendor.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{vendor.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {vendor.expense_categories?.name && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {vendor.expense_categories.name}
                    </Badge>
                  )}
                  <Badge className={`border ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifica Profilo
              </Button>
            </div>

            {/* Contact Information */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
              {vendor.contact_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>{vendor.contact_name}</span>
                </div>
              )}
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {vendor.email}
                </a>
              )}
            </div>

            {/* Financial Details */}
            {(vendor.ragione_sociale || vendor.partita_iva_cf || vendor.iban) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {vendor.ragione_sociale && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Ragione Sociale</p>
                      <p className="font-medium">{vendor.ragione_sociale}</p>
                    </div>
                  )}
                  {vendor.partita_iva_cf && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">P.IVA / C.F.</p>
                      <p className="font-medium font-mono">{vendor.partita_iva_cf}</p>
                    </div>
                  )}
                  {vendor.indirizzo_sede_legale && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Sede Legale</p>
                      <p className="font-medium">{vendor.indirizzo_sede_legale}</p>
                    </div>
                  )}
                  {vendor.iban && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">IBAN</p>
                      <p className="font-medium font-mono">{vendor.iban}</p>
                    </div>
                  )}
                  {vendor.intestatario_conto && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium mb-1">Intestatario Conto</p>
                      <p className="font-medium">{vendor.intestatario_conto}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            {vendor.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-2">Note</p>
                  <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 space-x-8">
          <TabsTrigger
            value="expenses"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Spese & Pagamenti
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <FileText className="w-4 h-4 mr-2" />
            Documenti
          </TabsTrigger>
          <TabsTrigger
            value="checklist"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-3 px-0"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="expenses" className="mt-0 focus-visible:ring-0">
            <VendorExpensesWidget vendorId={vendor.id} categoryId={vendor.category_id} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0 focus-visible:ring-0">
            <VendorDocumentsWidget vendorId={vendor.id} vendorName={vendor.name} />
          </TabsContent>

          <TabsContent value="checklist" className="mt-0 focus-visible:ring-0">
            <VendorChecklistWidget vendorId={vendor.id} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Vendor Dialog */}
      <VendorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        vendor={vendor ? {
          id: vendor.id,
          name: vendor.name,
          contact_name: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          status: vendor.status || "evaluating",
          notes: vendor.notes,
          category_id: vendor.category_id,
          staff_meals_count: vendor.staff_meals_count,
          staff_vegan_count: vendor.staff_vegan_count,
          staff_vegetarian_count: vendor.staff_vegetarian_count,
          staff_gluten_free_count: vendor.staff_gluten_free_count,
          staff_lactose_free_count: vendor.staff_lactose_free_count,
          staff_dietary_notes: vendor.staff_dietary_notes,
        } : null}
        categories={categories}
        onSave={handleSaveVendor}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}
